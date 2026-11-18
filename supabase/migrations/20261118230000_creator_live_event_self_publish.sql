create or replace function public.publish_creator_content(p_content_id uuid)
returns jsonb language plpgsql security definer set search_path=public,storage,pg_temp as $$
declare v_user uuid:=auth.uid(); v_content public.content%rowtype; v_has_master boolean:=false; v_has_screening boolean:=false;
begin
 if v_user is null or not public.is_approved_creator(v_user) or not exists(select 1 from public.user_roles where user_id=v_user and role='creator'::public.app_role) then raise exception 'approved_creator_required' using errcode='42501'; end if;
 select * into v_content from public.content where id=p_content_id and creator_id=v_user for update;
 if not found then raise exception 'content_not_found'; end if;
 if v_content.status not in ('draft','processing','scheduled') then raise exception 'content_not_publishable'; end if;
 if nullif(trim(v_content.title),'') is null then raise exception 'content_title_required'; end if;
 if v_content.poster_url is null then raise exception 'content_poster_required'; end if;
 if v_content.type in ('movie','episode','short','vod') then
  if v_content.video_url is null then raise exception 'content_master_required'; end if;
  select exists(select 1 from storage.objects o where o.bucket_id='creator-masters' and o.name=v_content.video_url and o.owner=v_user and o.archived_at is null and coalesce(o.is_delete_marker,false)=false) into v_has_master;
  if not v_has_master then raise exception 'master_media_missing'; end if;
 elsif v_content.type='trailer' then
  if v_content.video_url is null and v_content.trailer_url is null then raise exception 'trailer_asset_required'; end if;
  if v_content.video_url is not null then
   select exists(select 1 from storage.objects o where o.bucket_id='creator-masters' and o.name=v_content.video_url and o.owner=v_user and o.archived_at is null and coalesce(o.is_delete_marker,false)=false) into v_has_master;
   if not v_has_master then raise exception 'master_media_missing'; end if;
  end if;
 elsif v_content.type='live' then
  null;
 elsif v_content.type='series' then
  if jsonb_typeof(coalesce(v_content.metadata,'{}'::jsonb))<>'object' then raise exception 'invalid_series_metadata'; end if;
 else raise exception 'unsupported_content_type';
 end if;
 if coalesce(v_content.metadata->>'rights_declaration','')='' then raise exception 'rights_declaration_required'; end if;
 update public.content set status='published',updated_at=now() where id=p_content_id;
 update public.filmmaker_submissions set status='approved' where content_id=p_content_id and status in ('pending','approved');
 insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data) values(v_user,'creator.content.published','content',p_content_id,jsonb_build_object('tenant_id',v_content.tenant_id,'content_type',v_content.type,'publication_policy','verified_creator_self_publish','automated_validation',true));
 return jsonb_build_object('content_id',p_content_id,'status','published','share_path','/content/'||p_content_id::text);
end; $$;

create or replace function public.create_creator_screening(p_content_id uuid,p_screening_date timestamptz,p_location_pricing jsonb,p_event_type text,p_slug text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_content public.content%rowtype; v_slug text; v_screening uuid;
begin
 if v_user is null or not public.is_approved_creator(v_user) then raise exception 'approved_creator_required' using errcode='42501'; end if;
 select * into v_content from public.content where id=p_content_id and creator_id=v_user and status='published' for update;
 if not found then raise exception 'published_content_required'; end if;
 if p_event_type not in ('film','series','live') or (p_event_type='film' and v_content.type not in ('movie','film')) or (p_event_type='series' and v_content.type<>'series') or (p_event_type='live' and v_content.type<>'live') then raise exception 'content_event_type_mismatch'; end if;
 if p_screening_date is not null and p_screening_date<now()+interval '15 minutes' then raise exception 'screening_date_too_soon'; end if;
 if jsonb_typeof(p_location_pricing)<>'object' or coalesce((p_location_pricing->>'nigeria')::numeric,0)<=0 or coalesce((p_location_pricing->>'international')::numeric,0)<=0 then raise exception 'valid_location_pricing_required'; end if;
 v_slug:=trim(both '-' from lower(regexp_replace(trim(p_slug),'[^a-zA-Z0-9-]+','-','g')));
 if length(v_slug)<3 or length(v_slug)>100 then raise exception 'invalid_slug'; end if;
 if exists(select 1 from public.screenings where slug=v_slug) then v_slug:=left(v_slug,80)||'-'||substr(gen_random_uuid()::text,1,8); end if;
 insert into public.screenings(tenant_id,content_id,title,description,slug,poster_url,trailer_url,release_date,screening_date,duration,location_pricing,status,lifecycle,event_type)
 values(v_content.tenant_id,v_content.id,v_content.title,v_content.description,v_slug,v_content.poster_url,v_content.trailer_url,p_screening_date,p_screening_date,v_content.duration,p_location_pricing,'published','upcoming',p_event_type)
 returning id into v_screening;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data) values(v_user,'creator.screening.created','screening',v_screening,jsonb_build_object('content_id',v_content.id,'event_type',p_event_type,'slug',v_slug));
 return jsonb_build_object('screening_id',v_screening,'slug',v_slug,'status','published');
end; $$;