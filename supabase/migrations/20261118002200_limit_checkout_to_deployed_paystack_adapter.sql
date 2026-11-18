create or replace function public.admin_configure_payment_provider(
 p_provider text,p_test_public_key text default null,p_test_secret text default null,
 p_live_public_key text default null,p_live_secret text default null,p_webhook_secret text default null,
 p_enabled boolean default false,p_live boolean default false
) returns jsonb language plpgsql security definer set search_path=public,vault,pg_temp as $$
declare v_user uuid:=auth.uid(); v_test_ref uuid; v_live_ref uuid; v_webhook_ref uuid;
 v_existing_test_public text; v_existing_live_public text;
begin
 if v_user is null or not public.has_role(v_user,'super_admin'::public.app_role) then raise exception 'forbidden'; end if;
 if p_provider not in ('paystack','flutterwave','stripe') then raise exception 'invalid_provider'; end if;
 if p_enabled and p_provider<>'paystack' then raise exception 'provider_adapter_not_available'; end if;
 select test_secret_ref,live_secret_ref,webhook_secret_ref,test_public_key,live_public_key
 into v_test_ref,v_live_ref,v_webhook_ref,v_existing_test_public,v_existing_live_public
 from public.payment_provider_configs where provider=p_provider for update;
 if p_live and (coalesce(nullif(trim(p_live_public_key),''),v_existing_live_public) is null or (nullif(trim(p_live_secret),'') is null and v_live_ref is null)) then raise exception 'live_credentials_required'; end if;
 if p_enabled and not p_live and (coalesce(nullif(trim(p_test_public_key),''),v_existing_test_public) is null or (nullif(trim(p_test_secret),'') is null and v_test_ref is null)) then raise exception 'test_credentials_required'; end if;
 if nullif(trim(p_test_secret),'') is not null then
  if v_test_ref is null then v_test_ref:=vault.create_secret(p_test_secret,'degame-'||p_provider||'-test-secret','DeGameTV payment provider test credential',null);
  else perform vault.update_secret(v_test_ref,p_test_secret,null,'DeGameTV payment provider test credential',null); end if;
 end if;
 if nullif(trim(p_live_secret),'') is not null then
  if v_live_ref is null then v_live_ref:=vault.create_secret(p_live_secret,'degame-'||p_provider||'-live-secret','DeGameTV payment provider live credential',null);
  else perform vault.update_secret(v_live_ref,p_live_secret,null,'DeGameTV payment provider live credential',null); end if;
 end if;
 if nullif(trim(p_webhook_secret),'') is not null then
  if v_webhook_ref is null then v_webhook_ref:=vault.create_secret(p_webhook_secret,'degame-'||p_provider||'-webhook-secret','DeGameTV payment webhook credential',null);
  else perform vault.update_secret(v_webhook_ref,p_webhook_secret,null,'DeGameTV payment webhook credential',null); end if;
 end if;
 insert into public.payment_provider_configs(provider,is_enabled,is_live,test_public_key,live_public_key,test_secret_ref,live_secret_ref,webhook_secret_ref,updated_at,updated_by)
 values(p_provider,p_enabled,p_live,nullif(trim(p_test_public_key),''),nullif(trim(p_live_public_key),''),v_test_ref,v_live_ref,v_webhook_ref,now(),v_user)
 on conflict(provider) do update set is_enabled=excluded.is_enabled,is_live=excluded.is_live,
 test_public_key=coalesce(excluded.test_public_key,public.payment_provider_configs.test_public_key),
 live_public_key=coalesce(excluded.live_public_key,public.payment_provider_configs.live_public_key),
 test_secret_ref=coalesce(excluded.test_secret_ref,public.payment_provider_configs.test_secret_ref),
 live_secret_ref=coalesce(excluded.live_secret_ref,public.payment_provider_configs.live_secret_ref),
 webhook_secret_ref=coalesce(excluded.webhook_secret_ref,public.payment_provider_configs.webhook_secret_ref),updated_at=now(),updated_by=v_user;
 return jsonb_build_object('provider',p_provider,'enabled',p_enabled,'live',p_live,'credentials_saved',true);
end; $$;