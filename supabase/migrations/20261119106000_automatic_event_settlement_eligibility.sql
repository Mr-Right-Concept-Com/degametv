CREATE OR REPLACE FUNCTION public.release_eligible_event_settlement_holds(p_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_count integer;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501'; END IF;
 WITH due AS (
  SELECT id FROM public.event_settlement_holds
  WHERE hold_status='held' AND release_at IS NOT NULL AND release_at<=now()
    AND event_ended_at IS NOT NULL AND event_ended_at<=now()
    AND delivery_confirmed_at IS NOT NULL
  ORDER BY release_at
  FOR UPDATE SKIP LOCKED
  LIMIT greatest(1,least(p_limit,2000))
 )
 UPDATE public.event_settlement_holds h
 SET hold_status='eligible',released_at=coalesce(h.released_at,now()),updated_at=now()
 FROM due WHERE h.id=due.id;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.release_eligible_event_settlement_holds(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_eligible_event_settlement_holds(integer) TO service_role;
