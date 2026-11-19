-- Global runtime control plane: locale/currency policy and safe-release controls.
create table if not exists public.country_currency_rules (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  currency_symbol text,
  locale_code text not null default 'en',
  timezone_name text,
  enabled boolean not null default true,
  source text not null default 'admin',
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.country_currency_rules enable row level security;
revoke all on public.country_currency_rules from anon, authenticated;
grant select on public.country_currency_rules to service_role;
insert into public.country_currency_rules(country_code,currency_code,currency_symbol,locale_code,source) values
('US','USD','$','en-US','bootstrap'),('GB','GBP','£','en-GB','bootstrap'),('CA','CAD','$','en-CA','bootstrap'),('AU','AUD','$','en-AU','bootstrap'),
('NG','NGN','₦','en-NG','bootstrap'),('GH','GHS','GH₵','en-GH','bootstrap'),('KE','KES','KSh','en-KE','bootstrap'),('ZA','ZAR','R','en-ZA','bootstrap'),
('DE','EUR','€','de-DE','bootstrap'),('FR','EUR','€','fr-FR','bootstrap'),('ES','EUR','€','es-ES','bootstrap'),('IT','EUR','€','it-IT','bootstrap'),
('NL','EUR','€','nl-NL','bootstrap'),('IE','EUR','€','en-IE','bootstrap'),('IN','INR','₹','en-IN','bootstrap'),('JP','JPY','¥','ja-JP','bootstrap'),
('CN','CNY','¥','zh-CN','bootstrap'),('BR','BRL','R$','pt-BR','bootstrap'),('MX','MXN','$','es-MX','bootstrap'),('AE','AED','د.إ','ar-AE','bootstrap'),
('SA','SAR','ر.س','ar-SA','bootstrap'),('EG','EGP','E£','ar-EG','bootstrap')
on conflict (country_code) do nothing;
alter table public.profiles add column if not exists preferred_currency text, add column if not exists preferred_country text, add column if not exists locale_code text;
create table if not exists public.platform_feature_controls (
  feature_key text primary key check (feature_key ~ '^[a-z][a-z0-9_.-]{1,119}$'),
  enabled boolean not null default false,
  rollout_percentage integer not null default 0 check (rollout_percentage between 0 and 100),
  release_state text not null default 'draft' check (release_state in ('draft','canary','released','paused','rolled_back')),
  config jsonb not null default '{}'::jsonb,
  change_reason text not null,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.platform_feature_controls enable row level security;
revoke all on public.platform_feature_controls from anon, authenticated;
grant select on public.platform_feature_controls to service_role;
create index if not exists country_currency_rules_enabled_idx on public.country_currency_rules(country_code) where enabled;
create index if not exists platform_feature_controls_release_idx on public.platform_feature_controls(release_state,enabled);
create or replace function public.admin_upsert_country_currency_rule(
 p_country_code text,p_currency_code text,p_currency_symbol text,p_locale_code text default 'en',
 p_timezone_name text default null,p_enabled boolean default true,p_reason text default 'country currency configuration'
) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_old jsonb;v_new jsonb;v_user uuid:=auth.uid();
begin
 if v_user is null or not exists(select 1 from public.user_roles where user_id=v_user and role::text='super_admin') then raise exception 'platform super administrator required' using errcode='42501'; end if;
 if p_country_code !~ '^[A-Z]{2}$' or p_currency_code !~ '^[A-Z]{3}$' then raise exception 'invalid ISO country or currency code' using errcode='22023'; end if;
 select to_jsonb(r) into v_old from public.country_currency_rules r where country_code=p_country_code;
 insert into public.country_currency_rules(country_code,currency_code,currency_symbol,locale_code,timezone_name,enabled,source,updated_by)
 values(p_country_code,p_currency_code,p_currency_symbol,coalesce(nullif(p_locale_code,''),'en'),p_timezone_name,p_enabled,'admin',v_user)
 on conflict(country_code) do update set currency_code=excluded.currency_code,currency_symbol=excluded.currency_symbol,locale_code=excluded.locale_code,timezone_name=excluded.timezone_name,enabled=excluded.enabled,source='admin',updated_by=v_user,updated_at=now();
 select to_jsonb(r) into v_new from public.country_currency_rules r where country_code=p_country_code;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,old_data,new_data) values(v_user,'country_currency_rule.upsert','country_currency_rule',null,coalesce(v_old,'{}'::jsonb),v_new||jsonb_build_object('reason',p_reason));
 return v_new;
end $$;
revoke all on function public.admin_upsert_country_currency_rule(text,text,text,text,text,boolean,text) from public,anon;
grant execute on function public.admin_upsert_country_currency_rule(text,text,text,text,text,boolean,text) to authenticated;
create or replace function public.admin_upsert_feature_control(
 p_feature_key text,p_enabled boolean,p_rollout_percentage integer,p_release_state text,p_config jsonb,p_reason text
) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_old jsonb;v_new jsonb;v_user uuid:=auth.uid();
begin
 if v_user is null or not exists(select 1 from public.user_roles where user_id=v_user and role::text='super_admin') then raise exception 'platform super administrator required' using errcode='42501'; end if;
 if p_feature_key !~ '^[a-z][a-z0-9_.-]{1,119}$' or p_rollout_percentage not between 0 and 100 or p_release_state not in ('draft','canary','released','paused','rolled_back') or length(trim(coalesce(p_reason,'')))<3 then raise exception 'invalid feature release configuration' using errcode='22023'; end if;
 if p_release_state='released' and p_rollout_percentage<>100 then raise exception 'released state requires 100 percent rollout; use canary for staged rollout' using errcode='22023'; end if;
 select to_jsonb(f) into v_old from public.platform_feature_controls f where feature_key=p_feature_key;
 insert into public.platform_feature_controls(feature_key,enabled,rollout_percentage,release_state,config,change_reason,updated_by)
 values(p_feature_key,p_enabled,p_rollout_percentage,p_release_state,coalesce(p_config,'{}'::jsonb),p_reason,v_user)
 on conflict(feature_key) do update set enabled=excluded.enabled,rollout_percentage=excluded.rollout_percentage,release_state=excluded.release_state,config=excluded.config,change_reason=excluded.change_reason,updated_by=v_user,updated_at=now();
 select to_jsonb(f) into v_new from public.platform_feature_controls f where feature_key=p_feature_key;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,old_data,new_data) values(v_user,'platform_feature_control.upsert','platform_feature_control',null,coalesce(v_old,'{}'::jsonb),v_new);
 return v_new;
end $$;
revoke all on function public.admin_upsert_feature_control(text,boolean,integer,text,jsonb,text) from public,anon;
grant execute on function public.admin_upsert_feature_control(text,boolean,integer,text,jsonb,text) to authenticated;
