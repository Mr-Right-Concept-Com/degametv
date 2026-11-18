create or replace function public.get_service_provider_admin_secret(p_capability text,p_provider_key text)
returns table(credential text,webhook_secret text)
language sql security definer set search_path=public,vault,pg_temp as $$
 select c.decrypted_secret,w.decrypted_secret
 from public.service_provider_bindings b
 left join vault.decrypted_secrets c on c.id=b.credential_secret_ref
 left join vault.decrypted_secrets w on w.id=b.webhook_secret_ref
 where b.capability=p_capability and b.provider_key=p_provider_key and b.removed_at is null
 limit 1;
$$;
revoke all on function public.get_service_provider_admin_secret(text,text) from public,anon,authenticated;
grant execute on function public.get_service_provider_admin_secret(text,text) to service_role;