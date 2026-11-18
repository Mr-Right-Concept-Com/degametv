-- DeGameTV Creator OS: additive lifecycle, pricing and provider-event hardening.
-- Existing content/screenings/live_streams/tickets remain canonical. No parallel content or entitlement tables.
DO $$ BEGIN
  CREATE TYPE public.broadcast_lifecycle_status AS ENUM (
    'DRAFT','SCHEDULED','WAITING_FOR_ENCODER','ENCODER_CONNECTED','LIVE',
    'ENCODER_DISCONNECTED','ENDING','PROCESSING_REPLAY','REPLAY_AVAILABLE',
    'PUBLISHED_VOD','ARCHIVED','PROVISIONING_FAILED','REPLAY_FAILED','CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.content_preset_type AS ENUM (
    'FILM','SERIES','EPISODE','SHORT','TRAILER','MUSIC_VIDEO','PODCAST',
    'DOCUMENTARY','EDUCATIONAL','GAMING','SPORTS','RECORDED_EVENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS preset_type public.content_preset_type,
  ADD COLUMN IF NOT EXISTS dynamic_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.content SET preset_type = CASE
  WHEN type IN ('movie','film') THEN 'FILM'::public.content_preset_type
  WHEN type='series' THEN 'SERIES'::public.content_preset_type
  WHEN type='episode' THEN 'EPISODE'::public.content_preset_type
  WHEN type='short' THEN 'SHORT'::public.content_preset_type
  WHEN type='trailer' THEN 'TRAILER'::public.content_preset_type
  WHEN type='live' THEN 'RECORDED_EVENT'::public.content_preset_type
  ELSE 'FILM'::public.content_preset_type END
WHERE preset_type IS NULL;

ALTER TABLE public.screenings
  ADD COLUMN IF NOT EXISTS access_model text NOT NULL DEFAULT 'TICKETED',
  ADD COLUMN IF NOT EXISTS auto_convert_to_vod boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS replay_access_model text NOT NULL DEFAULT 'INCLUDED_WITH_TICKET';

DO $$ BEGIN
  ALTER TABLE public.screenings ADD CONSTRAINT screenings_access_model_check
    CHECK (access_model IN ('FREE','TICKETED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.screenings ADD CONSTRAINT screenings_replay_access_model_check
    CHECK (replay_access_model IN ('INCLUDED_WITH_TICKET','SEPARATE_PRICE','FREE_REPLAY'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.screenings ADD CONSTRAINT screenings_creator_prices_nonnegative
    CHECK (coalesce(live_price_ngn,0)>=0 AND coalesce(live_price_usd,0)>=0
      AND coalesce(replay_price_ngn,0)>=0 AND coalesce(replay_price_usd,0)>=0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS lifecycle_status public.broadcast_lifecycle_status NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN IF NOT EXISTS provider_stream_id text,
  ADD COLUMN IF NOT EXISTS encoder_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconnect_grace_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS vod_replay_asset_url text;

CREATE INDEX IF NOT EXISTS live_streams_provider_reference_idx
  ON public.live_streams ((metadata->>'provider'),(metadata->>'provider_reference'));
CREATE INDEX IF NOT EXISTS live_streams_screening_idx
  ON public.live_streams ((metadata->>'screening_id'));

-- The canonical tickets table is already the entitlement ledger (live/replay/combo).
-- This event log is private and provides provider-scoped idempotency.
CREATE TABLE IF NOT EXISTS public.stream_provider_event_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  stream_id uuid REFERENCES public.live_streams(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(provider_key,provider_event_id)
);
ALTER TABLE public.stream_provider_event_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stream_provider_event_logs FROM anon, authenticated, public;
GRANT SELECT,INSERT,UPDATE ON public.stream_provider_event_logs TO service_role;

CREATE OR REPLACE FUNCTION public.apply_stream_provider_event(
  p_provider_key text,
  p_provider_reference text,
  p_event_id text,
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_stream public.live_streams%rowtype;
  v_log_id uuid;
  v_next public.broadcast_lifecycle_status;
  v_now timestamptz := now();
  v_replay_url text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501';
  END IF;
  IF nullif(trim(p_provider_key),'') IS NULL OR nullif(trim(p_provider_reference),'') IS NULL
     OR nullif(trim(p_event_id),'') IS NULL OR length(p_event_id)>255 THEN
    RAISE EXCEPTION 'invalid_provider_event';
  END IF;

  SELECT * INTO v_stream FROM public.live_streams
   WHERE metadata->>'provider'=p_provider_key
     AND metadata->>'provider_reference'=p_provider_reference
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'provider_stream_not_found'; END IF;

  INSERT INTO public.stream_provider_event_logs(provider_key,provider_event_id,event_type,stream_id,payload)
  VALUES(p_provider_key,p_event_id,p_event_type,v_stream.id,coalesce(p_payload,'{}'::jsonb))
  ON CONFLICT(provider_key,provider_event_id) DO NOTHING
  RETURNING id INTO v_log_id;
  IF v_log_id IS NULL THEN
    RETURN jsonb_build_object('received',true,'duplicate',true,'lifecycle_status',v_stream.lifecycle_status);
  END IF;

  v_next := v_stream.lifecycle_status;
  CASE p_event_type
    WHEN 'stream.connected' THEN
      IF v_next IN ('WAITING_FOR_ENCODER','ENCODER_DISCONNECTED') THEN v_next:='ENCODER_CONNECTED'; END IF;
    WHEN 'stream.active' THEN
      IF v_next IN ('WAITING_FOR_ENCODER','ENCODER_CONNECTED','ENCODER_DISCONNECTED') THEN v_next:='LIVE'; END IF;
    WHEN 'stream.disconnected' THEN
      IF v_next IN ('LIVE','ENCODER_CONNECTED') THEN v_next:='ENCODER_DISCONNECTED'; END IF;
    WHEN 'stream.ended' THEN
      IF v_next IN ('LIVE','ENCODER_DISCONNECTED','ENCODER_CONNECTED','ENDING') THEN v_next:='PROCESSING_REPLAY'; END IF;
    WHEN 'recording.ready' THEN
      IF v_next='PROCESSING_REPLAY' THEN v_next:='REPLAY_AVAILABLE'; END IF;
    WHEN 'recording.failed' THEN
      IF v_next='PROCESSING_REPLAY' THEN v_next:='REPLAY_FAILED'; END IF;
    ELSE
      UPDATE public.stream_provider_event_logs SET processed_at=v_now
       WHERE id=v_log_id;
      RETURN jsonb_build_object('received',true,'ignored',true,'lifecycle_status',v_next);
  END CASE;

  v_replay_url := CASE WHEN p_event_type='recording.ready'
    THEN nullif(p_payload->>'replay_url','') ELSE v_stream.vod_replay_asset_url END;

  UPDATE public.live_streams SET
    lifecycle_status=v_next,
    status=CASE WHEN v_next='LIVE' THEN 'live'
                WHEN v_next='PROCESSING_REPLAY' THEN 'ended'
                ELSE status END,
    encoder_connected_at=CASE WHEN p_event_type='stream.connected' THEN v_now ELSE encoder_connected_at END,
    actual_started_at=CASE WHEN p_event_type='stream.active' AND actual_started_at IS NULL THEN v_now ELSE actual_started_at END,
    actual_ended_at=CASE WHEN p_event_type='stream.ended' THEN v_now ELSE actual_ended_at END,
    reconnect_grace_expires_at=CASE
      WHEN p_event_type='stream.disconnected' THEN v_now+interval '5 minutes'
      WHEN p_event_type IN ('stream.connected','stream.active','stream.ended') THEN NULL
      ELSE reconnect_grace_expires_at END,
    vod_replay_asset_url=coalesce(v_replay_url,vod_replay_asset_url),
    playback_url=CASE WHEN p_event_type='recording.ready' THEN coalesce(v_replay_url,playback_url) ELSE playback_url END,
    updated_at=v_now
  WHERE id=v_stream.id;

  IF p_event_type IN ('recording.ready','recording.failed') THEN
    UPDATE public.screenings SET
      live_recording_status=CASE WHEN p_event_type='recording.ready' THEN 'ready' ELSE 'failed' END,
      live_replay_ready_at=CASE WHEN p_event_type='recording.ready' THEN v_now ELSE NULL END,
      updated_at=v_now
    WHERE id=(v_stream.metadata->>'screening_id')::uuid
      AND tenant_id=v_stream.tenant_id;
  END IF;

  UPDATE public.stream_provider_event_logs SET processed_at=v_now WHERE id=v_log_id;
  RETURN jsonb_build_object('received',true,'duplicate',false,'lifecycle_status',v_next,'stream_id',v_stream.id);
END $$;
REVOKE ALL ON FUNCTION public.apply_stream_provider_event(text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stream_provider_event(text,text,text,text,jsonb) TO service_role;

-- Preserve the existing RPC and its ownership/KYC/publication checks, but allow an
-- explicit free event (both regional amounts zero). Negative values remain invalid.
DO $$
DECLARE v_definition text; v_updated text;
BEGIN
  SELECT pg_get_functiondef('public.create_creator_screening(uuid,timestamp with time zone,jsonb,text,text)'::regprocedure)
    INTO v_definition;
  IF v_definition IS NULL THEN RAISE EXCEPTION 'create_creator_screening RPC is missing'; END IF;
  v_updated := replace(v_definition,
    'if v_ngn is null or v_ngn<=0 or v_usd is null or v_usd<=0 then',
    'if v_ngn is null or v_ngn<0 or v_usd is null or v_usd<0 then');
  IF v_updated=v_definition AND position('v_ngn<0' in v_definition)=0 THEN
    RAISE EXCEPTION 'Could not safely update creator screening free-admission validation';
  END IF;
  EXECUTE v_updated;
  UPDATE public.screenings SET access_model=CASE
    WHEN coalesce(live_price_ngn,0)=0 AND coalesce(live_price_usd,0)=0 THEN 'FREE'
    ELSE 'TICKETED' END;
END $$;

-- Derive FREE/TICKETED from canonical prices so existing creator RPC inserts cannot
-- accidentally label a zero-priced event as ticketed.
CREATE OR REPLACE FUNCTION public.set_screening_access_model()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  NEW.access_model := CASE
    WHEN coalesce(NEW.live_price_ngn,0)=0 AND coalesce(NEW.live_price_usd,0)=0 THEN 'FREE'
    ELSE 'TICKETED' END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS screenings_access_model_from_price ON public.screenings;
CREATE TRIGGER screenings_access_model_from_price
BEFORE INSERT OR UPDATE OF live_price_ngn,live_price_usd ON public.screenings
FOR EACH ROW EXECUTE FUNCTION public.set_screening_access_model();


-- Preserve the adaptive preset metadata in the canonical content row. The existing
-- creator submission RPC remains the authenticated entry point.
CREATE OR REPLACE FUNCTION public.sync_content_preset_contract()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE v_preset text;
BEGIN
  NEW.dynamic_metadata := CASE
    WHEN jsonb_typeof(NEW.metadata->'dynamic_metadata')='object' THEN NEW.metadata->'dynamic_metadata'
    WHEN jsonb_typeof(NEW.dynamic_metadata)='object' THEN NEW.dynamic_metadata
    ELSE '{}'::jsonb END;
  v_preset := coalesce(nullif(NEW.dynamic_metadata->>'contentType',''), '');
  IF v_preset = '' THEN
    v_preset := CASE NEW.type::text
      WHEN 'movie' THEN 'FILM' WHEN 'film' THEN 'FILM'
      WHEN 'series' THEN 'SERIES' WHEN 'episode' THEN 'EPISODE'
      WHEN 'short' THEN 'SHORT' WHEN 'trailer' THEN 'TRAILER'
      WHEN 'live' THEN 'RECORDED_EVENT' ELSE 'FILM' END;
  END IF;
  IF v_preset IN ('FILM','SERIES','EPISODE','SHORT','TRAILER','MUSIC_VIDEO','PODCAST',
      'DOCUMENTARY','EDUCATIONAL','GAMING','SPORTS','RECORDED_EVENT') THEN
    NEW.preset_type := v_preset::public.content_preset_type;
  ELSE
    RAISE EXCEPTION 'unsupported_content_preset';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS content_preset_contract_sync ON public.content;
CREATE TRIGGER content_preset_contract_sync
BEFORE INSERT OR UPDATE OF type,metadata,dynamic_metadata,preset_type ON public.content
FOR EACH ROW EXECUTE FUNCTION public.sync_content_preset_contract();

DO $$
DECLARE v_definition text; v_updated text;
BEGIN
  SELECT pg_get_functiondef('public.create_creator_submission(jsonb)'::regprocedure) INTO v_definition;
  IF v_definition IS NULL THEN RAISE EXCEPTION 'create_creator_submission RPC is missing'; END IF;
  v_updated := replace(v_definition,
    '''submission_source'',''creator_studio''',
    '''submission_source'',''creator_studio'',''dynamic_metadata'',coalesce(_application->''dynamic_metadata'',''{}''::jsonb)');
  IF v_updated=v_definition AND position('dynamic_metadata' in v_definition)=0 THEN
    RAISE EXCEPTION 'Could not extend creator submission metadata contract safely';
  END IF;
  EXECUTE v_updated;
END $$;


-- Live event listings may use the platform's generic artwork treatment when a creator
-- has not uploaded a poster. VOD/premiere publishing keeps the existing artwork gate.
DO $$
DECLARE v_definition text; v_updated text;
BEGIN
  SELECT pg_get_functiondef('public.publish_creator_content(uuid)'::regprocedure) INTO v_definition;
  IF v_definition IS NULL THEN RAISE EXCEPTION 'publish_creator_content RPC is missing'; END IF;
  v_updated := replace(v_definition,
    'if v_content.poster_url is null then raise exception ''content_poster_required''; end if;',
    'if v_content.poster_url is null and v_content.type::text<>''live'' then raise exception ''content_poster_required''; end if;');
  IF v_updated=v_definition AND position('poster_url is null and v_content.type' in v_definition)=0 THEN
    RAISE EXCEPTION 'Could not safely relax poster requirement for live events';
  END IF;
  EXECUTE v_updated;
END $$;
