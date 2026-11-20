-- Phase 1 platform foundations: security boundary, FX snapshots, branding, AI policy and deterministic releases.
-- Additive migration: preserves the existing event, ticket, wallet, provider and notification systems.

create table if not exists public.platform_fx_rate_cache (
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  quote_currency text not null check (quote_currency ~ '^[A-Z]{3}$'),
  rate numeric(30,14) not null check (rate > 0),
  provider_key text not null,
  retrieved_at timestamptz not null,
  expires_at timestamptz not null,
  provider_payload_hash text,
  created_at timestamptz not null default now(),
  primary key (base_currency, quote_currency, provider_key),
  check (base_currency <> quote_currency),
  check (expires_at > retrieved_at)
);
create index if not exists platform_fx_rate_cache_expiry_idx on public.platform_fx_rate_cache(expires_at);

create table if not exists public.platform_branding_registry (
  brand_key text primary key,
  brand_config jsonb not null,
  is_public boolean not null default false,
  version bigint not null default 1 check (version > 0),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint platform_branding_registry_key_check check (brand_key ~ '^[a-z][a-z0-9_.-]{1,80}$'),
  constraint platform_branding_registry_config_check check (jsonb_typeof(brand_config) = 'object')
);

create table if not exists public.platform_ai_policies (
  workflow_key text primary key,
  enabled boolean not null default false,
  capability text not null default 'ai_text',
  provider_allowlist text[] not null default '{}',
  model_key text,
  max_input_chars integer not null default 24000 check (max_input_chars between 1 and 200000),
  max_output_tokens integer not null default 1200 check (max_output_tokens between 1 and 16000),
  allowed_data_classes text[] not null default array['public','user_content']::text[],
  requires_human_review boolean not null default true,
  allow_financial_decisions boolean not null default false check (allow_financial_decisions = false),
  allow_identity_decisions boolean not null default false check (allow_identity_decisions = false),
  system_policy text not null,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint platform_ai_policy_workflow_key_check check (workflow_key ~ '^[a-z][a-z0-9_.-]{1,100}$')
);

