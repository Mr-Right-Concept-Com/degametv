CREATE OR REPLACE FUNCTION public.prevent_event_base_currency_mutation_after_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_screening_id uuid;
BEGIN
 IF TG_TABLE_NAME='screenings' THEN
  v_screening_id:=OLD.id;
 ELSIF TG_TABLE_NAME='live_streams' THEN
  IF coalesce(OLD.metadata->>'screening_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN NEW; END IF;
  v_screening_id:=(OLD.metadata->>'screening_id')::uuid;
 ELSE
  RETURN NEW;
 END IF;
 IF (TG_TABLE_NAME='screenings' AND OLD.base_currency IS DISTINCT FROM NEW.base_currency)
    OR (TG_TABLE_NAME='live_streams' AND OLD.currency IS DISTINCT FROM NEW.currency) THEN
  IF EXISTS(SELECT 1 FROM public.event_ticket_reservations r
    WHERE r.screening_id=v_screening_id AND r.status IN ('pending','paid','complimentary') AND (r.status<>'pending' OR r.expires_at>now()))
   OR EXISTS(SELECT 1 FROM public.screening_tickets t
    WHERE t.screening_id=v_screening_id AND t.payment_status='completed' AND t.refunded_at IS NULL)
   OR EXISTS(SELECT 1 FROM public.tickets t
    WHERE t.metadata->>'screening_id'=v_screening_id::text AND t.revoked_at IS NULL) THEN
   RAISE EXCEPTION 'event_base_currency_locked_after_checkout' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS screening_base_currency_immutable_after_checkout ON public.screenings;
CREATE TRIGGER screening_base_currency_immutable_after_checkout
BEFORE UPDATE OF base_currency ON public.screenings
FOR EACH ROW EXECUTE FUNCTION public.prevent_event_base_currency_mutation_after_checkout();
DROP TRIGGER IF EXISTS live_stream_currency_immutable_after_checkout ON public.live_streams;
CREATE TRIGGER live_stream_currency_immutable_after_checkout
BEFORE UPDATE OF currency ON public.live_streams
FOR EACH ROW EXECUTE FUNCTION public.prevent_event_base_currency_mutation_after_checkout();
REVOKE ALL ON FUNCTION public.prevent_event_base_currency_mutation_after_checkout() FROM PUBLIC,anon,authenticated;
