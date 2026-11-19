-- Allow fan contributions on standalone VOD/content as well as scheduled events.
ALTER TABLE public.event_contributions ADD COLUMN IF NOT EXISTS content_id uuid REFERENCES public.content(id) ON DELETE CASCADE;
ALTER TABLE public.event_settlement_holds ADD COLUMN IF NOT EXISTS content_id uuid REFERENCES public.content(id) ON DELETE CASCADE;

ALTER TABLE public.event_contributions DROP CONSTRAINT IF EXISTS event_contributions_check;
ALTER TABLE public.event_contributions DROP CONSTRAINT IF EXISTS event_contributions_event_target_check;
ALTER TABLE public.event_contributions ADD CONSTRAINT event_contributions_event_target_check
  CHECK ((screening_id IS NOT NULL)::int + (live_stream_id IS NOT NULL)::int + (content_id IS NOT NULL)::int = 1);

ALTER TABLE public.event_settlement_holds DROP CONSTRAINT IF EXISTS event_settlement_holds_check;
ALTER TABLE public.event_settlement_holds DROP CONSTRAINT IF EXISTS event_settlement_holds_event_target_check;
ALTER TABLE public.event_settlement_holds ADD CONSTRAINT event_settlement_holds_event_target_check
  CHECK ((screening_id IS NOT NULL)::int + (live_stream_id IS NOT NULL)::int + (content_id IS NOT NULL)::int = 1);

CREATE OR REPLACE FUNCTION public.guard_event_settlement_hold()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE
 v_creator uuid; v_tenant uuid; v_event_end timestamptz; v_delivered timestamptz;
 v_hours integer; v_event_type text; v_stream_id uuid;