create table if not exists public.platform_release_rollouts (
  id uuid primary key default gen_random_uuid(),
  release_key text not null unique,
  release_version text not null,
  state text not null default 'draft' check (state in ('draft','validated','canary','approved','paused','rolled_back')),
  traffic_percentage integer not null default 0 check (traffic_percentage between 0 and 100),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  health_window_seconds integer not null default 300 check (health_window_seconds between 30 and 86400),
  minimum_samples integer not null default 20 check (minimum_samples between 1 and 1000000),
  error_rate_threshold numeric(8,6) not null default 0.020000 check (error_rate_threshold between 0 and 1),
  latency_p95_threshold_ms integer not null default 3000 check (latency_p95_threshold_ms between 1 and 120000),
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  rolled_back_by uuid,
  rolled_back_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_release_rollouts_key_check check (release_key ~ '^[a-z][a-z0-9_.-]{1,100}$'),
  constraint platform_release_rollouts_state_traffic_check check (
    (state = 'canary' and traffic_percentage between 1 and 99)
    or (state = 'approved' and traffic_percentage = 100)
    or (state in ('draft','validated','paused','rolled_back') and traffic_percentage = 0)
  )
);
create table if not exists public.platform_release_audit (
  id uuid primary key default gen_random_uuid(),
  rollout_id uuid not null references public.platform_release_rollouts(id) on delete restrict,
  actor_id uuid,
  action text not null check (action in ('created','validated','canary_started','traffic_changed','approved','paused','rolled_back')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists platform_release_audit_rollout_idx on public.platform_release_audit(rollout_id,created_at desc);

-- Existing profile fields already hold country/currency/language/locale/timezone preferences.
-- Add a dedicated locale preference column while preserving old values.
alter table public.profiles add column if not exists preferred_locale text;
update public.profiles
set preferred_locale = coalesce(nullif(preferred_locale,''), nullif(locale_code,''), nullif(language,'en'), 'en')
where preferred_locale is null or preferred_locale = '';
alter table public.profiles alter column preferred_locale set default 'en';

-- Immutable transaction snapshots are additive. Values are populated by the transaction
-- creation/payment-confirmation code paths; no historical rates are fabricated.
do $$
declare t text;
begin
  foreach t in array array[
    'payments','event_contributions','guest_payment_orders','live_payment_orders',
    'wallet_ledger','withdrawal_requests','payment_refunds','tickets','screening_tickets'
  ] loop
    if to_regclass(format('public.%I',t)) is not null then
      execute format('alter table public.%I add column if not exists original_currency text',t);
      execute format('alter table public.%I add column if not exists creator_base_currency text',t);
      execute format('alter table public.%I add column if not exists platform_base_currency text',t);
      execute format('alter table public.%I add column if not exists settlement_currency text',t);
      execute format('alter table public.%I add column if not exists payout_currency text',t);
      execute format('alter table public.%I add column if not exists fx_rate numeric(30,14)',t);
      execute format('alter table public.%I add column if not exists fx_provider text',t);
      execute format('alter table public.%I add column if not exists fx_timestamp timestamptz',t);
    end if;
  end loop;
end $$;

-- Sensitive operational tables intentionally have no end-user Data API surface.
-- service_role bypasses RLS and is the only application role granted table privileges.
do $$
declare t text;
begin
  foreach t in array array[
    'email_provider_configs','event_early_bird_reservations','guest_payment_orders',
    'live_payment_orders','payment_provider_configs','payment_refunds',
    'platform_feature_controls','screening_playback_sessions','service_provider_bindings',
    'stream_provider_event_logs'
  ] loop
    if to_regclass(format('public.%I',t)) is not null then
      execute format('revoke all privileges on table public.%I from anon, authenticated',t);
      execute format('grant all privileges on table public.%I to service_role',t);
      execute format('comment on table public.%I is %L',t,
        'Internal operational data. No anon/authenticated Data API access; service_role only. RLS enabled with deny-by-default policies.');
    end if;
  end loop;
end $$;

alter table public.platform_fx_rate_cache enable row level security;
alter table public.platform_fx_rate_cache force row level security;
alter table public.platform_branding_registry enable row level security;
alter table public.platform_ai_policies enable row level security;
alter table public.platform_release_rollouts enable row level security;
alter table public.platform_release_audit enable row level security;

revoke all on public.platform_fx_rate_cache from anon, authenticated;
grant all on public.platform_fx_rate_cache to service_role;
revoke all on public.platform_ai_policies from anon, authenticated;
grant all on public.platform_ai_policies to service_role;
revoke all on public.platform_release_rollouts from anon, authenticated;
grant all on public.platform_release_rollouts to service_role;
revoke all on public.platform_release_audit from anon, authenticated;
grant all on public.platform_release_audit to service_role;
revoke all on public.platform_branding_registry from anon, authenticated;
grant select on public.platform_branding_registry to anon, authenticated;
grant all on public.platform_branding_registry to service_role;

drop policy if exists platform_branding_public_read on public.platform_branding_registry;
create policy platform_branding_public_read on public.platform_branding_registry
for select to anon, authenticated using (is_public = true);

comment on table public.platform_fx_rate_cache is 'Provider-sourced FX cache. Never insert estimated rates; entries are time-bounded and provider-attributed.';
comment on table public.platform_ai_policies is 'Server-enforced AI workflow policy. Financial and identity decisions are explicitly prohibited.';
comment on table public.platform_release_rollouts is 'Deterministic runtime release rollout configuration; state transitions are performed by privileged control-plane actions.';
comment on table public.platform_release_audit is 'Append-only release lifecycle audit trail.';
comment on table public.platform_branding_registry is 'Centralized versioned brand tokens consumed by web, PWA, native and dynamic storefront clients.';

-- The public contribution-feed SECURITY DEFINER functions are intentional public read APIs.
-- Their bodies enforce published content/event visibility and omit private invite-only events.
-- The release-domain resolver is also a public hostname lookup. Preserve these three explicit grants;
-- all other SECURITY DEFINER public functions remain inaccessible to anon.
revoke execute on all functions in schema public from public;
grant execute on function public.get_content_support_feed(uuid) to anon, authenticated, service_role;
grant execute on function public.get_event_contribution_feed(uuid,uuid) to anon, authenticated, service_role;
grant execute on function public.resolve_release_domain(text) to anon, authenticated, service_role;

create or replace function public.get_platform_release_assignment(p_release_key text, p_subject_id uuid)
returns table(rollout_id uuid, release_version text, assigned boolean, cohort_basis text)
language plpgsql stable security definer
set search_path = public, auth, pg_temp
as $$
declare v_rollout public.platform_release_rollouts%rowtype; v_bucket integer;
begin
  if p_subject_id is null or p_release_key is null then
    raise exception 'release_key_and_subject_required' using errcode='22023';
  end if;
  if auth.uid() is not null and auth.uid() <> p_subject_id and not public.is_super_admin(auth.uid()) then
    raise exception 'subject_mismatch' using errcode='42501';
  end if;
  if auth.uid() is null and current_user not in ('service_role','postgres','supabase_admin') then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  select * into v_rollout from public.platform_release_rollouts
    where release_key = p_release_key and state in ('canary','approved');
  if not found then return query select null::uuid,null::text,false,'not_released'::text; return; end if;
  v_bucket := mod(hashtextextended(p_release_key || ':' || p_subject_id::text, 0) & 9223372036854775807, 10000)::integer;
  return query select v_rollout.id,v_rollout.release_version,
    (v_rollout.state='approved' or v_bucket < v_rollout.traffic_percentage * 100),
    'sha256_stable_subject_assignment'::text;
end;
$$;
revoke all on function public.get_platform_release_assignment(text,uuid) from public, anon;
grant execute on function public.get_platform_release_assignment(text,uuid) to authenticated, service_role;

-- Default policy rows are disabled until a verified AI provider and workflow policy are configured.
insert into public.platform_ai_policies(workflow_key,enabled,capability,provider_allowlist,allowed_data_classes,requires_human_review,system_policy)
values
 ('creator.metadata',false,'ai_text','{}',array['public','user_content'],true,'Assist with metadata drafting and classification. Never assert rights ownership, legal compliance, age suitability, or verification as fact. Return uncertainty and require creator review.'),
 ('creator.pricing',false,'ai_text','{}',array['public','user_content','aggregate_metrics'],true,'Provide non-binding pricing and schedule suggestions only. Do not change prices, publish, or commit transactions.'),
 ('broadcast.moderation',false,'ai_moderation','{}',array['public','user_generated_content'],true,'Classify policy risks and provide moderation recommendations. Escalate uncertain or high-impact decisions to a human moderator.'),
 ('discovery.semantic',false,'ai_embeddings','{}',array['public','user_content'],false,'Generate semantic retrieval features only from content authorized for discovery. Enforce visibility and entitlement filters outside the model.'),
 ('support.first_response',false,'ai_text','{}',array['public','user_generated_content','support_knowledge'],true,'Ground answers only in approved knowledgebase content. Never claim payment, refund, payout, identity, KYC, or account outcomes. Verify financial and account facts against authoritative database records.'),
 ('finance.anomaly_triage',false,'ai_text','{}',array['aggregate_metrics','operational_telemetry'],true,'Flag anomalies for authorized human review. Never approve refunds, release settlement, change payout status, or make account verification decisions.')
on conflict(workflow_key) do nothing;

-- Seed centralized branding from the current canonical platform_settings branding object if present.
insert into public.platform_branding_registry(brand_key,brand_config,is_public)
select 'platform.default',setting_value,true
from public.platform_settings where setting_key='branding' and jsonb_typeof(setting_value)='object'
on conflict(brand_key) do nothing;
