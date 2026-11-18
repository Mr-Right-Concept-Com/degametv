-- Provider credentials live in Supabase Vault; application tables retain references only.
create table if not exists public.payment_provider_configs (
  provider text primary key check (provider in ('paystack','flutterwave','stripe')),
  is_enabled boolean not null default false,
  is_live boolean not null default false,
  test_public_key text,
  live_public_key text,
  test_secret_ref uuid,
  live_secret_ref uuid,
  webhook_secret_ref uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.payment_provider_configs enable row level security;
revoke all on public.payment_provider_configs from public, anon, authenticated;
grant select, insert, update, delete on public.payment_provider_configs to service_role;

create or replace function public.admin_configure_payment_provider(
  p_provider text,
  p_test_public_key text default null,
  p_test_secret text default null,
  p_live_public_key text default null,
  p_live_secret text default null,
  p_webhook_secret text default null,
  p_enabled boolean default false,
  p_live boolean default false
) returns jsonb language plpgsql security definer
set search_path = public, vault, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_test_ref uuid;
  v_live_ref uuid;
  v_webhook_ref uuid;
begin
  if v_user is null or not public.has_role(v_user, 'super_admin'::public.app_role) then raise exception 'forbidden'; end if;
  if p_provider not in ('paystack','flutterwave','stripe') then raise exception 'invalid_provider'; end if;
  if p_live and (coalesce(trim(p_live_public_key),'') = '' or coalesce(trim(p_live_secret),'') = '' or coalesce(trim(p_webhook_secret),'') = '') then raise exception 'live_credentials_and_webhook_required'; end if;
  if p_enabled and not p_live and (coalesce(trim(p_test_public_key),'') = '' or coalesce(trim(p_test_secret),'') = '' or coalesce(trim(p_webhook_secret),'') = '') then raise exception 'test_credentials_and_webhook_required'; end if;
  select test_secret_ref,live_secret_ref,webhook_secret_ref into v_test_ref,v_live_ref,v_webhook_ref
    from public.payment_provider_configs where provider=p_provider for update;
  if nullif(trim(p_test_secret),'') is not null then
    if v_test_ref is null then v_test_ref:=vault.create_secret(p_test_secret,'degame-'||p_provider||'-test-secret','DeGameTV payment provider test credential',null);
    else perform vault.update_secret(v_test_ref,p_test_secret,null,'DeGameTV payment provider test credential',null); end if;
  end if;
  if nullif(trim(p_live_secret),'') is not null then
    if v_live_ref is null then v_live_ref:=vault.create_secret(p_live_secret,'degame-'||p_provider||'-live-secret','DeGameTV payment provider live credential',null);
    else perform vault.update_secret(v_live_ref,p_live_secret,null,'DeGameTV payment provider live credential',null); end if;
  end if;
  if nullif(trim(p_webhook_secret),'') is not null then
    if v_webhook_ref is null then v_webhook_ref:=vault.create_secret(p_webhook_secret,'degame-'||p_provider||'-webhook-secret','DeGameTV payment webhook signing secret',null);
    else perform vault.update_secret(v_webhook_ref,p_webhook_secret,null,'DeGameTV payment webhook signing secret',null); end if;
  end if;
  insert into public.payment_provider_configs(provider,is_enabled,is_live,test_public_key,live_public_key,test_secret_ref,live_secret_ref,webhook_secret_ref,updated_at,updated_by)
  values(p_provider,p_enabled,p_live,nullif(trim(p_test_public_key),''),nullif(trim(p_live_public_key),''),v_test_ref,v_live_ref,v_webhook_ref,now(),v_user)
  on conflict(provider) do update set is_enabled=excluded.is_enabled,is_live=excluded.is_live,
    test_public_key=coalesce(excluded.test_public_key,public.payment_provider_configs.test_public_key),
    live_public_key=coalesce(excluded.live_public_key,public.payment_provider_configs.live_public_key),
    test_secret_ref=coalesce(excluded.test_secret_ref,public.payment_provider_configs.test_secret_ref),
    live_secret_ref=coalesce(excluded.live_secret_ref,public.payment_provider_configs.live_secret_ref),
    webhook_secret_ref=coalesce(excluded.webhook_secret_ref,public.payment_provider_configs.webhook_secret_ref),
    updated_at=now(),updated_by=v_user;
  return jsonb_build_object('provider',p_provider,'enabled',p_enabled,'live',p_live,'credentials_saved',true);
end; $$;
revoke all on function public.admin_configure_payment_provider(text,text,text,text,text,text,boolean,boolean) from public,anon;
grant execute on function public.admin_configure_payment_provider(text,text,text,text,text,text,boolean,boolean) to authenticated;

create or replace function public.get_payment_provider_runtime_config(p_provider text)
returns table(provider text,is_enabled boolean,is_live boolean,public_key text,secret_key text,webhook_secret text)
language sql security definer set search_path=public,vault,pg_temp as $$
  select c.provider,c.is_enabled,c.is_live,
    case when c.is_live then c.live_public_key else c.test_public_key end,
    s.decrypted_secret,w.decrypted_secret
  from public.payment_provider_configs c
  left join vault.decrypted_secrets s on s.id=case when c.is_live then c.live_secret_ref else c.test_secret_ref end
  left join vault.decrypted_secrets w on w.id=c.webhook_secret_ref
  where c.provider=p_provider and c.is_enabled=true;
$$;
revoke all on function public.get_payment_provider_runtime_config(text) from public,anon,authenticated;
grant execute on function public.get_payment_provider_runtime_config(text) to service_role;
