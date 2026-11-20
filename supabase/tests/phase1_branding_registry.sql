-- Run with: supabase test db --linked
begin;
do $$
declare v_actor uuid;v_brand jsonb;v_public boolean;v_version integer;v_result jsonb;v_next integer;
begin
 select user_id into v_actor from public.user_roles where role='super_admin' limit 1;
 if v_actor is null then raise exception 'verified_super_admin_missing';end if;
 select brand_config,is_public,version into v_brand,v_public,v_version from public.platform_branding_registry where brand_key='platform.default' for update;
 if v_version is null then raise exception 'canonical_branding_missing';end if;
 v_result:=public.update_platform_branding('platform.default',v_brand,v_public,v_version,v_actor,'Phase 1 registry transaction test');
 v_next:=(v_result->>'version')::integer;
 if v_next<>v_version+1 then raise exception 'branding_version_not_incremented';end if;
 if not exists(select 1 from public.audit_logs where action='platform_branding.updated' and entity_type='platform_branding' and new_data->>'version'=v_next::text) then
  raise exception 'branding_audit_record_missing';
 end if;
end $$;
rollback;
