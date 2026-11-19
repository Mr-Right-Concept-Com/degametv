-- Bind verified ticket and fan-contribution transactions to the event settlement
-- hold ledger. Wallet availability must follow the event delivery hold, not a
-- fixed purchase-age escrow window.

CREATE OR REPLACE FUNCTION public.sync_event_settlement_to_wallet_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_settles_at timestamptz;
BEGIN
  IF NEW.hold_status IN ('refunded','paid') THEN
    v_settles_at := now();
  ELSIF NEW.hold_status IN ('disputed','blocked') OR NEW.release_at IS NULL THEN
    v_settles_at := 'infinity'::timestamptz;
  ELSE
    v_settles_at := NEW.release_at;
  END IF;
  IF NEW.source_type='ticket' THEN
    UPDATE public.wallet_ledger
      SET settles_at=v_settles_at
      WHERE ticket_id=NEW.source_id AND kind='sale';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS event_settlement_wallet_ledger_sync ON public.event_settlement_holds;
CREATE TRIGGER event_settlement_wallet_ledger_sync
AFTER INSERT OR UPDATE OF hold_status,release_at ON public.event_settlement_holds
FOR EACH ROW EXECUTE FUNCTION public.sync_event_settlement_to_wallet_ledger();
REVOKE ALL ON FUNCTION public.sync_event_settlement_to_wallet_ledger() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.sync_event_ticket_reservation_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_reservation public.event_ticket_reservations%ROWTYPE;
  v_screening_id uuid;
  v_stream_id uuid;
  v_ticket_id uuid;
  v_tenant_id uuid;
  v_creator_id uuid;
  v_currency text;
  v_gross_minor bigint;
  v_net_minor bigint;
  v_fee_major numeric:=0;
  v_gross_major numeric:=0;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.status='paid' THEN
    UPDATE public.event_ticket_reservations
      SET status='paid',paid_at=coalesce(paid_at,now())
      WHERE provider_reference=NEW.provider_reference AND status='pending';
    UPDATE public.event_access_invites i
      SET status='accepted',accepted_at=coalesce(i.accepted_at,now())
      FROM public.event_ticket_reservations r
      WHERE r.provider_reference=NEW.provider_reference AND r.invite_id=i.id
        AND i.status IN ('pending','sent');

    IF TG_TABLE_NAME='live_payment_orders' THEN
      SELECT * INTO v_reservation FROM public.event_ticket_reservations
        WHERE provider_reference=NEW.provider_reference;
      SELECT t.id,t.tenant_id,t.stream_id,t.currency,t.price,s.id,c.creator_id
        INTO v_ticket_id,v_tenant_id,v_stream_id,v_currency,v_gross_major,v_screening_id,v_creator_id
        FROM public.tickets t
        JOIN public.screenings s ON s.id=(t.metadata->>'screening_id')::uuid
        JOIN public.content c ON c.id=s.content_id
        WHERE t.metadata->>'payment_reference'=NEW.provider_reference
        ORDER BY t.created_at DESC LIMIT 1;
      IF v_ticket_id IS NOT NULL AND v_creator_id IS NOT NULL THEN
        v_gross_minor:=NEW.amount_minor;
        v_fee_major:=coalesce(NEW.platform_fee_major,0);
        v_net_minor:=greatest(0,v_gross_minor-round(v_gross_minor*v_fee_major/nullif(coalesce(NEW.amount_major,v_gross_minor::numeric/100),0)))::bigint;
        INSERT INTO public.event_settlement_holds(
          tenant_id,creator_id,screening_id,live_stream_id,source_type,source_id,
          currency,gross_amount_minor,net_amount_minor,hold_hours
        ) VALUES (
          v_tenant_id,v_creator_id,v_screening_id,v_stream_id,'ticket',v_ticket_id,
          v_currency,v_gross_minor,v_net_minor,coalesce((SELECT settlement_hold_hours FROM public.screenings WHERE id=v_screening_id),48)
        ) ON CONFLICT(source_type,source_id) DO NOTHING;
      END IF;
    ELSIF TG_TABLE_NAME='guest_payment_orders' THEN
      SELECT st.id,st.screening_id,st.tenant_id,st.currency,st.price,c.creator_id
        INTO v_ticket_id,v_screening_id,v_tenant_id,v_currency,v_gross_major,v_creator_id
        FROM public.screening_tickets st
        JOIN public.screenings s ON s.id=st.screening_id
        JOIN public.content c ON c.id=s.content_id
        WHERE st.id=NEW.ticket_id;
      IF v_ticket_id IS NOT NULL AND v_creator_id IS NOT NULL THEN
        v_gross_minor:=NEW.amount_minor;
        v_fee_major:=coalesce(NEW.platform_fee_major,0);
        v_net_minor:=greatest(0,v_gross_minor-round(v_gross_minor*v_fee_major/nullif(v_gross_major,0)))::bigint;
        INSERT INTO public.event_settlement_holds(
          tenant_id,creator_id,screening_id,source_type,source_id,
          currency,gross_amount_minor,net_amount_minor,hold_hours
        ) VALUES (
          v_tenant_id,v_creator_id,v_screening_id,'ticket',v_ticket_id,
          NEW.currency,v_gross_minor,v_net_minor,coalesce((SELECT settlement_hold_hours FROM public.screenings WHERE id=v_screening_id),48)
        ) ON CONFLICT(source_type,source_id) DO NOTHING;
      END IF;
    END IF;
  ELSIF NEW.status IN ('failed','cancelled','refunded') THEN
    UPDATE public.event_ticket_reservations
      SET status=CASE WHEN NEW.status='refunded' THEN 'refunded' ELSE 'failed' END
      WHERE provider_reference=NEW.provider_reference AND status IN ('pending','paid');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_event_ticket_reservation_payment() FROM PUBLIC,anon,authenticated;

