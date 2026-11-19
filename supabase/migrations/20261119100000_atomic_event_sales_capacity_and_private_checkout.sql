-- Atomic event checkout reservations: server-authoritative sales windows,
-- private invitation eligibility, early-bird inventory and event capacity.
ALTER TABLE public.screenings
  ADD COLUMN IF NOT EXISTS ticket_capacity integer;
ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS ticket_capacity integer;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.screenings'::regclass AND conname='screenings_ticket_capacity_positive') THEN
    ALTER TABLE public.screenings ADD CONSTRAINT screenings_ticket_capacity_positive CHECK (ticket_capacity IS NULL OR ticket_capacity > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.live_streams'::regclass AND conname='live_streams_ticket_capacity_positive') THEN
    ALTER TABLE public.live_streams ADD CONSTRAINT live_streams_ticket_capacity_positive CHECK (ticket_capacity IS NULL OR ticket_capacity > 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.event_ticket_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  screening_id uuid NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
  live_stream_id uuid REFERENCES public.live_streams(id) ON DELETE SET NULL,
  invite_id uuid REFERENCES public.event_access_invites(id) ON DELETE SET NULL,
  provider_reference text NOT NULL UNIQUE,
  user_id uuid,
  email text NOT NULL,
  ticket_type text NOT NULL CHECK (ticket_type IN ('live','replay','combo')),
  base_amount numeric(18,6) NOT NULL CHECK (base_amount > 0),
  base_currency text NOT NULL CHECK (base_currency ~ '^[A-Z]{3}$'),
  is_early_bird boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '20 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS event_ticket_reservations_capacity_idx
  ON public.event_ticket_reservations(screening_id,status,expires_at);
CREATE INDEX IF NOT EXISTS event_ticket_reservations_early_bird_idx
  ON public.event_ticket_reservations(screening_id,is_early_bird,status,expires_at);

ALTER TABLE public.event_ticket_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_ticket_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.event_ticket_reservations TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_event_ticket_capacity(
  p_screening_id uuid,
  p_provider_reference text,
  p_ticket_type text,
  p_email text,
  p_user_id uuid DEFAULT NULL,
  p_country_code text DEFAULT NULL,
  p_invite_token_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_screening public.screenings%ROWTYPE;
  v_stream_id uuid;
  v_invite public.event_access_invites%ROWTYPE;
  v_paid_or_reserved integer;
  v_early_bird_count integer;
  v_is_early boolean := false;
  v_amount numeric(18,6);
  v_currency text;
  v_live numeric(18,6);
  v_replay numeric(18,6);
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501';
  END IF;
  IF p_ticket_type NOT IN ('live','replay','combo') OR p_email IS NULL OR length(trim(p_email))=0 OR p_provider_reference IS NULL THEN
    RAISE EXCEPTION 'invalid_event_checkout';
  END IF;

  SELECT * INTO v_screening
  FROM public.screenings
  WHERE id=p_screening_id AND status='published'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'published_event_not_found'; END IF;
  IF lower(coalesce(v_screening.lifecycle,'')) IN ('ended','archived','cancelled','canceled') THEN
    RAISE EXCEPTION 'event_sales_closed';
  END IF;
  IF p_ticket_type IN ('live','combo') AND v_screening.live_ended_at IS NOT NULL AND v_screening.live_ended_at<=now() THEN
    RAISE EXCEPTION 'event_sales_closed';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('degame-event:' || p_screening_id::text,0));

  IF v_screening.sales_open_at IS NOT NULL AND v_screening.sales_open_at > now() THEN
    RAISE EXCEPTION 'event_sales_not_open';
  END IF;
  IF v_screening.sales_close_at IS NOT NULL AND v_screening.sales_close_at <= now() THEN
    RAISE EXCEPTION 'event_sales_closed';
  END IF;
  IF NOT coalesce(v_screening.presale_enabled,true)
     AND coalesce(v_screening.screening_date,v_screening.release_date,now()) > now() THEN
    RAISE EXCEPTION 'event_presales_disabled';
  END IF;

  SELECT id INTO v_stream_id
  FROM public.live_streams
  WHERE tenant_id=v_screening.tenant_id
    AND metadata @> jsonb_build_object('screening_id',p_screening_id::text)
  ORDER BY created_at DESC LIMIT 1;

  IF v_screening.event_visibility IN ('private','invite_only') OR coalesce(v_screening.invite_only,false) THEN
    IF p_invite_token_hash IS NULL THEN RAISE EXCEPTION 'private_event_invitation_required'; END IF;
    SELECT * INTO v_invite
    FROM public.event_access_invites
    WHERE screening_id=p_screening_id
      AND token_hash=p_invite_token_hash
      AND lower(invited_email)=lower(trim(p_email))
      AND status IN ('pending','sent','accepted')
      AND (expires_at IS NULL OR expires_at>now())
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'private_event_invitation_invalid'; END IF;
  END IF;

  UPDATE public.event_ticket_reservations
  SET status='expired'
  WHERE screening_id=p_screening_id AND status='pending' AND expires_at<=now();

  SELECT count(*) INTO v_paid_or_reserved
  FROM public.event_ticket_reservations
  WHERE screening_id=p_screening_id AND ticket_type IN ('live','combo') AND status IN ('pending','paid')
    AND (status='paid' OR expires_at>now());
  IF v_screening.ticket_capacity IS NOT NULL AND v_paid_or_reserved >= v_screening.ticket_capacity THEN
    RAISE EXCEPTION 'event_ticket_capacity_reached';
  END IF;

  SELECT count(*) INTO v_early_bird_count
  FROM public.event_ticket_reservations
  WHERE screening_id=p_screening_id AND ticket_type IN ('live','combo') AND is_early_bird=true
    AND (status='paid' OR (status='pending' AND expires_at>now()));

  v_currency := upper(coalesce(nullif(v_screening.base_currency,''),CASE WHEN upper(coalesce(p_country_code,''))='NG' THEN 'NGN' ELSE 'USD' END));
  v_live := coalesce(v_screening.base_price,
    CASE WHEN upper(coalesce(p_country_code,''))='NG' THEN v_screening.live_price_ngn ELSE v_screening.live_price_usd END,0);
  v_replay := coalesce(v_screening.replay_base_price,
    CASE WHEN upper(coalesce(p_country_code,''))='NG' THEN v_screening.replay_price_ngn ELSE v_screening.replay_price_usd END,0);

  IF p_ticket_type='replay' THEN
    IF v_screening.replay_access_model <> 'SEPARATE_PRICE' OR v_screening.live_recording_status <> 'ready' OR v_screening.live_replay_ready_at IS NULL THEN
      RAISE EXCEPTION 'replay_not_available_for_purchase';
    END IF;
    v_amount := v_replay;
  ELSE
    IF v_screening.access_model='FREE' THEN RAISE EXCEPTION 'free_event_does_not_require_paid_checkout'; END IF;
    IF p_ticket_type='combo' THEN
      v_amount := v_live + CASE WHEN v_screening.replay_access_model='SEPARATE_PRICE' THEN v_replay ELSE 0 END;
    ELSE
      v_amount := v_live;
    END IF;
    IF v_screening.early_bird_price IS NOT NULL
       AND v_screening.early_bird_ends_at IS NOT NULL
       AND v_screening.early_bird_ends_at > now()
       AND (v_screening.early_bird_capacity IS NULL OR v_early_bird_count < v_screening.early_bird_capacity) THEN
      v_amount := v_screening.early_bird_price;
      v_currency := coalesce(v_screening.early_bird_currency,v_currency);
      v_is_early := true;
    END IF;
  END IF;

  IF v_amount IS NULL OR v_amount<=0 OR v_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'event_ticket_price_not_configured';
  END IF;

  INSERT INTO public.event_ticket_reservations(
    tenant_id,screening_id,live_stream_id,invite_id,provider_reference,user_id,email,
    ticket_type,base_amount,base_currency,is_early_bird
  ) VALUES (
    v_screening.tenant_id,p_screening_id,v_stream_id,
    CASE WHEN v_invite.id IS NOT NULL THEN v_invite.id ELSE NULL END,
    p_provider_reference,p_user_id,lower(trim(p_email)),p_ticket_type,v_amount,v_currency,v_is_early
  );

  RETURN jsonb_build_object(
    'reservation_id',(SELECT id FROM public.event_ticket_reservations WHERE provider_reference=p_provider_reference),
    'base_amount',v_amount,'base_currency',v_currency,'is_early_bird',v_is_early
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_event_ticket_capacity(uuid,text,text,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_event_ticket_capacity(uuid,text,text,text,uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_event_ticket_reservation_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status='paid' THEN
      UPDATE public.event_ticket_reservations
      SET status='paid',paid_at=coalesce(paid_at,now())
      WHERE provider_reference=NEW.provider_reference AND status='pending';
      UPDATE public.event_access_invites i
      SET status='accepted',accepted_at=coalesce(i.accepted_at,now())
      FROM public.event_ticket_reservations r
      WHERE r.provider_reference=NEW.provider_reference AND r.invite_id=i.id AND i.status IN ('pending','sent');
    ELSIF NEW.status IN ('failed','cancelled') THEN
      UPDATE public.event_ticket_reservations
      SET status='failed'
      WHERE provider_reference=NEW.provider_reference AND status='pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_payment_order_event_reservation_sync ON public.live_payment_orders;
CREATE TRIGGER live_payment_order_event_reservation_sync
AFTER UPDATE OF status ON public.live_payment_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_event_ticket_reservation_payment();
REVOKE ALL ON FUNCTION public.sync_event_ticket_reservation_payment() FROM PUBLIC,anon,authenticated;
