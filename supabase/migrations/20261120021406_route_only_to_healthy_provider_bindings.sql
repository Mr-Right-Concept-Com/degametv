create or replace function public.get_service_provider_runtime_config(p_capability text)
returns table(id uuid,capability text,provider_key text,is_live boolean,base_url text,endpoints jsonb,settings jsonb,credential text,webhook_secret text)
language sql security definer set search_path=public,vault,pg_temp as $function$
 select b.id,b.capability,b.provider_key,b.is_live,b.base_url,b.endpoints,b.settings,
  coalesce(mode_credential.decrypted_secret,legacy_credential.decrypted_secret),
  coalesce(mode_webhook.decrypted_secret,legacy_webhook.decrypted_secret)
 from public.service_provider_bindings b
 left join vault.decrypted_secrets mode_credential on mode_credential.id=case when b.is_live then b.live_credential_secret_ref else b.test_credential_secret_ref end
 left join vault.decrypted_secrets legacy_credential on legacy_credential.id=b.credential_secret_ref
 left join vault.decrypted_secrets mode_webhook on mode_webhook.id=case when b.is_live then b.live_webhook_secret_ref else b.test_webhook_secret_ref end
 left join vault.decrypted_secrets legacy_webhook on legacy_webhook.id=b.webhook_secret_ref
 where b.capability=p_capability and b.enabled=true and b.removed_at is null and b.health_status='healthy'
 order by case when coalesce(b.settings->>'priority','') ~ '^[0-9]{1,4}$' then (b.settings->>'priority')::integer else b.priority end asc,b.updated_at desc;
$function$;
revoke all on function public.get_service_provider_runtime_config(text) from public,anon,authenticated;
grant execute on function public.get_service_provider_runtime_config(text) to service_role;
