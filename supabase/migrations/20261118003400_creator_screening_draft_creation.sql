create or replace function public.create_creator_screening(
 p_content_id uuid,p_screening_date timestamptz,p_location_pricing jsonb,p_event_type text,p_slug text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_content public.content%rowtype; v_slug text; v_screening uuid;
begin
 if v_user is null or not public.is_approved_creator(v_user) then raise exception 'approved_creator_required'; end if;
 select * into v_content from public.content where id=p_content_id and creator_id=v_user and status='published' for update;
 if not found then raise exception 'published_content_required'; end if;
 if p_event_type not in ('film','series') or (p_event_type='film' and v_content.type not in ('movie','film')) or (p_event_type='series' and v_content.type<>'series') then raise exception 'content_event_type_mismatch'; end if;
 if p_screening_date is not null and p_screening_date<now()+interval '15 minutes' then raise exception 'screening_date_too_soon'; end if;
 if jsonb_typeof(p_location_pricing)<>'object' or coalesce((p_location_pricing->>'nigeria')::numeric,0)<=0 or coalesce((p_location_pricing->>'international')::numeric,0)<=0 then raise exception 'valid_location_pricing_required'; end if;
 v_slug:=lower(regexp_replace(trim(p_slug),'[^a-zA-Z0-9-]+','-','g'));v_slug:=trim(both '-' from v_slug);
 if length(v_slug)<3 or length(v_slug)>100 then raise exception 'invalid_slug'; end if;
 if exists(select 1 from public.screenings where slug=v_slug) then v_slug:=left(v_slug,80)||'-'||substr(gen_random_uuid()::text,1,8); end if;
 insert into public.screenings(tenant_id,content_id,title,description,slug,poster_url,trailer_url,release_date,screening_date,duration,location_pricing,status,lifecycle,event_type)
 values(v_content.tenant_id,v_content.id,v_content.title,v_content.description,v_slug,v_content.poster_url,v_content.trailer_url,p_screening_date,p_screening_date,v_content.duration,p_location_pricing,'draft','upcoming',p_event_type)
 returning id into v_screening;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
 values(v_user,'creator.screening.created','screening',v_screening,jsonb_build_object('content_id',v_content.id,'event_type',p_event_type,'slug',v_slug));
 return jsonb_build_object('screening_id',v_screening,'slug',v_slug,'status','draft');
end; $$;
revoke all on function public.create_creator_screening(uuid,timestamptz,jsonb,text,text) from public,anon;
grant execute on function public.create_creator_screening(uuid,timestamptz,jsonb,text,text) to authenticated;