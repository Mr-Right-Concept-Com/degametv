insert into public.service_provider_bindings(
 capability,provider_key,enabled,is_live,base_url,endpoints,settings,
 credential_secret_ref,webhook_secret_ref,test_credential_secret_ref,test_webhook_secret_ref,
 priority,updated_at,removed_at
)
select 'payments','paystack',false,false,'https://api.paystack.co',
 jsonb_build_object('health_check','/balance','checkout_initialize','/transaction/initialize','payment_verify','/transaction/verify'),
 jsonb_build_object('adapter','paystack','signature_header','x-paystack-signature','signature_algorithm','SHA-512','success_event','charge.success',
  'credential_header','Authorization','credential_prefix','Bearer ','allowed_checkout_origins',jsonb_build_array('https://checkout.paystack.com'),'priority',10),
 c.test_secret_ref,c.test_secret_ref,c.test_secret_ref,c.test_secret_ref,10,now(),null
from public.payment_provider_configs c
where c.provider='paystack' and c.test_secret_ref is not null
on conflict(capability,provider_key) do update set
 base_url=excluded.base_url,endpoints=excluded.endpoints,
 settings=public.service_provider_bindings.settings||excluded.settings,
 test_credential_secret_ref=coalesce(public.service_provider_bindings.test_credential_secret_ref,excluded.test_credential_secret_ref),
 test_webhook_secret_ref=coalesce(public.service_provider_bindings.test_webhook_secret_ref,excluded.test_webhook_secret_ref),
 updated_at=now(),removed_at=null;