BEGIN
 IF NEW.live_stream_id IS NOT NULL THEN
  SELECT l.creator_id,l.tenant_id,l.actual_ended_at,l.settlement_hold_hours
   INTO v_creator,v_tenant,v_event_end,v_hours
   FROM public.live_streams l WHERE l.id=NEW.live_stream_id;
  IF EXISTS(SELECT 1 FROM public.live_streams l WHERE l.id=NEW.live_stream_id AND l.recording_enabled AND l.settlement_delivery_required) THEN
   SELECT s.live_replay_ready_at INTO v_delivered
    FROM public.live_streams l JOIN public.screenings s
      ON s.id=CASE WHEN coalesce(l.metadata->>'screening_id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
 ELSIF NEW.screening_id IS NOT NULL THEN
  SELECT c.creator_id,s.tenant_id,coalesce(s.live_ended_at,s.screening_date,s.release_date),
   s.live_replay_ready_at,s.settlement_hold_hours,s.event_type
   INTO v_creator,v_tenant,v_event_end,v_delivered,v_hours,v_event_type
   FROM public.screenings s JOIN public.content c ON c.id=s.content_id WHERE s.id=NEW.screening_id;
  IF v_event_type='live' THEN
   SELECT l.id INTO v_stream_id FROM public.live_streams l
    WHERE l.tenant_id=v_tenant AND l.metadata->>'screening_id'=NEW.screening_id::text
    ORDER BY l.created_at DESC LIMIT 1;
   IF v_stream_id IS NOT NULL THEN
    SELECT l.actual_ended_at,l.settlement_hold_hours
     INTO v_event_end,v_hours FROM public.live_streams l WHERE l.id=v_stream_id;
    IF EXISTS(SELECT 1 FROM public.live_streams l WHERE l.id=v_stream_id AND l.recording_enabled AND l.settlement_delivery_required AND l.vod_replay_asset_url IS NOT NULL) THEN
     SELECT live_replay_ready_at INTO v_delivered FROM public.screenings WHERE id=NEW.screening_id;
    ELSE
     SELECT actual_ended_at INTO v_delivered FROM public.live_streams WHERE id=v_stream_id;
    END IF;
   END IF;
  END IF;
 ELSE
  SELECT c.creator_id,c.tenant_id,now(),now(),48
   INTO v_creator,v_tenant,v_event_end,v_delivered,v_hours
   FROM public.content c WHERE c.id=NEW.content_id AND c.status='published';
 END IF;
 IF v_creator IS NULL OR v_creator<>NEW.creator_id OR v_tenant<>NEW.tenant_id THEN
  RAISE EXCEPTION 'settlement_event_owner_mismatch' USING ERRCODE='42501';
 END IF;
 IF NEW.hold_hours IS NULL OR NEW.hold_hours=48 THEN NEW.hold_hours:=coalesce(v_hours,48); END IF;
 -- Never trust timestamps supplied by the caller; derive both from authoritative event/media state.
 NEW.event_ended_at:=v_event_end;
 NEW.delivery_confirmed_at:=v_delivered;
 NEW.release_at:=CASE WHEN NEW.event_ended_at IS NOT NULL AND NEW.delivery_confirmed_at IS NOT NULL
   THEN NEW.delivery_confirmed_at + make_interval(hours=>NEW.hold_hours) ELSE NULL END;
 IF NEW.release_at IS NULL THEN NEW.hold_status:='held'; ELSIF NEW.release_at<=now() THEN NEW.hold_status:='eligible'; ELSE NEW.hold_status:='held'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.create_event_contribution_settlement_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_creator uuid; v_tenant uuid; v_fee_rate numeric:=0; v_fee_minor bigint:=0; v_hold_hours integer:=48;
BEGIN
 IF NEW.status IS DISTINCT FROM 'paid' THEN RETURN NEW; END IF;
 IF NEW.screening_id IS NOT NULL THEN
  SELECT c.creator_id,s.tenant_id,s.settlement_hold_hours INTO v_creator,v_tenant,v_hold_hours
   FROM public.screenings s JOIN public.content c ON c.id=s.content_id WHERE s.id=NEW.screening_id;
 ELSIF NEW.live_stream_id IS NOT NULL THEN
  SELECT l.creator_id,l.tenant_id,l.settlement_hold_hours INTO v_creator,v_tenant,v_hold_hours
   FROM public.live_streams l WHERE l.id=NEW.live_stream_id;
 ELSE
  SELECT creator_id,tenant_id INTO v_creator,v_tenant FROM public.content WHERE id=NEW.content_id AND status='published';
 END IF;
 IF v_creator IS NULL OR v_creator<>NEW.creator_id OR v_tenant<>NEW.tenant_id THEN
  RAISE EXCEPTION 'contribution_event_owner_mismatch' USING ERRCODE='42501';
 END IF;
 SELECT coalesce((setting_value->>'creator')::numeric,0)
  INTO v_fee_rate FROM public.platform_settings WHERE setting_key='commission_rates';
 IF v_fee_rate<0 OR v_fee_rate>0.5 THEN RAISE EXCEPTION 'creator_commission_policy_invalid'; END IF;
 v_fee_minor:=round(NEW.amount_minor*v_fee_rate);
 INSERT INTO public.event_settlement_holds(
  tenant_id,creator_id,screening_id,live_stream_id,content_id,source_type,source_id,
  currency,gross_amount_minor,net_amount_minor,hold_hours
 ) VALUES (
  NEW.tenant_id,NEW.creator_id,NEW.screening_id,NEW.live_stream_id,NEW.content_id,
  NEW.contribution_type,NEW.id,NEW.currency,NEW.amount_minor,
  greatest(0,NEW.amount_minor-v_fee_minor),coalesce(v_hold_hours,48)
 ) ON CONFLICT(source_type,source_id) DO NOTHING;
 RETURN NEW;
END;
$$;

        THEN (l.metadata->>'screening_id')::uuid ELSE NULL END
    WHERE l.id=NEW.live_stream_id AND l.vod_replay_asset_url IS NOT NULL;
  ELSE
   v_delivered:=v_event_end;
  END IF;
 ELSIF NEW.screening_id IS NOT NULL THEN
  SELECT c.creator_id,s.tenant_id,coalesce(s.live_ended_at,s.screening_date,s.release_date),
   s.live_replay_ready_at,s.settlement_hold_hours,s.event_type
   INTO v_creator,v_tenant,v_event_end,v_delivered,v_hours,v_event_type
   FROM public.screenings s JOIN public.content c ON c.id=s.content_id WHERE s.id=NEW.screening_id;
  IF v_event_type='live' THEN
   SELECT l.id INTO v_stream_id FROM public.live_streams l
    WHERE l.tenant_id=v_tenant AND l.metadata->>'screening_id'=NEW.screening_id::text
    ORDER BY l.created_at DESC LIMIT 1;
   IF v_stream_id IS NOT NULL THEN
    SELECT l.actual_ended_at,
     CASE WHEN l.recording_enabled AND l.settlement_delivery_required
       THEN CASE WHEN l.vod_replay_asset_url IS NOT NULL THEN l.actual_ended_at ELSE NULL END
       ELSE l.actual_ended_at END,
     l.settlement_hold_hours
     INTO v_event_end,v_delivered,v_hours FROM public.live_streams l WHERE l.id=v_stream_id;
   END IF;
  END IF;
 ELSE
  SELECT c.creator_id,c.tenant_id,now(),now(),48
   INTO v_creator,v_tenant,v_event_end,v_delivered,v_hours
   FROM public.content c WHERE c.id=NEW.content_id AND c.status='published';
 END IF;
 IF v_creator IS NULL OR v_creator<>NEW.creator_id OR v_tenant<>NEW.tenant_id THEN
  RAISE EXCEPTION 'settlement_event_owner_mismatch' USING ERRCODE='42501';
 END IF;
 IF NEW.hold_hours IS NULL OR NEW.hold_hours=48 THEN NEW.hold_hours:=coalesce(v_hours,48); END IF;
 -- Never trust timestamps supplied by the caller; derive both from authoritative event/media state.
 NEW.event_ended_at:=v_event_end;
 NEW.delivery_confirmed_at:=v_delivered;
 NEW.release_at:=CASE WHEN NEW.event_ended_at IS NOT NULL AND NEW.event_ended_at<=now() AND NEW.delivery_confirmed_at IS NOT NULL
   THEN NEW.event_ended_at + make_interval(hours=>NEW.hold_hours) ELSE NULL END;
 IF NEW.release_at IS NULL THEN NEW.hold_status:='held'; ELSIF NEW.release_at<=now() THEN NEW.hold_status:='eligible'; ELSE NEW.hold_status:='held'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.create_event_contribution_settlement_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_creator uuid; v_tenant uuid; v_fee_rate numeric:=0; v_fee_minor bigint:=0; v_hold_hours integer:=48;
BEGIN
 IF NEW.status IS DISTINCT FROM 'paid' THEN RETURN NEW; END IF;
 IF NEW.screening_id IS NOT NULL THEN
  SELECT c.creator_id,s.tenant_id,s.settlement_hold_hours INTO v_creator,v_tenant,v_hold_hours
   FROM public.screenings s JOIN public.content c ON c.id=s.content_id WHERE s.id=NEW.screening_id;
 ELSIF NEW.live_stream_id IS NOT NULL THEN
  SELECT l.creator_id,l.tenant_id,l.settlement_hold_hours INTO v_creator,v_tenant,v_hold_hours
   FROM public.live_streams l WHERE l.id=NEW.live_stream_id;
 ELSE
  SELECT creator_id,tenant_id INTO v_creator,v_tenant FROM public.content WHERE id=NEW.content_id AND status='published';
 END IF;
 IF v_creator IS NULL OR v_creator<>NEW.creator_id OR v_tenant<>NEW.tenant_id THEN
  RAISE EXCEPTION 'contribution_event_owner_mismatch' USING ERRCODE='42501';
 END IF;
 SELECT coalesce((setting_value->>'creator')::numeric,0)
  INTO v_fee_rate FROM public.platform_settings WHERE setting_key='commission_rates';
 IF v_fee_rate<0 OR v_fee_rate>0.5 THEN RAISE EXCEPTION 'creator_commission_policy_invalid'; END IF;
 v_fee_minor:=round(NEW.amount_minor*v_fee_rate);
 INSERT INTO public.event_settlement_holds(
  tenant_id,creator_id,screening_id,live_stream_id,content_id,source_type,source_id,
  currency,gross_amount_minor,net_amount_minor,hold_hours
 ) VALUES (
  NEW.tenant_id,NEW.creator_id,NEW.screening_id,NEW.live_stream_id,NEW.content_id,
  NEW.contribution_type,NEW.id,NEW.currency,NEW.amount_minor,
  greatest(0,NEW.amount_minor-v_fee_minor),coalesce(v_hold_hours,48)
 ) ON CONFLICT(source_type,source_id) DO NOTHING;
 RETURN NEW;
END;
$$;
