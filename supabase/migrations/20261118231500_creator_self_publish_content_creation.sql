create or replace function public.create_creator_submission(_application jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $function$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_kyc text;
  v_tenant uuid;
  v_title text;
  v_type text;
  v_slug text;
  v_content uuid;
  v_duration integer;
  v_year integer;
  v_master text;
  v_genres text[];
  v_rights text[];
  v_cast jsonb;
  v_metadata jsonb;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='28000'; end if;
  if jsonb_typeof(_application) <> 'object' then raise exception 'invalid_application' using errcode='22023'; end if;
  select email into v_email from auth.users where id=v_user;
  select kyc_status into v_kyc from public.profiles where user_id=v_user;
  if v_kyc <> 'verified' then raise exception 'verified_identity_required' using errcode='42501'; end if;
  if not exists(select 1 from public.user_roles where user_id=v_user and role='creator'::public.app_role)
     or not public.is_approved_creator(v_user) then
    raise exception 'approved_creator_required' using errcode='42501';
  end if;
  v_title := trim(coalesce(_application->>'project_title',''));
  v_type := coalesce(_application->>'project_type','movie');
  if length(v_title) not between 1 and 200 then raise exception 'invalid_project_title' using errcode='22023'; end if;
  if v_type not in ('movie','series','episode','trailer','short','live','vod') then
    raise exception 'unsupported_content_type' using errcode='22023';
  end if;
  v_duration := nullif(_application->>'duration_minutes','')::integer;
  if v_duration is not null and (v_duration < 1 or v_duration > 999) then raise exception 'invalid_duration' using errcode='22023'; end if;
  v_year := nullif(_application->>'release_year','')::integer;
  if v_year is not null and (v_year < 1900 or v_year > extract(year from now())::integer + 5) then raise exception 'invalid_release_year' using errcode='22023'; end if;
  if jsonb_typeof(coalesce(_application->'genres','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(_application->'genres','[]'::jsonb)) > 30 then raise exception 'invalid_genres' using errcode='22023'; end if;
  if jsonb_typeof(coalesce(_application->'rights_territories','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(_application->'rights_territories','[]'::jsonb)) > 250 then raise exception 'invalid_rights_territories' using errcode='22023'; end if;
  if jsonb_typeof(coalesce(_application->'cast_crew','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(_application->'cast_crew','[]'::jsonb)) > 500 then raise exception 'invalid_cast_crew' using errcode='22023'; end if;
  v_master := nullif(trim(_application->>'video_url'),'');
  if v_master is not null and (length(v_master)>512 or v_master not like v_user::text||'/masters/%'
    or not exists(select 1 from storage.objects o where o.bucket_id='creator-masters' and o.name=v_master
      and o.owner=v_user and o.archived_at is null and coalesce(o.is_delete_marker,false)=false)) then
    raise exception 'invalid_master_media' using errcode='22023';
  end if;
  if nullif(trim(_application->>'submitter_name'),'') is null
     or length(trim(_application->>'submitter_name')) not between 2 and 100 then raise exception 'invalid_creator_name' using errcode='22023'; end if;
  select coalesce(array_agg(value),array[]::text[]) into v_genres
    from jsonb_array_elements_text(coalesce(_application->'genres','[]'::jsonb)) g(value) where length(value)<=60;
  select coalesce(array_agg(value),array[]::text[]) into v_rights
    from jsonb_array_elements_text(coalesce(_application->'rights_territories','[]'::jsonb)) r(value) where length(value)<=80;
  v_cast := coalesce(_application->'cast_crew','[]'::jsonb);
  v_metadata := jsonb_build_object(
    'publishing_model','approved_creator_self_publish',
    'rights_declaration',nullif(_application->>'distribution_rights',''),
    'rights_territories',to_jsonb(v_rights),
    'budget_range',nullif(_application->>'budget_range',''),
    'premiere_date',nullif(_application->>'premiere_date',''),
    'prior_screenings',nullif(_application->>'prior_screenings',''),
    'release_year',v_year,
    'content_context',v_type
  );
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  select id into v_tenant from public.tenants where owner_id=v_user and type='creator'::public.tenant_type
    and coalesce(is_active,true)=true order by created_at limit 1;
  if v_tenant is null then
    insert into public.tenants(name,slug,type,owner_id,is_active)
    values(coalesce(nullif(trim(_application->>'company_name'),''),v_title||' Studio'),
      left(regexp_replace(lower(coalesce(nullif(trim(_application->>'company_name'),''),v_title)),'[^a-z0-9]+','-','g'),48)
      ||'-'||substr(replace(v_user::text,'-',''),1,8),'creator'::public.tenant_type,v_user,true)
    returning id into v_tenant;
  end if;
  v_slug := left(regexp_replace(lower(v_title),'[^a-z0-9]+','-','g'),160)||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,12);
  insert into public.content(tenant_id,creator_id,title,slug,description,type,status,poster_url,trailer_url,video_url,
    duration,genres,release_date,cast_crew,metadata)
  values(v_tenant,v_user,v_title,v_slug,nullif(_application->>'description',''),v_type::public.content_type,'draft',
    nullif(_application->>'poster_url',''),nullif(_application->>'trailer_url',''),v_master,
    case when v_duration is null then null else v_duration*60 end,v_genres,
    case when v_year is null then null else make_date(v_year,1,1) end,v_cast,v_metadata)
  returning id into v_content;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
  values(v_user,'creator.content.created','content',v_content,
    jsonb_build_object('tenant_id',v_tenant,'content_type',v_type,'publishing_model','approved_creator_self_publish'));
  return jsonb_build_object('content_id',v_content,'tenant_id',v_tenant,'status','draft','submission_id',null);
end;
$function$;