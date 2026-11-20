-- Run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase1_vault_rotation.sql
begin;
do $$
declare v_actor uuid;v_versions integer;v_retired integer;v_active uuid;
begin
 select user_id into v_actor from public.user_roles where role='super_admin' limit 1;
 perform set_config('request.jwt.claim.sub',v_actor::text,true);
 perform public.admin_configure_service_provider_modes('ai_text','phase1vault',false,false,'https://example.org','{"completion":"/v1/chat"}','{"protocol":"openai_compatible","model":"test"}','phase1-test-secret-one',null,null,null,false);
 perform public.admin_configure_service_provider_modes('ai_text','phase1vault',false,false,'https://example.org','{"completion":"/v1/chat"}','{"protocol":"openai_compatible","model":"test"}','phase1-test-secret-two',null,null,null,false);
 select count(*),count(*) filter(where retired_at is not null) into v_versions,v_retired from public.service_provider_secret_versions
  where capability='ai_text' and provider_key='phase1vault' and secret_kind='test_credential';
 select test_credential_secret_ref into v_active from public.service_provider_bindings where capability='ai_text' and provider_key='phase1vault';
 if v_versions<>2 or v_retired<>1 then raise exception 'vault_rotation_version_history_invalid';end if;
 if not exists(select 1 from public.service_provider_secret_versions where secret_ref=v_active and retired_at is null and version=2) then raise exception 'vault_active_secret_pointer_invalid';end if;
 if has_table_privilege('authenticated','public.service_provider_secret_versions','select') then raise exception 'vault_version_table_exposed_to_authenticated';end if;
end $$;
rollback;
