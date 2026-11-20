-- Run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase1_provider_failover.sql
begin;
do $$
declare v_actor uuid;v_count integer;v_order text[];
begin
 select user_id into v_actor from public.user_roles where role='super_admin' limit 1;
 insert into public.service_provider_bindings(capability,provider_key,enabled,is_live,base_url,endpoints,settings,priority,health_status,updated_by)
 values('ai_text','phase1failovera',true,false,'https://example.org','{"completion":"/v1/chat"}','{"protocol":"openai_compatible","model":"test"}',10,'healthy',v_actor),
       ('ai_text','phase1failoverb',true,false,'https://example.net','{"completion":"/v1/chat"}','{"protocol":"openai_compatible","model":"test"}',20,'healthy',v_actor);
 select count(*) into v_count from public.service_provider_bindings where capability='ai_text' and provider_key in ('phase1failovera','phase1failoverb') and enabled;
 if v_count<>2 then raise exception 'multi_provider_activation_failed'; end if;
 select array_agg(provider_key) into v_order from public.get_service_provider_runtime_config('ai_text') where provider_key in ('phase1failovera','phase1failoverb');
 if v_order is distinct from array['phase1failovera','phase1failoverb'] then raise exception 'provider_priority_order_not_deterministic'; end if;
 if has_function_privilege('authenticated','public.get_service_provider_runtime_config(text)','execute') then raise exception 'runtime_vault_credentials_exposed_to_authenticated'; end if;
 if not has_function_privilege('service_role','public.get_service_provider_runtime_config(text)','execute') then raise exception 'runtime_service_role_access_missing'; end if;
 if position('storage' in pg_get_functiondef('public.admin_configure_service_provider_modes(text,text,boolean,boolean,text,jsonb,jsonb,text,text,text,text,boolean)'::regprocedure))=0 then raise exception 'provider_capability_guard_not_extended'; end if;
end $$;
rollback;
