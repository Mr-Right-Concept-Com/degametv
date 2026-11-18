create table if not exists public.email_provider_configs(
 provider text primary key check(provider='resend'),is_enabled boolean not null default false,is_live boolean not null default false,
 test_secret_ref uuid,live_secret_ref uuid,from_name text not null,from_email text not null,reply_to text,
 updated_at timestamptz not null default now(),updated_by uuid references auth.users(id)
);
alter table public.email_provider_configs enable row level security;
revoke all on public.email_provider_configs from public,anon,authenticated;
grant select,insert,update,delete on public.email_provider_configs to service_role;
create or replace function public.admin_configure_email_provider(
 p_test_secret text default null,p_live_secret text default null,p_from_name text default null,p_from_email text default null,p_reply_to text default null,p_enabled boolean default false,p_live boolean default false
) returns jsonb language plpgsql security definer set search_path=public,vault,pg_temp as $$
declare v_user uuid:=auth.uid(); v_test_ref uuid; v_live_ref uuid; v_old_name text; v_old_email text; v_old_reply text;
begin
 if v_user is null or not public.has_role(v_user,'super_admin'::public.app_role) then raise exception 'forbidden'; end if;
 select test_secret_ref,live_secret_ref,from_name,from_email,reply_to into v_test_ref,v_live_ref,v_old_name,v_old_email,v_old_reply from public.email_provider_configs where provider='resend' for update;
 if p_enabled and not p_live and v_test_ref is null and nullif(trim(p_test_secret),'') is null then raise exception 'test_email_key_required'; end if;
 if p_enabled and p_live and v_live_ref is null and nullif(trim(p_live_secret),'') is null then raise exception 'live_email_key_required'; end if;
 if p_enabled and coalesce(nullif(trim(p_from_email),''),v_old_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$' then raise exception 'verified_sender_email_required'; end if;
 if nullif(trim(p_test_secret),'') is not null then
  if v_test_ref is null then v_test_ref:=vault.create_secret(p_test_secret,'degame-resend-test-api-key','DeGameTV Resend test API key',null);
  else perform vault.update_secret(v_test_ref,p_test_secret,null,'DeGameTV Resend test API key',null); end if;
 end if;
 if nullif(trim(p_live_secret),'') is not null then
  if v_live_ref is null then v_live_ref:=vault.create_secret(p_live_secret,'degame-resend-live-api-key','DeGameTV Resend live API key',null);
  else perform vault.update_secret(v_live_ref,p_live_secret,null,'DeGameTV Resend live API key',null); end if;
 end if;
 insert into public.email_provider_configs(provider,is_enabled,is_live,test_secret_ref,live_secret_ref,from_name,from_email,reply_to,updated_at,updated_by)
 values('resend',p_enabled,p_live,v_test_ref,v_live_ref,coalesce(nullif(trim(p_from_name),''),v_old_name,'DeGameTV'),coalesce(nullif(trim(p_from_email),''),v_old_email),coalesce(nullif(trim(p_reply_to),''),v_old_reply),now(),v_user)
 on conflict(provider) do update set is_enabled=excluded.is_enabled,is_live=excluded.is_live,test_secret_ref=coalesce(excluded.test_secret_ref,public.email_provider_configs.test_secret_ref),live_secret_ref=coalesce(excluded.live_secret_ref,public.email_provider_configs.live_secret_ref),from_name=excluded.from_name,from_email=excluded.from_email,reply_to=excluded.reply_to,updated_at=now(),updated_by=v_user;
 insert into public.audit_logs(user_id,action,entity_type,new_data) values(v_user,'email.provider.configured','email_provider',jsonb_build_object('provider','resend','enabled',p_enabled,'live',p_live,'test_secret_rotated',nullif(trim(p_test_secret),'') is not null,'live_secret_rotated',nullif(trim(p_live_secret),'') is not null));
 return jsonb_build_object('provider','resend','enabled',p_enabled,'live',p_live);
end; $$;
revoke all on function public.admin_configure_email_provider(text,text,text,text,text,boolean,boolean) from public,anon;
grant execute on function public.admin_configure_email_provider(text,text,text,text,text,boolean,boolean) to authenticated;
create or replace function public.get_email_provider_runtime_config()
returns table(is_enabled boolean,is_live boolean,api_key text,from_name text,from_email text,reply_to text)
language sql security definer set search_path=public,vault,pg_temp as $$
 select c.is_enabled,c.is_live,s.decrypted_secret,c.from_name,c.from_email,c.reply_to from public.email_provider_configs c
 left join vault.decrypted_secrets s on s.id=case when c.is_live then c.live_secret_ref else c.test_secret_ref end
 where c.provider='resend' and c.is_enabled=true;
$$;
revoke all on function public.get_email_provider_runtime_config() from public,anon,authenticated;
grant execute on function public.get_email_provider_runtime_config() to service_role;
do $$
declare v jsonb; v_test text; v_live text;
begin
 select setting_value into v from public.platform_settings where setting_key='email_provider' for update;
 if v is not null then
  v_test:=nullif(v->>'test_api_key',''); v_live:=nullif(v->>'live_api_key','');
  insert into public.email_provider_configs(provider,is_enabled,is_live,test_secret_ref,live_secret_ref,from_name,from_email,reply_to)
  values('resend',false,false,case when v_test is null then null else vault.create_secret(v_test,'degame-resend-test-api-key','Migrated legacy Resend test API key',null) end,
  case when v_live is null then null else vault.create_secret(v_live,'degame-resend-live-api-key','Migrated legacy Resend live API key',null) end,
  coalesce(nullif(v->>'from_name',''),'DeGameTV'),coalesce(nullif(v->>'from_email',''),'noreply@degametv.com'),nullif(v->>'reply_to','')) on conflict(provider) do nothing;
  update public.platform_settings set setting_value=setting_value-'test_api_key'-'live_api_key' where setting_key='email_provider';
 end if;
end $$;