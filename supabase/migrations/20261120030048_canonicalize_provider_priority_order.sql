create or replace function public.get_service_provider_runtime_config(p_capability text)
returns table(id uuid,capability text,provider_key text,is_live boolean,base_url text,endpoints jsonb,settings jsonb,credential text,webhook_secret text)
language sql security definer set search_path=public,vault,pg_temp
as $$
 select b.id,b.capability,b.provider_key,b.is_live,b.base_url,b.endpoints,b.settings,
  coalesce(mc.decrypted_secret,lc.decrypted_secret),coalesce(mw.decrypted_secret,lw.decrypted_secret)
 from public.service_provider_bindings b
 left join vault.decrypted_secrets mc on mc.id=case when b.is_live then b.live_credential_secret_ref else b.test_credential_secret_ref end
 left join vault.decrypted_secrets lc on lc.id=b.credential_secret_ref
 left join vault.decrypted_secrets mw on mw.id=case when b.is_live then b.live_webhook_secret_ref else b.test_webhook_secret_ref end
 left join vault.decrypted_secrets lw on lw.id=b.webhook_secret_ref
 where b.capability=p_capability and b.enabled=true and b.removed_at is null and b.health_status='healthy'
 order by b.priority asc,b.provider_key asc;
$$;
revoke all on function public.get_service_provider_runtime_config(text) from public,anon,authenticated;
grant execute on function public.get_service_provider_runtime_config(text) to service_role;
comment on function public.get_service_provider_runtime_config(text) is
'Service-role-only provider router. Returns enabled healthy provider credentials from Vault in deterministic priority-column/provider-key order for backend adapters and automatic failover.';
