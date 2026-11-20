-- Run with: supabase test db --linked
begin;

do $$
declare
  v_key text := 'phase1.test.' || txid_current()::text;
  v_subject uuid := '00000000-0000-4000-8000-000000000001';
  v_first boolean;
  v_second boolean;
begin
  if not exists(select 1 from public.platform_branding_registry where brand_key='platform.default' and is_public) then
    raise exception 'public_branding_registry_seed_missing';
  end if;
  if has_table_privilege('anon','public.service_provider_bindings','select')
     or has_table_privilege('authenticated','public.service_provider_bindings','select') then
    raise exception 'provider_registry_exposed_to_client_roles';
  end if;
  if has_table_privilege('anon','public.payment_refunds','select')
     or has_table_privilege('authenticated','public.payment_refunds','select') then
    raise exception 'payment_refunds_exposed_to_client_roles';
  end if;
  if has_function_privilege('anon','public.get_platform_release_assignment(text,uuid)','execute') then
    raise exception 'release_assignment_exposed_to_anonymous';
  end if;
  if exists(select 1 from public.platform_ai_policies where allow_financial_decisions or allow_identity_decisions) then
    raise exception 'ai_policy_allows_prohibited_decisions';
  end if;
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='public_content_catalog' and c.reloptions @> array['security_invoker=true']) then
    raise exception 'public_catalog_view_not_security_invoker';
  end if;

  insert into public.platform_release_rollouts(release_key,release_version,state,traffic_percentage,config)
  values(v_key,'test', 'canary', 50, '{"artifact_digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","health_check_url":"https://example.org/healthz"}');
  select assigned into v_first from public.get_platform_release_assignment(v_key,v_subject);
  select assigned into v_second from public.get_platform_release_assignment(v_key,v_subject);
  if v_first is distinct from v_second then raise exception 'release_assignment_not_deterministic'; end if;
  delete from public.platform_release_rollouts where release_key=v_key;
end $$;

rollback;
