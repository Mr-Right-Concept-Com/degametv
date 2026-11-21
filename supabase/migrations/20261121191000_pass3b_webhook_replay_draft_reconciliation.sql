CREATE OR REPLACE FUNCTION public.apply_stream_provider_event(p_provider_key text, p_provider_reference text, p_event_id text, p_event_type text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_stream public.live_streams%rowtype; v_log_id uuid;
  v_next public.broadcast_lifecycle_status; v_now timestamptz:=now();
  v_replay_url text; v_transitioned boolean:=false;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501'; END IF;
  IF nullif(trim(p_provider_key),'') IS NULL OR nullif(trim(p_provider_reference),'') IS NULL
     OR nullif(trim(p_event_id),'') IS NULL OR length(p_event_id)>255 THEN RAISE EXCEPTION 'invalid_provider_event'; END IF;
  SELECT * INTO v_stream FROM public.live_streams WHERE metadata->>'provider'=p_provider_key
    AND metadata->>'provider_reference'=p_provider_reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'provider_stream_not_found'; END IF;
  INSERT INTO public.stream_provider_event_logs(provider_key,provider_event_id,event_type,stream_id,payload)
  VALUES(p_provider_key,p_event_id,p_event_type,v_stream.id,coalesce(p_payload,'{}'::jsonb))
  ON CONFLICT(provider_key,provider_event_id) DO NOTHING RETURNING id INTO v_log_id;
  IF v_log_id IS NULL THEN RETURN jsonb_build_object('received',true,'duplicate',true,'lifecycle_status',v_stream.lifecycle_status); END IF;
  v_next:=v_stream.lifecycle_status;
  CASE p_event_type
    WHEN 'stream.connected' THEN IF v_next IN ('WAITING_FOR_ENCODER','ENCODER_DISCONNECTED') THEN v_next:='ENCODER_CONNECTED';v_transitioned:=true;END IF;
    WHEN 'stream.active' THEN IF v_next IN ('WAITING_FOR_ENCODER','ENCODER_CONNECTED','ENCODER_DISCONNECTED') THEN v_next:='LIVE';v_transitioned:=true;END IF;
    WHEN 'stream.disconnected' THEN IF v_next IN ('LIVE','ENCODER_CONNECTED') THEN v_next:='ENCODER_DISCONNECTED';v_transitioned:=true;END IF;
    WHEN 'stream.ended' THEN IF v_next IN ('LIVE','ENCODER_DISCONNECTED','ENCODER_CONNECTED','ENDING') THEN v_next:='PROCESSING_REPLAY';v_transitioned:=true;END IF;
    WHEN 'recording.ready' THEN IF v_next IN ('LIVE','ENCODER_DISCONNECTED','ENCODER_CONNECTED','PROCESSING_REPLAY') THEN v_next:='REPLAY_AVAILABLE';v_transitioned:=true;END IF;
    WHEN 'recording.failed' THEN IF v_next IN ('LIVE','ENCODER_DISCONNECTED','ENCODER_CONNECTED','PROCESSING_REPLAY') THEN v_next:='REPLAY_FAILED';v_transitioned:=true;END IF;
    ELSE v_transitioned:=false;
  END CASE;
  IF NOT v_transitioned THEN
    UPDATE public.stream_provider_event_logs SET processed_at=v_now WHERE id=v_log_id;
    RETURN jsonb_build_object('received',true,'ignored',true,'lifecycle_status',v_stream.lifecycle_status);
  END IF;
  v_replay_url:=CASE WHEN p_event_type='recording.ready' THEN nullif(p_payload->>'replay_url','') ELSE v_stream.vod_replay_asset_url END;
  UPDATE public.live_streams SET
    lifecycle_status=v_next,
    status=CASE WHEN v_next='LIVE' THEN 'live' WHEN v_next IN ('PROCESSING_REPLAY','REPLAY_AVAILABLE','REPLAY_FAILED') THEN 'ended' ELSE status END,
    encoder_connected_at=CASE WHEN p_event_type='stream.connected' THEN v_now ELSE encoder_connected_at END,
    actual_started_at=CASE WHEN p_event_type='stream.active' AND actual_started_at IS NULL THEN v_now ELSE actual_started_at END,
    actual_ended_at=CASE WHEN p_event_type IN ('stream.ended','recording.ready','recording.failed') THEN coalesce(actual_ended_at,v_now) ELSE actual_ended_at END,
    reconnect_grace_expires_at=CASE WHEN p_event_type='stream.disconnected' THEN v_now+interval '5 minutes'
      WHEN p_event_type IN ('stream.connected','stream.active','stream.ended','recording.ready','recording.failed') THEN NULL ELSE reconnect_grace_expires_at END,
    vod_replay_asset_url=coalesce(v_replay_url,vod_replay_asset_url),
    playback_url=CASE WHEN p_event_type='recording.ready' THEN coalesce(v_replay_url,playback_url) ELSE playback_url END,
    updated_at=v_now WHERE id=v_stream.id;
  IF p_event_type IN ('stream.active','stream.ended','recording.ready','recording.failed') THEN
    UPDATE public.screenings SET
      lifecycle=CASE WHEN p_event_type='stream.active' THEN 'live' WHEN p_event_type='stream.ended' THEN 'ended'
        WHEN p_event_type='recording.ready' THEN 'replay' WHEN p_event_type='recording.failed' THEN 'ended' ELSE lifecycle END,
      live_started_at=CASE WHEN p_event_type='stream.active' THEN coalesce(live_started_at,v_now) ELSE live_started_at END,
      live_ended_at=CASE WHEN p_event_type IN ('stream.ended','recording.ready','recording.failed') THEN coalesce(live_ended_at,v_now) ELSE live_ended_at END,
      live_recording_status=CASE WHEN p_event_type='recording.ready' THEN 'ready' WHEN p_event_type='recording.failed' THEN 'failed' ELSE live_recording_status END,
      live_replay_ready_at=CASE WHEN p_event_type='recording.ready' THEN coalesce(live_replay_ready_at,v_now) ELSE live_replay_ready_at END,
      updated_at=v_now WHERE id=(v_stream.metadata->>'screening_id')::uuid AND tenant_id=v_stream.tenant_id;
  END IF;
  IF p_event_type IN ('stream.ended','recording.ready','recording.failed') THEN
    UPDATE public.content c SET
      type='vod',status='draft',
      video_url=CASE WHEN p_event_type='recording.ready' THEN coalesce(v_replay_url,c.video_url) ELSE c.video_url END,
      metadata=coalesce(c.metadata,'{}'::jsonb) || jsonb_build_object(
        'content_context','vod','release_strategy','on_demand',
        'replay_from_live',jsonb_build_object(
          'source_screening_id',v_stream.metadata->>'screening_id',
          'source_stream_id',v_stream.id,'provider',p_provider_key,
          'provider_asset_id',p_payload->>'provider_asset_id',
          'recording_status',CASE WHEN p_event_type='recording.ready' THEN 'ready'
            WHEN p_event_type='recording.failed' THEN 'failed' ELSE 'processing' END,
          'ended_at',coalesce(v_stream.actual_ended_at,v_now)
        )
      ),updated_at=v_now
    WHERE c.id=(SELECT sc.content_id FROM public.screenings sc
      WHERE sc.id=(v_stream.metadata->>'screening_id')::uuid AND sc.tenant_id=v_stream.tenant_id)
      AND c.tenant_id=v_stream.tenant_id AND c.creator_id=v_stream.creator_id;
  END IF;
  IF p_event_type='recording.ready' THEN
    UPDATE public.tickets t SET valid_until=v_now+make_interval(hours=>coalesce((
      SELECT sc.replay_access_hours FROM public.screenings sc WHERE sc.id=(v_stream.metadata->>'screening_id')::uuid
        AND sc.replay_access_model='INCLUDED_WITH_TICKET'),87600))
    WHERE t.stream_id=v_stream.id AND t.ticket_type='live' AND t.revoked_at IS NULL
      AND EXISTS(SELECT 1 FROM public.screenings sc WHERE sc.id=(v_stream.metadata->>'screening_id')::uuid
        AND sc.replay_access_model='INCLUDED_WITH_TICKET');
  END IF;
  UPDATE public.stream_provider_event_logs SET processed_at=v_now WHERE id=v_log_id;
  RETURN jsonb_build_object('received',true,'duplicate',false,'lifecycle_status',v_next,'stream_id',v_stream.id);
END $function$

REVOKE EXECUTE ON FUNCTION public.apply_stream_provider_event(text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stream_provider_event(text,text,text,text,jsonb) TO service_role;
