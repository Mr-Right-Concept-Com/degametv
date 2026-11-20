-- Settlement release is measured from the later of event completion and verified delivery.
-- This prevents a delayed replay/upload from becoming immediately withdrawable.
CREATE OR REPLACE FUNCTION public.guard_event_settlement_hold()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_creator uuid;
  v_tenant uuid;
  v_event_end timestamptz;
  v_delivered timestamptz;
  v_hours integer;
BEGIN
  IF (NEW.screening_id IS NOT NULL)::int + (NEW.live_stream_id IS NOT NULL)::int <> 1 THEN
    RAISE EXCEPTION 'exactly_one_event_required';
  END IF;

  IF NEW.screening_id IS NOT NULL THEN
    SELECT c.creator_id, s.tenant_id,
           coalesce(s.live_ended_at, s.screening_date, s.release_date),
           CASE
             WHEN s.event_type = 'live' THEN s.live_replay_ready_at
             WHEN c.video_url IS NOT NULL THEN now()
             ELSE NULL
           END,
           s.settlement_hold_hours
      INTO v_creator, v_tenant, v_event_end, v_delivered, v_hours
      FROM public.screenings s
      JOIN public.content c ON c.id = s.content_id
     WHERE s.id = NEW.screening_id;
  ELSE
    SELECT l.creator_id, l.tenant_id, l.actual_ended_at,
           CASE
             WHEN l.recording_enabled AND l.settlement_delivery_required
               THEN CASE WHEN l.vod_replay_asset_url IS NOT NULL THEN l.actual_ended_at ELSE NULL END
             ELSE l.actual_ended_at
           END,
           l.settlement_hold_hours
      INTO v_creator, v_tenant, v_event_end, v_delivered, v_hours
      FROM public.live_streams l
     WHERE l.id = NEW.live_stream_id;
  END IF;

  IF v_creator IS NULL OR v_creator <> NEW.creator_id OR v_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'settlement_event_owner_mismatch' USING ERRCODE = '42501';
  END IF;

  NEW.hold_hours := coalesce(v_hours, NEW.hold_hours, 48);
  IF NEW.hold_hours NOT BETWEEN 24 AND 72 THEN
    RAISE EXCEPTION 'settlement_hold_hours_out_of_range' USING ERRCODE = '23514';
  END IF;

  -- Event facts are authoritative; caller-supplied timestamps cannot accelerate release.
  NEW.event_ended_at := v_event_end;
  NEW.delivery_confirmed_at := v_delivered;
  NEW.release_at := CASE
    WHEN v_event_end IS NOT NULL AND v_event_end <= now() AND v_delivered IS NOT NULL
      THEN greatest(v_event_end, v_delivered) + make_interval(hours => NEW.hold_hours)
    ELSE NULL
  END;

  IF NEW.hold_status NOT IN ('paid', 'refunded', 'disputed', 'blocked') THEN
    NEW.hold_status := CASE
      WHEN NEW.release_at IS NOT NULL AND NEW.release_at <= now() THEN 'eligible'
      ELSE 'held'
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- A durable worker/cron invokes this function. It refreshes event evidence first,
-- then marks only matured, non-blocked holds eligible. It never initiates payouts.
CREATE OR REPLACE FUNCTION public.refresh_event_settlement_holds(p_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  IF p_limit < 1 OR p_limit > 5000 THEN
    RAISE EXCEPTION 'invalid_batch_limit' USING ERRCODE = '22023';
  END IF;

  FOR r IN
    SELECT id, screening_id, live_stream_id
      FROM public.event_settlement_holds
     WHERE hold_status = 'held'
     ORDER BY created_at
     LIMIT p_limit
     FOR UPDATE SKIP LOCKED
  LOOP
    -- Updating the evidence columns invokes the guard trigger, which reloads
    -- authoritative event state and recomputes release_at/hold_status.
    UPDATE public.event_settlement_holds
       SET event_ended_at = event_ended_at,
           delivery_confirmed_at = delivery_confirmed_at,
           updated_at = now()
     WHERE id = r.id;

    UPDATE public.event_settlement_holds
       SET hold_status = 'eligible', updated_at = now()
     WHERE id = r.id
       AND hold_status = 'held'
       AND release_at IS NOT NULL
       AND release_at <= now();

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_event_settlement_holds(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_event_settlement_holds(integer) TO service_role;
