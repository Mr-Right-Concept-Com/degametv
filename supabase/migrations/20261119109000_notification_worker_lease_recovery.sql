ALTER TABLE public.event_notification_outbox
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

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
  WHERE (
    o.status IN ('pending','failed')
    OR (o.status='processing' AND coalesce(o.claimed_at,o.created_at) < now()-interval '10 minutes')
  ) AND o.scheduled_for<=now() AND o.attempts<8
  ORDER BY o.scheduled_for,o.created_at
  FOR UPDATE SKIP LOCKED LIMIT greatest(1,least(p_limit,100))
 )
 UPDATE public.event_notification_outbox o
 SET status='processing',attempts=o.attempts+1,claimed_at=now(),last_error=NULL
 FROM picked
 WHERE o.id=picked.id
 RETURNING o.id,o.tenant_id,o.screening_id,o.live_stream_id,o.recipient_email,o.recipient_user_id,o.notification_type,o.idempotency_key,o.payload,o.attempts;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_event_notification_outbox(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_event_notification_outbox(integer) TO service_role;
