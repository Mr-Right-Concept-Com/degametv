DO $migration$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.create_creator_submission(jsonb)'::regprocedure) INTO v_definition;
  IF v_definition IS NULL THEN RAISE EXCEPTION 'create_creator_submission function is missing'; END IF;
  v_definition := replace(v_definition,
    $old$  SELECT id INTO v_tenant FROM public.tenants WHERE owner_id=v_user AND type='creator'::public.tenant_type AND coalesce(is_active,true)=true ORDER BY created_at LIMIT 1;$old$,
    $new$  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  SELECT id INTO v_tenant FROM public.tenants WHERE owner_id=v_user AND type='creator'::public.tenant_type AND coalesce(is_active,true)=true ORDER BY created_at LIMIT 1;$new$);
  v_definition := replace(v_definition,
    $old$  SELECT coalesce(array_agg(value),ARRAY[]::text[]) INTO v_genres$old$,
    $new$  IF nullif(trim(_application->>'submitter_name'),'') IS NULL OR length(trim(_application->>'submitter_name')) < 2 OR length(trim(_application->>'submitter_name')) > 100 THEN RAISE EXCEPTION 'invalid_submitter_name' USING errcode='22023'; END IF;
  IF jsonb_typeof(coalesce(_application->'genres','[]'::jsonb)) <> 'array' OR jsonb_array_length(coalesce(_application->'genres','[]'::jsonb)) > 30 THEN RAISE EXCEPTION 'invalid_genres' USING errcode='22023'; END IF;
  IF jsonb_typeof(coalesce(_application->'rights_territories','[]'::jsonb)) <> 'array' OR jsonb_array_length(coalesce(_application->'rights_territories','[]'::jsonb)) > 250 THEN RAISE EXCEPTION 'invalid_rights_territories' USING errcode='22023'; END IF;
  IF jsonb_typeof(coalesce(_application->'cast_crew','[]'::jsonb)) <> 'array' OR jsonb_array_length(coalesce(_application->'cast_crew','[]'::jsonb)) > 500 THEN RAISE EXCEPTION 'invalid_cast_crew' USING errcode='22023'; END IF;
  SELECT coalesce(array_agg(value),ARRAY[]::text[]) INTO v_genres$new$);
  IF position('pg_advisory_xact_lock' in v_definition)=0 OR position('invalid_submitter_name' in v_definition)=0 THEN
    RAISE EXCEPTION 'creator submission hardening patch did not match expected function source';
  END IF;
  EXECUTE v_definition;
END
$migration$;
