-- Durable, idempotent notification enqueueing and worker claims.
CREATE OR REPLACE FUNCTION public.enqueue_ticket_confirmation_for_live_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_screening uuid; v_email text; v_title text; v_tenant uuid;
BEGIN
 v_screening:=nullif(NEW.metadata->>'screening_id','')::uuid;
 IF v_screening IS NULL OR NEW.user_id IS NULL THEN RETURN NEW; END IF;
 SELECT s.tenant_id,s.title INTO v_tenant,v_title FROM public.screenings s WHERE s.id=v_screening;
 IF NEW.user_id IS NOT NULL THEN SELECT email INTO v_email FROM auth.users WHERE id=NEW.user_id; ELSE v_email:=NEW.guest_email; END IF;
 IF v_email IS NULL THEN RETURN NEW; END IF;
 INSERT INTO public.event_notification_outbox(tenant_id,screening_id,recipient_email,recipient_user_id,notification_type,idempotency_key,payload)
 VALUES(v_tenant,v_screening,lower(v_email),NEW.user_id,'ticket_confirmation','ticket-confirmation:'||NEW.id::text,
  jsonb_build_object('title',v_title,'ticket_code',NEW.ticket_code,'ticket_type',NEW.ticket_type,'delivery_route','/tickets'))
 ON CONFLICT(idempotency_key) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS live_ticket_confirmation_outbox ON public.tickets;
CREATE TRIGGER live_ticket_confirmation_outbox
AFTER INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.enqueue_ticket_confirmation_for_live_ticket();
REVOKE ALL ON FUNCTION public.enqueue_ticket_confirmation_for_live_ticket() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_ticket_confirmation_for_screening_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_title text;
BEGIN
 IF NEW.user_id IS NULL OR NEW.payment_status<>'completed' THEN RETURN NEW; END IF;
 SELECT title INTO v_title FROM public.screenings WHERE id=NEW.screening_id;
 INSERT INTO public.event_notification_outbox(tenant_id,screening_id,recipient_email,recipient_user_id,notification_type,idempotency_key,payload)
 VALUES(NEW.tenant_id,NEW.screening_id,lower(NEW.email),NEW.user_id,'ticket_confirmation','screening-ticket-confirmation:'||NEW.id::text,
  jsonb_build_object('title',v_title,'ticket_code',NEW.ticket_code,'delivery_route','/tickets'))
 ON CONFLICT(idempotency_key) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS screening_ticket_confirmation_outbox ON public.screening_tickets;
CREATE TRIGGER screening_ticket_confirmation_outbox
AFTER INSERT OR UPDATE OF payment_status ON public.screening_tickets
FOR EACH ROW EXECUTE FUNCTION public.enqueue_ticket_confirmation_for_screening_ticket();
REVOKE ALL ON FUNCTION public.enqueue_ticket_confirmation_for_screening_ticket() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_event_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_event record; v_ticket record; v_reminder record; v_window text; v_count integer:=0;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501'; END IF;
 FOR v_event IN
  SELECT id,tenant_id,title,slug,screening_date,event_timezone
  FROM public.screenings
  WHERE status='published' AND screening_date IS NOT NULL
    AND screening_date BETWEEN now()-interval '5 minutes' AND now()+interval '25 hours'
 LOOP
  FOR v_reminder IN
   SELECT x.window_key FROM (VALUES
    ('24h',v_event.screening_date-interval '24 hours'),
    ('1h',v_event.screening_date-interval '1 hour'),
    ('15m',v_event.screening_date-interval '15 minutes'),
    ('started',v_event.screening_date)
   ) AS x(window_key,target_at)
   WHERE x.target_at BETWEEN now()-interval '5 minutes' AND now()+interval '5 minutes'
  LOOP
   v_window:=v_reminder.window_key;
   FOR v_ticket IN
    SELECT st.email AS email,st.user_id AS user_id,st.id AS ticket_id
    FROM public.screening_tickets st
    WHERE st.screening_id=v_event.id AND st.payment_status='completed' AND st.refunded_at IS NULL
    UNION ALL
    SELECT coalesce(t.guest_email,u.email) AS email,t.user_id AS user_id,t.id AS ticket_id
    FROM public.tickets t LEFT JOIN auth.users u ON u.id=t.user_id
    WHERE t.metadata->>'screening_id'=v_event.id::text AND t.revoked_at IS NULL AND t.valid_until>now()
   LOOP
    IF v_ticket.email IS NULL THEN CONTINUE; END IF;
    INSERT INTO public.event_notification_outbox(
      tenant_id,screening_id,recipient_email,recipient_user_id,notification_type,idempotency_key,payload
    ) VALUES (
      v_event.tenant_id,v_event.id,lower(v_ticket.email),v_ticket.user_id,
      CASE WHEN v_window='started' THEN 'event_started' ELSE 'event_reminder' END,
      'event-reminder:'||v_event.id::text||':'||v_ticket.ticket_id::text||':'||v_window,
      jsonb_build_object('title',v_event.title,'slug',v_event.slug,'reminder_window',v_window,'event_at',v_event.screening_date,'event_timezone',v_event.event_timezone,'delivery_route','/tickets')
    ) ON CONFLICT(idempotency_key) DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
   END LOOP;
  END LOOP;
 END LOOP;
 RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_event_reminders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_event_reminders() TO service_role;

CREATE OR REPLACE FUNCTION public.claim_event_notification_outbox(p_limit integer DEFAULT 25)
RETURNS TABLE(id uuid,tenant_id uuid,screening_id uuid,live_stream_id uuid,recipient_email text,recipient_user_id uuid,notification_type text,idempotency_key text,payload jsonb,attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501'; END IF;
 RETURN QUERY
 WITH picked AS (
  SELECT o.id FROM public.event_notification_outbox o
  WHERE o.status IN ('pending','failed') AND o.scheduled_for<=now() AND o.attempts<8
  ORDER BY o.scheduled_for,o.created_at
  FOR UPDATE SKIP LOCKED LIMIT greatest(1,least(p_limit,100))
 )
 UPDATE public.event_notification_outbox o
 SET status='processing',attempts=o.attempts+1,last_error=NULL
 FROM picked
 WHERE o.id=picked.id
 RETURNING o.id,o.tenant_id,o.screening_id,o.live_stream_id,o.recipient_email,o.recipient_user_id,o.notification_type,o.idempotency_key,o.payload,o.attempts;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_event_notification_outbox(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_event_notification_outbox(integer) TO service_role;
