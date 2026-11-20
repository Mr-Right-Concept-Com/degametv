create or replace function public.admin_configure_service_provider_modes(
 p_capability text,p_provider_key text,p_enabled boolean,p_is_live boolean,p_base_url text default null,
 p_endpoints jsonb default '{}'::jsonb,p_settings jsonb default '{}'::jsonb,p_test_credential text default null,
 p_live_credential text default null,p_test_webhook_secret text default null,p_live_webhook_secret text default null,p_remove boolean default false
)
returns jsonb language plpgsql security definer set search_path=public,vault,pg_temp
as $$
declare v_actor uuid:=auth.uid();v_id uuid;v_test_credential uuid;v_live_credential uuid;v_test_webhook uuid;v_live_webhook uuid;v_legacy_credential uuid;v_legacy_webhook uuid;
begin
 if v_actor is null or not public.has_role(v_actor,'super_admin'::public.app_role) then raise exception 'forbidden' using errcode='42501';end if;
 if p_capability not in ('payments','identity','bank_verification','video_delivery','email','live_streaming','fx_rates','storage','cdn','drm','sms','push','geolocation','analytics','ai_text','ai_moderation','ai_embeddings') then raise exception 'invalid_capability';end if;
 if p_provider_key !~ '^[a-z][a-z0-9_-]{1,63}$' then raise exception 'invalid_provider_key';end if;
 if jsonb_typeof(coalesce(p_endpoints,'{}'::jsonb))<>'object' or jsonb_typeof(coalesce(p_settings,'{}'::jsonb))<>'object' then raise exception 'invalid_provider_configuration';end if;
 if p_base_url is not null and (p_base_url !~ '^https://' or p_base_url ~* '^https://[^/]*@') then raise exception 'provider_base_url_must_be_https';end if;
 select id,test_credential_secret_ref,live_credential_secret_ref,test_webhook_secret_ref,live_webhook_secret_ref,credential_secret_ref,webhook_secret_ref
 into v_id,v_test_credential,v_live_credential,v_test_webhook,v_live_webhook,v_legacy_credential,v_legacy_webhook
 from public.service_provider_bindings where capability=p_capability and provider_key=p_provider_key for update;
 v_test_credential:=coalesce(v_test_credential,case when not coalesce(p_is_live,false) then v_legacy_credential end);
 v_live_credential:=coalesce(v_live_credential,case when coalesce(p_is_live,false) then v_legacy_credential end);
 v_test_webhook:=coalesce(v_test_webhook,case when not coalesce(p_is_live,false) then v_legacy_webhook end);
 v_live_webhook:=coalesce(v_live_webhook,case when coalesce(p_is_live,false) then v_legacy_webhook end);
 if p_remove then
  if v_id is null then return jsonb_build_object('removed',true,'exists',false);end if;
  update public.service_provider_bindings set enabled=false,removed_at=now(),updated_at=now(),updated_by=v_actor where id=v_id;
  update public.service_provider_secret_versions set retired_at=coalesce(retired_at,now()) where capability=p_capability and provider_key=p_provider_key and retired_at is null;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data) values(v_actor,'provider.removed','service_provider',v_id,jsonb_build_object('capability',p_capability,'provider',p_provider_key));
  return jsonb_build_object('removed',true,'capability',p_capability,'provider',p_provider_key);
 end if;
 if p_enabled and p_base_url is null then raise exception 'provider_base_url_required';end if;
 if nullif(trim(p_test_credential),'') is not null then v_test_credential:=public.rotate_service_provider_secret(p_capability,p_provider_key,'test_credential',p_test_credential);end if;
 if nullif(trim(p_live_credential),'') is not null then v_live_credential:=public.rotate_service_provider_secret(p_capability,p_provider_key,'live_credential',p_live_credential);end if;
 if nullif(trim(p_test_webhook_secret),'') is not null then v_test_webhook:=public.rotate_service_provider_secret(p_capability,p_provider_key,'test_webhook',p_test_webhook_secret);end if;
 if nullif(trim(p_live_webhook_secret),'') is not null then v_live_webhook:=public.rotate_service_provider_secret(p_capability,p_provider_key,'live_webhook',p_live_webhook_secret);end if;
 update public.service_provider_secret_versions set retired_at=null where secret_ref in (v_test_credential,v_live_credential,v_test_webhook,v_live_webhook) and retired_at is not null;
 if p_enabled and (case when p_is_live then v_live_credential else v_test_credential end) is null then raise exception 'provider_credential_required';end if;
 if p_enabled and p_capability in ('payments','live_streaming') and (case when p_is_live then v_live_webhook else v_test_webhook end) is null then raise exception 'provider_webhook_secret_required';end if;
 insert into public.service_provider_bindings(capability,provider_key,enabled,is_live,base_url,endpoints,settings,credential_secret_ref,webhook_secret_ref,
  test_credential_secret_ref,live_credential_secret_ref,test_webhook_secret_ref,live_webhook_secret_ref,updated_at,updated_by,removed_at)
 values(p_capability,p_provider_key,p_enabled,p_is_live,p_base_url,coalesce(p_endpoints,'{}'),coalesce(p_settings,'{}'),
  case when p_is_live then v_live_credential else v_test_credential end,case when p_is_live then v_live_webhook else v_test_webhook end,
  v_test_credential,v_live_credential,v_test_webhook,v_live_webhook,now(),v_actor,null)
 on conflict(capability,provider_key) do update set enabled=excluded.enabled,is_live=excluded.is_live,base_url=excluded.base_url,endpoints=excluded.endpoints,settings=excluded.settings,
  credential_secret_ref=excluded.credential_secret_ref,webhook_secret_ref=excluded.webhook_secret_ref,test_credential_secret_ref=excluded.test_credential_secret_ref,
  live_credential_secret_ref=excluded.live_credential_secret_ref,test_webhook_secret_ref=excluded.test_webhook_secret_ref,live_webhook_secret_ref=excluded.live_webhook_secret_ref,
  updated_at=now(),updated_by=v_actor,removed_at=null returning id into v_id;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data) values(v_actor,'provider.configured','service_provider',v_id,
  jsonb_build_object('capability',p_capability,'provider',p_provider_key,'enabled',p_enabled,'live',p_is_live));
 return jsonb_build_object('id',v_id,'capability',p_capability,'provider',p_provider_key,'enabled',p_enabled,'live',p_is_live);
end $$;
revoke all on function public.admin_configure_service_provider_modes(text,text,boolean,boolean,text,jsonb,jsonb,text,text,text,text,boolean) from public,anon;
grant execute on function public.admin_configure_service_provider_modes(text,text,boolean,boolean,text,jsonb,jsonb,text,text,text,text,boolean) to authenticated;
