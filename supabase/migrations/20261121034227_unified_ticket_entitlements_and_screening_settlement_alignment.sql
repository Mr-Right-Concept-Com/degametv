CREATE OR REPLACE VIEW public.user_ticket_entitlements
WITH (security_invoker = true)
AS
SELECT
  st.id AS entitlement_id,
  'screening'::text AS source_type,
  COALESCE(st.user_id, CASE
    WHEN lower(st.email) = lower(COALESCE(auth.jwt() ->> 'email', '')) THEN auth.uid()
    ELSE NULL
  END) AS user_id,
  st.screening_id,
  NULL::uuid AS stream_id,
  st.ticket_kind AS ticket_type,
  st.ticket_code,
  st.email,
  st.currency,
  st.price,
  st.payment_status AS payment_status,
  st.payment_reference,
  st.created_at AS purchased_at,
  st.expires_at AS valid_until,
  st.refunded_at AS revoked_at,
  CASE
    WHEN st.refunded_at IS NOT NULL OR st.payment_status = 'refunded' THEN 'refunded'
    WHEN st.payment_status <> 'completed' THEN 'pending'
    WHEN st.expires_at <= now() THEN 'expired'
    ELSE 'active'
  END AS entitlement_status,
  (st.payment_status = 'completed' AND st.refunded_at IS NULL AND st.expires_at > now()) AS is_active
FROM public.screening_tickets st
WHERE st.user_id = auth.uid()
   OR lower(st.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
UNION ALL
SELECT
  t.id AS entitlement_id,
  'live'::text AS source_type,
  t.user_id,
  (t.metadata ->> 'screening_id')::uuid AS screening_id,
  t.stream_id,
  t.ticket_type::text AS ticket_type,
  t.ticket_code,
  t.guest_email AS email,
  t.currency,
  t.price,
  CASE WHEN lpo.status = 'refunded' THEN 'refunded'
       WHEN t.revoked_at IS NOT NULL THEN 'revoked' ELSE 'paid' END AS payment_status,
  t.metadata ->> 'payment_reference' AS payment_reference,
  t.created_at AS purchased_at,
  t.valid_until,
  t.revoked_at,
  CASE
    WHEN lpo.status = 'refunded' THEN 'refunded'
    WHEN t.revoked_at IS NOT NULL THEN 'revoked'
    WHEN t.valid_from > now() THEN 'pending'
    WHEN t.valid_until <= now() THEN 'expired'
    ELSE 'active'
  END AS entitlement_status,
  (t.revoked_at IS NULL AND COALESCE(lpo.status, 'paid') <> 'refunded'
   AND t.valid_from <= now() AND t.valid_until > now()) AS is_active
FROM public.tickets t
LEFT JOIN public.live_payment_orders lpo
  ON lpo.provider_reference = t.metadata ->> 'payment_reference'
WHERE t.user_id = auth.uid();

REVOKE ALL ON public.user_ticket_entitlements FROM PUBLIC, anon;
GRANT SELECT ON public.user_ticket_entitlements TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_guest_payment_order(
  p_reference text, p_transaction_id text, p_amount_minor bigint, p_currency text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
  v_order public.guest_payment_orders%rowtype;
  v_ticket public.screening_tickets%rowtype;
  v_creator uuid;
  v_fee numeric := 0;
  v_scale bigint;
  v_fee_minor bigint;
  v_hold_id uuid;
  v_release_at timestamptz;
BEGIN
  IF v_role <> 'service_role' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_order FROM public.guest_payment_orders
  WHERE provider_reference = p_reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.amount_minor <> p_amount_minor OR v_order.currency <> p_currency THEN
    RAISE EXCEPTION 'payment_mismatch';
  END IF;
  IF v_order.status = 'paid' THEN
    RETURN jsonb_build_object('already_paid', true, 'ticket_id', v_order.ticket_id);
  END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'order_not_pending'; END IF;

  UPDATE public.guest_payment_orders
  SET status = 'paid', provider_transaction_id = p_transaction_id, paid_at = now(), updated_at = now()
  WHERE id = v_order.id;
  UPDATE public.screening_tickets
  SET payment_status = 'completed', payment_reference = p_reference, payment_method = v_order.provider
  WHERE id = v_order.ticket_id AND payment_status = 'pending';

  SELECT * INTO v_ticket FROM public.screening_tickets WHERE id = v_order.ticket_id FOR UPDATE;
  IF v_ticket.id IS NULL OR v_ticket.payment_status <> 'completed' OR v_ticket.refunded_at IS NOT NULL THEN
    RAISE EXCEPTION 'ticket_fulfillment_failed';
  END IF;
  SELECT c.creator_id INTO v_creator
  FROM public.screenings s JOIN public.content c ON c.id = s.content_id
  WHERE s.id = v_ticket.screening_id;

  v_fee := least(v_ticket.price, greatest(0, coalesce(v_order.platform_fee_major, 0)));
  v_scale := CASE
    WHEN v_order.currency IN ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') THEN 1
    WHEN v_order.currency IN ('BHD','IQD','JOD','KWD','LYD','OMR','TND') THEN 1000
    ELSE 100
  END;
  v_fee_minor := round(v_fee * v_scale)::bigint;

  IF v_creator IS NOT NULL THEN
    INSERT INTO public.event_settlement_holds(
      tenant_id, creator_id, screening_id, source_type, source_id, currency,
      gross_amount_minor, net_amount_minor, hold_status, hold_hours
    )
    SELECT v_ticket.tenant_id, v_creator, v_ticket.screening_id, 'ticket', v_ticket.id,
      v_order.currency, v_order.amount_minor, greatest(0, v_order.amount_minor - v_fee_minor),
      'held', coalesce(s.settlement_hold_hours, 48)
    FROM public.screenings s WHERE s.id = v_ticket.screening_id
    ON CONFLICT (source_type, source_id) DO NOTHING
    RETURNING id, release_at INTO v_hold_id, v_release_at;

    IF v_hold_id IS NULL THEN
      SELECT id, release_at INTO v_hold_id, v_release_at
      FROM public.event_settlement_holds WHERE source_type = 'ticket' AND source_id = v_ticket.id;
    END IF;

    INSERT INTO public.wallet_ledger(
      user_id, ticket_id, screening_id, gross, fee, net, currency, kind, settles_at
    )
    VALUES(v_creator, v_ticket.id, v_ticket.screening_id, v_ticket.price, v_fee,
      v_ticket.price - v_fee, v_order.currency, 'sale', coalesce(v_release_at, 'infinity'::timestamptz))
    ON CONFLICT(ticket_id, kind)
      WHERE ticket_id IS NOT NULL AND kind IN ('sale', 'refund')
    DO NOTHING;
  END IF;
  RETURN jsonb_build_object('already_paid', false, 'ticket_id', v_order.ticket_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_guest_payment_order(text,text,bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_guest_payment_order(text,text,bigint,text) TO service_role;
