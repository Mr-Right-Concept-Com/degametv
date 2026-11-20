create or replace function public.update_platform_branding(p_brand_key text,p_brand_config jsonb,p_is_public boolean,p_expected_version integer,p_actor_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_row public.platform_branding_registry%rowtype;v_previous jsonb;
begin
 if p_actor_id is null or not exists(select 1 from public.user_roles where user_id=p_actor_id and role='super_admin') then raise exception 'super_admin_required' using errcode='42501';end if;
 if p_reason is null or length(btrim(p_reason))<3 then raise exception 'branding_change_reason_required' using errcode='22023';end if;
 if p_brand_key<>'platform.default' or p_brand_config is null or jsonb_typeof(p_brand_config)<>'object' then raise exception 'invalid_branding_payload' using errcode='22023';end if;
 select * into v_row from public.platform_branding_registry where brand_key=p_brand_key for update;
 if not found then raise exception 'branding_record_not_found' using errcode='P0002';end if;
 if v_row.version<>p_expected_version then raise exception 'branding_version_conflict' using errcode='40001';end if;
 v_previous:=jsonb_build_object('brand_config',v_row.brand_config,'is_public',v_row.is_public,'version',v_row.version);
 update public.platform_branding_registry set brand_config=p_brand_config,is_public=p_is_public,version=v_row.version+1,updated_by=p_actor_id,updated_at=now()
  where brand_key=p_brand_key returning * into v_row;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,old_data,new_data)
 values(p_actor_id,'platform_branding.updated','platform_branding',null,v_previous,
  jsonb_build_object('brand_key',p_brand_key,'brand_config',p_brand_config,'is_public',p_is_public,'version',v_row.version,'reason',p_reason));
 return to_jsonb(v_row);
end $$;
revoke all on function public.update_platform_branding(text,jsonb,boolean,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.update_platform_branding(text,jsonb,boolean,integer,uuid,text) to service_role;
comment on function public.update_platform_branding(text,jsonb,boolean,integer,uuid,text) is 'Atomic optimistic-concurrency update of the canonical branding registry with immutable audit trail; service-role only.';