-- Guest checkout creates its wallet row after marking the order paid. Reapply
-- the hold once that ledger row exists.
CREATE OR REPLACE FUNCTION public.apply_existing_event_hold_to_wallet_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_hold public.event_settlement_holds%ROWTYPE;
BEGIN
  IF NEW.ticket_id IS NULL OR NEW.kind<>'sale' THEN RETURN NEW; END IF;
  SELECT * INTO v_hold FROM public.event_settlement_holds
    WHERE source_type='ticket' AND source_id=NEW.ticket_id;
  IF FOUND THEN
    UPDATE public.wallet_ledger SET settles_at=
      CASE WHEN v_hold.hold_status IN ('refunded','paid') THEN now()
           WHEN v_hold.hold_status IN ('disputed','blocked') OR v_hold.release_at IS NULL THEN 'infinity'::timestamptz
           ELSE v_hold.release_at END
    WHERE id=NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS wallet_ledger_apply_event_hold ON public.wallet_ledger;
CREATE TRIGGER wallet_ledger_apply_event_hold
AFTER INSERT ON public.wallet_ledger
FOR EACH ROW EXECUTE FUNCTION public.apply_existing_event_hold_to_wallet_ledger();
REVOKE ALL ON FUNCTION public.apply_existing_event_hold_to_wallet_ledger() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.create_event_contribution_settlement_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_creator uuid;
  v_tenant uuid;
  v_fee_rate numeric:=0;
  v_fee_minor bigint:=0;
