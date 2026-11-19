ALTER TABLE public.guest_payment_orders
  ADD COLUMN IF NOT EXISTS provider_mode text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS app_origin text;
ALTER TABLE public.live_payment_orders
  ADD COLUMN IF NOT EXISTS provider_mode text NOT NULL DEFAULT 'live';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.guest_payment_orders'::regclass AND conname='guest_payment_orders_provider_mode_check') THEN
    ALTER TABLE public.guest_payment_orders ADD CONSTRAINT guest_payment_orders_provider_mode_check CHECK (provider_mode IN ('test','live'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.live_payment_orders'::regclass AND conname='live_payment_orders_provider_mode_check') THEN
    ALTER TABLE public.live_payment_orders ADD CONSTRAINT live_payment_orders_provider_mode_check CHECK (provider_mode IN ('test','live'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_guest_payment_order_v2(
  p_provider text,
  p_reference text,
  p_screening_id uuid,
  p_tenant_id uuid,
  p_email text,
  p_amount_minor bigint,
  p_amount_major numeric,
  p_currency text,
  p_location text,
  p_ticket_code text,
  p_watch_code text,
  p_app_origin text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $function$
DECLARE
  v_ticket uuid;
  v_lifecycle text;
  v_origin text;
BEGIN
  IF current_setting('request.jwt.claim.role',true) <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF p_provider !~ '^[a-z][a-z0-9_-]{1,63}$'
     OR p_reference !~ '^DTV_[A-Za-z0-9]+$'
     OR p_amount_minor <= 0 OR p_amount_major <= 0
     OR p_currency !~ '^[A-Z]{3}$'
     OR p_location NOT IN ('nigeria','international')
     OR p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$'
     OR p_ticket_code !~ '^[A-F0-9]{8,64}$'
     OR p_watch_code !~ '^[a-f0-9]{40}$' THEN
    RAISE EXCEPTION 'invalid_order' USING ERRCODE='22023';
  END IF;
  v_origin := p_app_origin;
  IF v_origin !~ '^https://[^/]+$' THEN
    RAISE EXCEPTION 'invalid_app_origin' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.service_provider_bindings b
    WHERE b.capability='payments' AND b.provider_key=p_provider
      AND b.enabled=true AND b.is_live=true AND b.removed_at IS NULL
      AND coalesce(b.settings->'supported_currencies','[]'::jsonb) ? p_currency
  ) THEN
    RAISE EXCEPTION 'payment_provider_unavailable_for_currency' USING ERRCODE='22023';
  END IF;
  SELECT lifecycle INTO v_lifecycle
  FROM public.screenings
  WHERE id=p_screening_id AND tenant_id=p_tenant_id AND status='published';
  IF NOT FOUND THEN RAISE EXCEPTION 'screening_unavailable' USING ERRCODE='22023'; END IF;

  INSERT INTO public.screening_tickets(
    tenant_id,screening_id,user_id,email,ticket_code,location,price,currency,addons,
    payment_status,payment_method,payment_reference,watch_code,ticket_kind
  ) VALUES (
    p_tenant_id,p_screening_id,NULL,lower(trim(p_email)),p_ticket_code,p_location,p_amount_major,p_currency,'[]'::jsonb,
    'pending',p_provider,p_reference,p_watch_code,CASE WHEN v_lifecycle='replay' THEN 'replay' ELSE 'live' END
  ) RETURNING id INTO v_ticket;

  INSERT INTO public.guest_payment_orders(
    ticket_id,provider,provider_reference,email,amount_minor,currency,provider_mode,app_origin
  ) VALUES (
    v_ticket,p_provider,p_reference,lower(trim(p_email)),p_amount_minor,p_currency,'live',v_origin
  );
  RETURN v_ticket;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_guest_payment_order_v2(text,text,uuid,uuid,text,bigint,numeric,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_guest_payment_order_v2(text,text,uuid,uuid,text,bigint,numeric,text,text,text,text,text) TO service_role;