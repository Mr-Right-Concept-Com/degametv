alter table public.service_provider_bindings add column if not exists priority integer not null default 100;
create index if not exists service_provider_bindings_runtime_priority_idx on public.service_provider_bindings(capability,enabled,priority,updated_at desc) where removed_at is null;
create or replace function public.get_service_provider_runtime_config(p_capability text)
returns table(id uuid,capability text,provider_key text,is_live boolean,base_url text,endpoints jsonb,settings jsonb,credential text,webhook_secret text)
language sql security definer set search_path=public,vault,pg_temp as $$
 select b.id,b.capability,b.provider_key,b.is_live,b.base_url,b.endpoints,b.settings,c.decrypted_secret,w.decrypted_secret
 from public.service_provider_bindings b
 left join vault.decrypted_secrets c on c.id=b.credential_secret_ref
 left join vault.decrypted_secrets w on w.id=b.webhook_secret_ref
 where b.capability=p_capability and b.enabled=true and b.removed_at is null
 order by b.priority asc,b.updated_at desc
 limit 1
$$;
revoke all on function public.get_service_provider_runtime_config(text) from public,anon,authenticated;
grant execute on function public.get_service_provider_runtime_config(text) to service_role;
