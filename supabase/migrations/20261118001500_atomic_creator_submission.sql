CREATE OR REPLACE FUNCTION public.create_creator_submission(_application jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_kyc text;
  v_tenant uuid;
  v_title text;
  v_project_type text;
  v_slug text;
  v_content uuid;
  v_submission uuid;
  v_duration integer;
  v_release_year integer;
  v_rights text[];
  v_genres text[];
  v_cast jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication_required' USING errcode='28000'; END IF;
  IF jsonb_typeof(_application) <> 'object' THEN RAISE EXCEPTION 'invalid_application' USING errcode='22023'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id=v_user;
  SELECT kyc_status INTO v_kyc FROM public.profiles WHERE user_id=v_user;
  IF v_kyc <> 'verified' THEN RAISE EXCEPTION 'verified_identity_required' USING errcode='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=v_user AND role='creator'::public.app_role) THEN
    RAISE EXCEPTION 'creator_role_required' USING errcode='42501';
  END IF;

  v_title := trim(coalesce(_application->>'project_title',''));
  v_project_type := coalesce(_application->>'project_type','movie');
  IF length(v_title)<1 OR length(v_title)>200 THEN RAISE EXCEPTION 'invalid_project_title' USING errcode='22023'; END IF;
  IF v_project_type NOT IN ('movie','series') THEN RAISE EXCEPTION 'unsupported_project_type' USING errcode='22023'; END IF;

  SELECT id INTO v_tenant FROM public.tenants WHERE owner_id=v_user AND type='creator'::public.tenant_type AND coalesce(is_active,true)=true ORDER BY created_at LIMIT 1;
  IF v_tenant IS NULL THEN
    INSERT INTO public.tenants(name,slug,type,owner_id,is_active)
    VALUES (
      coalesce(nullif(trim(_application->>'company_name'),''),v_title || ' Studio'),
      left(regexp_replace(lower(coalesce(nullif(trim(_application->>'company_name'),''),v_title)), '[^a-z0-9]+','-','g'),48)
        || '-' || substr(replace(v_user::text,'-',''),1,8),
      'creator'::public.tenant_type,v_user,true
    ) RETURNING id INTO v_tenant;
  END IF;

  v_slug := left(regexp_replace(lower(v_title),'[^a-z0-9]+','-','g'),160) || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,12);
  v_duration := nullif(_application->>'duration_minutes','')::integer;
  IF v_duration IS NOT NULL AND (v_duration<1 OR v_duration>999) THEN RAISE EXCEPTION 'invalid_duration' USING errcode='22023'; END IF;
  v_release_year := nullif(_application->>'release_year','')::integer;
  IF v_release_year IS NOT NULL AND (v_release_year<1900 OR v_release_year>extract(year from now())::integer+5) THEN
    RAISE EXCEPTION 'invalid_release_year' USING errcode='22023';
  END IF;

  SELECT coalesce(array_agg(value),ARRAY[]::text[]) INTO v_genres
  FROM jsonb_array_elements_text(coalesce(_application->'genres','[]'::jsonb)) AS g(value)
  WHERE length(value)<=60;
  SELECT coalesce(array_agg(value),ARRAY[]::text[]) INTO v_rights
  FROM jsonb_array_elements_text(coalesce(_application->'rights_territories','[]'::jsonb)) AS r(value)
  WHERE length(value)<=80;
  v_cast := CASE WHEN jsonb_typeof(_application->'cast_crew')='array' THEN _application->'cast_crew' ELSE '[]'::jsonb END;

  INSERT INTO public.content(
    tenant_id,creator_id,title,slug,description,type,status,poster_url,trailer_url,
    video_url,duration,genres,release_date,cast_crew,metadata
  ) VALUES (
    v_tenant,v_user,v_title,v_slug,nullif(_application->>'description',''),
    v_project_type::public.content_type,'draft',
    nullif(_application->>'poster_url',''),nullif(_application->>'trailer_url',''),
    nullif(_application->>'video_url',''),CASE WHEN v_duration IS NULL THEN NULL ELSE v_duration*60 END,
    v_genres,CASE WHEN v_release_year IS NULL THEN NULL ELSE make_date(v_release_year,1,1) END,
    v_cast,jsonb_build_object('submission_source','creator_studio')
  ) RETURNING id INTO v_content;

  INSERT INTO public.filmmaker_submissions(
    tenant_id,submitter_name,submitter_email,company_name,project_title,project_type,description,
    genres,duration_minutes,release_year,poster_url,trailer_url,screener_url,video_url,budget_range,
    distribution_rights,status,content_id,premiere_date,cast_crew,rights_territories,prior_screenings
  ) VALUES (
    v_tenant,left(trim(coalesce(_application->>'submitter_name','')),100),v_email,
    nullif(trim(_application->>'company_name'),''),v_title,v_project_type,
    nullif(_application->>'description',''),v_genres,v_duration,v_release_year,
    nullif(_application->>'poster_url',''),nullif(_application->>'trailer_url',''),
    nullif(_application->>'screener_url',''),nullif(_application->>'video_url',''),
    nullif(_application->>'budget_range',''),nullif(_application->>'distribution_rights',''),
    'pending',v_content,nullif(_application->>'premiere_date','')::date,
    v_cast,v_rights,nullif(_application->>'prior_screenings','')
  ) RETURNING id INTO v_submission;

  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,new_data)
  VALUES(v_user,'creator.submission.created','filmmaker_submission',v_submission,
    jsonb_build_object('content_id',v_content,'tenant_id',v_tenant,'project_type',v_project_type));

  RETURN jsonb_build_object('submission_id',v_submission,'content_id',v_content,'tenant_id',v_tenant,'status','pending');
END
$function$;

REVOKE EXECUTE ON FUNCTION public.create_creator_submission(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_creator_submission(jsonb) TO authenticated, service_role;