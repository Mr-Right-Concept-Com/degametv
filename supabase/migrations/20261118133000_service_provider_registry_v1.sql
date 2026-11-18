
create table if not exists public.service_provider_bindings (
  id uuid primary key default gen_random_uuid(),
  capability text not null check (capability in ('payments','identity','bank_verification','video_delivery','email','live_streaming')),
  provider_key text not null check (provider_key ~ '^[a-z][a-z0-9_-]{1,63}$'),
  enabled boolean not null default false,
  is_live boolean not null default false,
  base_url text,
  endpoints jsonb not null default '{}'::jsonb check (jsonb_typeof(endpoints)='object'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings)='object'),
  credential_secret_ref uuid,
  webhook_secret_ref uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  removed_at timestamptz,
  unique(capability,provider_key),
  check (base_url is null or (base_url ~ '^https://' and base_url !~* '^https://[^/]*@'))
);
create unique index if not exists service_provider_one_active_per_capability
  on public.service_provider_bindings(capability) where enabled=true and removed_at is null;
alter table public.service_provider_bindings enable row level security;
revoke all on public.service_provider_bindings from anon, authenticated;
grant select,insert,update,delete on public.service_provider_bindings to service_role;

create or replace function public.admin_configure_service_provider(
  p_capability text, p_provider_key text, p_enabled boolean, p_is_live boolean,
  p_base_url text default null, p_endpoints jsonb default '{}'::jsonb,
  p_settings jsonb default '{}'::jsonb, p_credential text default null,
  p_webhook_secret text default null, p_remove boolean default false
) returns jsonb language plpgsql security definer
set search_path='public','vault','pg_temp'
as $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_credential_ref uuid; v_webhook_ref uuid;
begin
 if v_actor is null or not public.has_role(v_actor,'super_admin'::public.app_role) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_capability not in ('payments','identity','bank_verification','video_delivery','email','live_streaming') then raise exception 'invalid_capability'; end if;
 if p_provider_key !~ '^[a-z][a-z0-9_-]{1,63}$' then raise exception 'invalid_provider_key'; end if;
 if jsonb_typeof(coalesce(p_endpoints,'{}'::jsonb))<>'object' or jsonb_typeof(coalesce(p_settings,'{}'::jsonb))<>'object' then raise exception 'invalid_provider_configuration'; end if;
 if p_base_url is not null and (p_base_url !~ '^https://' or p_base_url ~* '^https://[^/]*@') then raise exception 'provider_base_url_must_be_https'; end if;
 select id,credential_secret_ref,webhook_secret_ref into v_id,v_credential_ref,v_webhook_ref
 from public.service_provider_bindings where capability=p_capability and provider_key=p_provider_key for update;
 if p_remove then
   if v_id is null then return jsonb_build_object('removed',true,'exists',false); end if;
   update public.service_provider_bindings set enabled=false,removed_at=now(),updated_at=now(),updated_by=v_actor
   where id=v_id;
   insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
   values(v_actor,'provider.removed','service_provider',v_id,jsonb_build_object('capability',p_capability,'provider',p_provider_key));
   return jsonb_build_object('removed',true,'capability',p_capability,'provider',p_provider_key);
 end if;
 if p_enabled and p_base_url is null then raise exception 'provider_base_url_required'; end if;
 if nullif(trim(p_credential),'') is not null then
   if v_credential_ref is null then v_credential_ref:=vault.create_secret(p_credential,'degame-'||p_capability||'-'||p_provider_key||'-credential','DeGameTV service provider credential',null);
   else perform vault.update_secret(v_credential_ref,p_credential,null,'DeGameTV service provider credential',null); end if;
 end if;
 if nullif(trim(p_webhook_secret),'') is not null then
   if v_webhook_ref is null then v_webhook_ref:=vault.create_secret(p_webhook_secret,'degame-'||p_capability||'-'||p_provider_key||'-webhook','DeGameTV service provider webhook secret',null);
   else perform vault.update_secret(v_webhook_ref,p_webhook_secret,null,'DeGameTV service provider webhook secret',null); end if;
 end if;
 if p_enabled and v_credential_ref is null then raise exception 'provider_credential_required'; end if;
 insert into public.service_provider_bindings(capability,provider_key,enabled,is_live,base_url,endpoints,settings,credential_secret_ref,webhook_secret_ref,updated_at,updated_by,removed_at)
 values(p_capability,p_provider_key,p_enabled,p_is_live,p_base_url,coalesce(p_endpoints,'{}'),coalesce(p_settings,'{}'),v_credential_ref,v_webhook_ref,now(),v_actor,null)
 on conflict(capability,provider_key) do update set enabled=excluded.enabled,is_live=excluded.is_live,
 base_url=excluded.base_url,endpoints=excluded.endpoints,settings=excluded.settings,
 credential_secret_ref=coalesce(excluded.credential_secret_ref,public.service_provider_bindings.credential_secret_ref),
 webhook_secret_ref=coalesce(excluded.webhook_secret_ref,public.service_provider_bindings.webhook_secret_ref),
 updated_at=now(),updated_by=v_actor,removed_at=null
 returning id into v_id;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
 values(v_actor,'provider.configured','service_provider',v_id,jsonb_build_object('capability',p_capability,'provider',p_provider_key,'enabled',p_enabled,'live',p_is_live,'credential_rotated',nullif(trim(p_credential),'') is not null));
 return jsonb_build_object('id',v_id,'capability',p_capability,'provider',p_provider_key,'enabled',p_enabled,'live',p_is_live);
end $$;

create or replace function public.get_service_provider_runtime_config(p_capability text)
returns table(id uuid,capability text,provider_key text,is_live boolean,base_url text,endpoints jsonb,settings jsonb,credential text,webhook_secret text)
language sql security definer set search_path='public','vault','pg_temp'
as $$
 select b.id,b.capability,b.provider_key,b.is_live,b.base_url,b.endpoints,b.settings,c.decrypted_secret,w.decrypted_secret
 from public.service_provider_bindings b
 left join vault.decrypted_secrets c on c.id=b.credential_secret_ref
 left join vault.decrypted_secrets w on w.id=b.webhook_secret_ref
 where b.capability=p_capability and b.enabled=true and b.removed_at is null
 limit 1
$$;
revoke all on function public.get_service_provider_runtime_config(text) from public,anon,authenticated;
grant execute on function public.get_service_provider_runtime_config(text) to service_role;
revoke all on function public.admin_configure_service_provider(text,text,boolean,boolean,text,jsonb,jsonb,text,text,boolean) from public,anon;
grant execute on function public.admin_configure_service_provider(text,text,boolean,boolean,text,jsonb,jsonb,text,text,boolean) to authenticated;
