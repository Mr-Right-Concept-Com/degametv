CREATE OR REPLACE FUNCTION public.validate_event_reservation_before_payment_fulfillment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_reservation public.event_ticket_reservations%ROWTYPE; v_invite_status text; v_invite_expiry timestamptz;
BEGIN
 IF NEW.status IS DISTINCT FROM 'paid' OR OLD.status='paid' THEN RETURN NEW; END IF;
 SELECT * INTO v_reservation
  FROM public.event_ticket_reservations
  WHERE provider_reference=NEW.provider_reference
  FOR UPDATE;
 IF NOT FOUND THEN
  -- Preserve only orders created before this reservation gate was introduced.
  IF NEW.created_at >= timestamptz '2026-11-19 10:00:00+00' THEN
   RAISE EXCEPTION 'event_ticket_reservation_required' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
 END IF;
 IF v_reservation.status<>'pending' OR v_reservation.expires_at<=now() THEN
  RAISE EXCEPTION 'event_ticket_reservation_expired' USING ERRCODE='23514';
 END IF;
 IF v_reservation.invite_id IS NOT NULL THEN
  SELECT status,expires_at INTO v_invite_status,v_invite_expiry
   FROM public.event_access_invites WHERE id=v_reservation.invite_id FOR SHARE;
  IF v_invite_status NOT IN ('pending','sent','accepted') OR (v_invite_expiry IS NOT NULL AND v_invite_expiry<=now()) THEN
   RAISE EXCEPTION 'event_invitation_revoked_or_expired' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS live_order_reservation_before_fulfillment ON public.live_payment_orders;
CREATE TRIGGER live_order_reservation_before_fulfillment
BEFORE UPDATE OF status ON public.live_payment_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_event_reservation_before_payment_fulfillment();
DROP TRIGGER IF EXISTS guest_order_reservation_before_fulfillment ON public.guest_payment_orders;
CREATE TRIGGER guest_order_reservation_before_fulfillment
BEFORE UPDATE OF status ON public.guest_payment_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_event_reservation_before_payment_fulfillment();
REVOKE ALL ON FUNCTION public.validate_event_reservation_before_payment_fulfillment() FROM PUBLIC,anon,authenticated;
