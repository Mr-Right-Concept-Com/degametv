CREATE TABLE IF NOT EXISTS public.screening_ticket_playback_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ticket_id uuid NOT NULL REFERENCES public.screening_tickets(id) ON DELETE CASCADE,
 screening_id uuid NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
 session_token_hash text NOT NULL UNIQUE CHECK (session_token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL,
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 country_code text,
 ip_hash text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS screening_ticket_playback_sessions_active_idx
 ON public.screening_ticket_playback_sessions(ticket_id,expires_at)
 WHERE revoked_at IS NULL;
ALTER TABLE public.screening_ticket_playback_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.screening_ticket_playback_sessions FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.screening_ticket_playback_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.claim_screening_ticket_playback(
 p_ticket_id uuid,p_session_token_hash text,p_ip_hash text DEFAULT NULL,p_country_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_ticket public.screening_tickets%ROWTYPE;
 v_max_streams integer:=5; v_max_concurrent integer:=1; v_active integer:=0;
 v_existing public.screening_ticket_playback_sessions%ROWTYPE; v_session uuid; v_expires timestamptz;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501'; END IF;
 IF p_session_token_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid_playback_session'; END IF;
 SELECT * INTO v_ticket FROM public.screening_tickets WHERE id=p_ticket_id FOR UPDATE;
 IF NOT FOUND OR v_ticket.payment_status<>'completed' OR v_ticket.refunded_at IS NOT NULL OR v_ticket.revoked_at IS NOT NULL
   OR v_ticket.expires_at<=now() THEN RAISE EXCEPTION 'ticket_not_playable' USING ERRCODE='42501'; END IF;
 IF v_ticket.first_played_at IS NOT NULL AND v_ticket.access_hours IS NOT NULL
   AND now()>v_ticket.first_played_at+make_interval(hours=>v_ticket.access_hours) THEN
  RAISE EXCEPTION 'ticket_viewing_window_expired' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(max_concurrent_streams,1),coalesce(max_streams_per_ticket,5)
  INTO v_max_concurrent,v_max_streams FROM public.screenings WHERE id=v_ticket.screening_id AND status='published';
 IF NOT FOUND THEN RAISE EXCEPTION 'screening_unavailable' USING ERRCODE='42501'; END IF;
 UPDATE public.screening_ticket_playback_sessions SET revoked_at=now()
  WHERE ticket_id=p_ticket_id AND revoked_at IS NULL AND expires_at<=now();
 SELECT * INTO v_existing FROM public.screening_ticket_playback_sessions
  WHERE ticket_id=p_ticket_id AND session_token_hash=p_session_token_hash
  FOR UPDATE;
 IF FOUND AND v_existing.revoked_at IS NULL AND v_existing.expires_at>now() THEN
  v_expires:=least(now()+interval '20 minutes',v_ticket.expires_at);
  UPDATE public.screening_ticket_playback_sessions SET expires_at=v_expires,last_seen_at=now(),
   ip_hash=p_ip_hash,country_code=p_country_code WHERE id=v_existing.id;
  RETURN jsonb_build_object('session_id',v_existing.id,'expires_at',v_expires,'streams_remaining',greatest(0,v_max_streams-v_ticket.stream_count),'reused',true);
 END IF;
 SELECT count(*) INTO v_active FROM public.screening_ticket_playback_sessions
  WHERE ticket_id=p_ticket_id AND revoked_at IS NULL AND expires_at>now();
 IF v_active>=v_max_concurrent THEN RAISE EXCEPTION 'ticket_concurrent_stream_limit' USING ERRCODE='42501'; END IF;
 IF coalesce(v_ticket.stream_count,0)>=v_max_streams THEN RAISE EXCEPTION 'ticket_stream_limit_reached' USING ERRCODE='42501'; END IF;
 v_expires:=least(now()+interval '20 minutes',v_ticket.expires_at);
 IF v_existing.id IS NOT NULL THEN
  v_session:=v_existing.id;
  UPDATE public.screening_ticket_playback_sessions SET revoked_at=NULL,expires_at=v_expires,last_seen_at=now(),
   ip_hash=p_ip_hash,country_code=p_country_code WHERE id=v_session;
 ELSE
  INSERT INTO public.screening_ticket_playback_sessions(ticket_id,screening_id,session_token_hash,expires_at,country_code,ip_hash)
  VALUES(p_ticket_id,v_ticket.screening_id,p_session_token_hash,v_expires,p_country_code,p_ip_hash)
  RETURNING id INTO v_session;
 END IF;
 UPDATE public.screening_tickets SET stream_count=coalesce(stream_count,0)+1,used_at=now(),
  first_played_at=coalesce(first_played_at,now()),last_ip=p_ip_hash,last_country=p_country_code
 WHERE id=p_ticket_id;
 RETURN jsonb_build_object('session_id',v_session,'expires_at',v_expires,'streams_remaining',greatest(0,v_max_streams-coalesce(v_ticket.stream_count,0)-1),'reused',false);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_screening_ticket_playback(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_screening_ticket_playback(uuid,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.heartbeat_screening_ticket_playback(p_ticket_id uuid,p_session_token_hash text,p_release boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_session public.screening_ticket_playback_sessions%ROWTYPE; v_ticket public.screening_tickets%ROWTYPE; v_expires timestamptz;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_ticket FROM public.screening_tickets WHERE id=p_ticket_id;
 IF NOT FOUND OR v_ticket.payment_status<>'completed' OR v_ticket.refunded_at IS NOT NULL OR v_ticket.revoked_at IS NOT NULL
   OR v_ticket.expires_at<=now() THEN
  RAISE EXCEPTION 'ticket_not_playable' USING ERRCODE='42501';
 END IF;
 IF v_ticket.first_played_at IS NOT NULL AND v_ticket.access_hours IS NOT NULL
   AND now()>v_ticket.first_played_at+make_interval(hours=>v_ticket.access_hours) THEN
  RAISE EXCEPTION 'ticket_viewing_window_expired' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_session FROM public.screening_ticket_playback_sessions
  WHERE ticket_id=p_ticket_id AND session_token_hash=p_session_token_hash AND revoked_at IS NULL AND expires_at>now()
  FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'playback_session_expired' USING ERRCODE='42501'; END IF;
 IF p_release THEN
  UPDATE public.screening_ticket_playback_sessions SET revoked_at=now(),last_seen_at=now() WHERE id=v_session.id;
  RETURN jsonb_build_object('released',true);
 END IF;
 v_expires:=least(now()+interval '20 minutes',v_ticket.expires_at);
 UPDATE public.screening_ticket_playback_sessions SET expires_at=v_expires,last_seen_at=now() WHERE id=v_session.id;
 RETURN jsonb_build_object('expires_at',v_expires);
END;
$$;
REVOKE ALL ON FUNCTION public.heartbeat_screening_ticket_playback(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_screening_ticket_playback(uuid,text,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.revoke_screening_ticket_playback_on_ticket_invalidity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
BEGIN
 IF (NEW.refunded_at IS NOT NULL OR NEW.revoked_at IS NOT NULL OR NEW.payment_status<>'completed')
    AND (OLD.refunded_at IS NULL AND OLD.revoked_at IS NULL AND OLD.payment_status='completed') THEN
  UPDATE public.screening_ticket_playback_sessions SET revoked_at=now()
   WHERE ticket_id=NEW.id AND revoked_at IS NULL;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS screening_ticket_playback_revoke_on_invalidity ON public.screening_tickets;
CREATE TRIGGER screening_ticket_playback_revoke_on_invalidity
AFTER UPDATE OF refunded_at,revoked_at,payment_status ON public.screening_tickets
FOR EACH ROW EXECUTE FUNCTION public.revoke_screening_ticket_playback_on_ticket_invalidity();
REVOKE ALL ON FUNCTION public.revoke_screening_ticket_playback_on_ticket_invalidity() FROM PUBLIC,anon,authenticated;