BEGIN
  IF NEW.status IS DISTINCT FROM 'paid' THEN RETURN NEW; END IF;
  IF NEW.screening_id IS NOT NULL THEN
    SELECT c.creator_id,s.tenant_id INTO v_creator,v_tenant
      FROM public.screenings s JOIN public.content c ON c.id=s.content_id
      WHERE s.id=NEW.screening_id;
  ELSE
    SELECT l.creator_id,l.tenant_id INTO v_creator,v_tenant
      FROM public.live_streams l WHERE l.id=NEW.live_stream_id;
  END IF;
  IF v_creator IS NULL OR v_creator<>NEW.creator_id OR v_tenant<>NEW.tenant_id THEN
    RAISE EXCEPTION 'contribution_event_owner_mismatch' USING ERRCODE='42501';
  END IF;
  SELECT coalesce((setting_value->>'creator')::numeric,0)
    INTO v_fee_rate FROM public.platform_settings WHERE setting_key='commission_rates';
  IF v_fee_rate<0 OR v_fee_rate>0.5 THEN RAISE EXCEPTION 'creator_commission_policy_invalid'; END IF;
  v_fee_minor:=round(NEW.amount_minor*v_fee_rate);
  INSERT INTO public.event_settlement_holds(
    tenant_id,creator_id,screening_id,live_stream_id,source_type,source_id,
    currency,gross_amount_minor,net_amount_minor,hold_hours
  ) VALUES (
    NEW.tenant_id,NEW.creator_id,NEW.screening_id,NEW.live_stream_id,
    NEW.contribution_type,NEW.id,NEW.currency,NEW.amount_minor,
    greatest(0,NEW.amount_minor-v_fee_minor),
    coalesce((SELECT settlement_hold_hours FROM public.screenings WHERE id=NEW.screening_id),
             (SELECT settlement_hold_hours FROM public.live_streams WHERE id=NEW.live_stream_id),48)
  ) ON CONFLICT(source_type,source_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS event_contribution_settlement_hold ON public.event_contributions;
CREATE TRIGGER event_contribution_settlement_hold
AFTER INSERT OR UPDATE OF status ON public.event_contributions
FOR EACH ROW EXECUTE FUNCTION public.create_event_contribution_settlement_hold();
REVOKE ALL ON FUNCTION public.create_event_contribution_settlement_hold() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.sync_event_refund_to_settlement_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
BEGIN
  IF NEW.status='succeeded' AND NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.event_settlement_holds
      SET hold_status='refunded',release_at=NULL,updated_at=now()
      WHERE source_type='ticket'
        AND source_id IN (coalesce(NEW.ticket_id,NEW.live_ticket_id));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS payment_refund_event_hold_sync ON public.payment_refunds;
CREATE TRIGGER payment_refund_event_hold_sync
AFTER UPDATE OF status ON public.payment_refunds
FOR EACH ROW EXECUTE FUNCTION public.sync_event_refund_to_settlement_hold();
REVOKE ALL ON FUNCTION public.sync_event_refund_to_settlement_hold() FROM PUBLIC,anon,authenticated;

-- Backfill already-fulfilled ticket sales without duplicating their source rows.
INSERT INTO public.event_settlement_holds(
  tenant_id,creator_id,screening_id,source_type,source_id,currency,
  gross_amount_minor,net_amount_minor,hold_hours
)
SELECT st.tenant_id,c.creator_id,st.screening_id,'ticket',st.id,coalesce(gpo.currency,st.currency,'NGN'),
  gpo.amount_minor,
  greatest(0,gpo.amount_minor-round(gpo.amount_minor*coalesce(gpo.platform_fee_major,0)/nullif(st.price,0)))::bigint,
  coalesce(s.settlement_hold_hours,48)
FROM public.screening_tickets st
JOIN public.guest_payment_orders gpo ON gpo.ticket_id=st.id AND gpo.status='paid'
JOIN public.screenings s ON s.id=st.screening_id
JOIN public.content c ON c.id=s.content_id
WHERE st.payment_status='completed'
ON CONFLICT(source_type,source_id) DO NOTHING;

INSERT INTO public.event_settlement_holds(
  tenant_id,creator_id,screening_id,live_stream_id,source_type,source_id,currency,
  gross_amount_minor,net_amount_minor,hold_hours
)
SELECT t.tenant_id,c.creator_id,s.id,t.stream_id,'ticket',t.id,o.currency,
  o.amount_minor,
  greatest(0,o.amount_minor-round(o.amount_minor*coalesce(o.platform_fee_major,0)/nullif(coalesce(o.amount_major,o.amount_minor::numeric/100),0)))::bigint,
  coalesce(s.settlement_hold_hours,48)
FROM public.live_payment_orders o
JOIN public.tickets t ON t.metadata->>'payment_reference'=o.provider_reference
JOIN public.screenings s ON s.id=o.screening_id
JOIN public.content c ON c.id=s.content_id
WHERE o.status='paid'
ON CONFLICT(source_type,source_id) DO NOTHING;
