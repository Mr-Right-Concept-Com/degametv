CREATE OR REPLACE FUNCTION public.enqueue_event_status_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_type text; v_suffix text;
BEGIN
 IF (NEW.lifecycle IN ('cancelled','canceled') OR NEW.cancelled_at IS NOT NULL)
    AND NOT (OLD.lifecycle IN ('cancelled','canceled') OR OLD.cancelled_at IS NOT NULL) THEN
  v_type:='event_cancelled'; v_suffix:='cancelled';
 ELSIF NEW.live_replay_ready_at IS NOT NULL AND OLD.live_replay_ready_at IS NULL THEN
  v_type:='replay_ready'; v_suffix:='replay-ready';
 ELSE
  RETURN NEW;
 END IF;

 INSERT INTO public.event_notification_outbox(tenant_id,screening_id,recipient_email,recipient_user_id,notification_type,idempotency_key,payload)
 SELECT NEW.tenant_id,NEW.id,lower(st.email),st.user_id,v_type,v_suffix||':'||NEW.id::text||':'||st.id::text,
  jsonb_build_object('title',NEW.title,'slug',NEW.slug,'delivery_route','/tickets')
 FROM public.screening_tickets st
 WHERE st.screening_id=NEW.id AND st.payment_status='completed' AND st.refunded_at IS NULL
   AND st.email IS NOT NULL
 ON CONFLICT(idempotency_key) DO NOTHING;

 INSERT INTO public.event_notification_outbox(tenant_id,screening_id,recipient_email,recipient_user_id,notification_type,idempotency_key,payload)
 SELECT NEW.tenant_id,NEW.id,lower(coalesce(o.email,u.email)),t.user_id,v_type,v_suffix||':'||NEW.id::text||':'||t.id::text,
  jsonb_build_object('title',NEW.title,'slug',NEW.slug,'delivery_route','/tickets')
 FROM public.tickets t
 LEFT JOIN auth.users u ON u.id=t.user_id
 LEFT JOIN public.live_payment_orders o ON o.provider_reference=t.metadata->>'payment_reference'
 WHERE t.metadata->>'screening_id'=NEW.id::text AND t.revoked_at IS NULL
   AND coalesce(o.email,u.email) IS NOT NULL
 ON CONFLICT(idempotency_key) DO NOTHING;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS screening_event_status_notifications ON public.screenings;
CREATE TRIGGER screening_event_status_notifications
AFTER UPDATE OF lifecycle,cancelled_at,live_replay_ready_at ON public.screenings
FOR EACH ROW EXECUTE FUNCTION public.enqueue_event_status_notifications();
REVOKE ALL ON FUNCTION public.enqueue_event_status_notifications() FROM PUBLIC,anon,authenticated;
