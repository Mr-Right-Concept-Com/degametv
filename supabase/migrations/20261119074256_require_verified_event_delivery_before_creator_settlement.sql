CREATE OR REPLACE FUNCTION public.guard_event_settlement_hold()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE v_creator uuid; v_tenant uuid; v_event_end timestamptz; v_delivered timestamptz; v_hours integer;
BEGIN
 IF NEW.screening_id IS NOT NULL THEN
  SELECT c.creator_id,s.tenant_id,coalesce(s.live_ended_at,s.screening_date,s.release_date),s.live_replay_ready_at,s.settlement_hold_hours
   INTO v_creator,v_tenant,v_event_end,v_delivered,v_hours
   FROM public.screenings s JOIN public.content c ON c.id=s.content_id WHERE s.id=NEW.screening_id;
 ELSE
  SELECT l.creator_id,l.tenant_id,l.actual_ended_at,
   CASE WHEN l.recording_enabled AND l.settlement_delivery_required THEN CASE WHEN l.vod_replay_asset_url IS NOT NULL THEN l.actual_ended_at ELSE NULL END ELSE l.actual_ended_at END,
   l.settlement_hold_hours
   INTO v_creator,v_tenant,v_event_end,v_delivered,v_hours FROM public.live_streams l WHERE l.id=NEW.live_stream_id;
 END IF;
 IF v_creator IS NULL OR v_creator<>NEW.creator_id OR v_tenant<>NEW.tenant_id THEN RAISE EXCEPTION 'settlement_event_owner_mismatch' USING ERRCODE='42501'; END IF;
 IF NEW.hold_hours IS NULL OR NEW.hold_hours=48 THEN NEW.hold_hours:=coalesce(v_hours,48); END IF;
 NEW.event_ended_at:=coalesce(NEW.event_ended_at,v_event_end);
 NEW.delivery_confirmed_at:=coalesce(NEW.delivery_confirmed_at,v_delivered);
 NEW.release_at:=CASE WHEN NEW.event_ended_at IS NOT NULL AND NEW.event_ended_at<=now() AND NEW.delivery_confirmed_at IS NOT NULL THEN NEW.event_ended_at + make_interval(hours=>NEW.hold_hours) ELSE NULL END;
 IF NEW.release_at IS NULL THEN NEW.hold_status:='held'; ELSIF NEW.release_at<=now() THEN NEW.hold_status:='eligible'; ELSE NEW.hold_status:='held'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.confirm_event_delivery(p_screening_id uuid DEFAULT NULL,p_live_stream_id uuid DEFAULT NULL,p_evidence jsonb DEFAULT '{}'::jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_count integer:=0; v_ended timestamptz; v_delivered timestamptz; v_requires_delivery boolean;
BEGIN
 IF auth.role()<>'service_role' AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role::text='super_admin') THEN
  RAISE EXCEPTION 'service_or_super_admin_required' USING ERRCODE='42501';
 END IF;
 IF (p_screening_id IS NOT NULL)::int + (p_live_stream_id IS NOT NULL)::int <> 1 THEN RAISE EXCEPTION 'exactly_one_event_required'; END IF;
 IF p_screening_id IS NOT NULL THEN
  SELECT coalesce(s.live_ended_at,s.screening_date,s.release_date),
   CASE WHEN s.event_type='live' THEN s.live_replay_ready_at WHEN c.video_url IS NOT NULL THEN now() ELSE NULL END
   INTO v_ended,v_delivered FROM public.screenings s JOIN public.content c ON c.id=s.content_id WHERE s.id=p_screening_id;
  IF v_ended IS NULL OR v_ended>now() OR v_delivered IS NULL THEN RAISE EXCEPTION 'event_end_and_content_delivery_required'; END IF;
  UPDATE public.event_settlement_holds SET event_ended_at=v_ended,delivery_confirmed_at=v_delivered,delivery_evidence=p_evidence,updated_at=now() WHERE screening_id=p_screening_id AND hold_status='held';
 ELSE
  SELECT l.actual_ended_at,
   CASE WHEN l.recording_enabled AND l.settlement_delivery_required THEN CASE WHEN l.vod_replay_asset_url IS NOT NULL THEN now() ELSE NULL END ELSE l.actual_ended_at END
   INTO v_ended,v_delivered FROM public.live_streams l WHERE l.id=p_live_stream_id;
  IF v_ended IS NULL OR v_ended>now() OR v_delivered IS NULL THEN RAISE EXCEPTION 'live_event_end_and_promised_delivery_required'; END IF;
  UPDATE public.event_settlement_holds SET event_ended_at=v_ended,delivery_confirmed_at=v_delivered,delivery_evidence=p_evidence,updated_at=now() WHERE live_stream_id=p_live_stream_id AND hold_status='held';
 END IF;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.guard_event_settlement_hold() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.confirm_event_delivery(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_event_delivery(uuid,uuid,jsonb) TO service_role;