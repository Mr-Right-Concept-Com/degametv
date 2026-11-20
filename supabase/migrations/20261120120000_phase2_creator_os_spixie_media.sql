-- Phase 2 Creator OS, native production domains and durable media pipeline.
-- Existing canonical tables are extended; creator, screening, content and domain data are not duplicated.
begin;

do $$ begin
  create type public.creator_entity_type as enum ('INDIVIDUAL_CREATOR','STUDIO','PRODUCTION_COMPANY','BUSINESS');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.creator_verification_status as enum
    ('DRAFT','SUBMITTED','UNDER_REVIEW','ADDITIONAL_INFO_REQUIRED','APPROVED','REJECTED','SUSPENDED','APPEAL_PENDING');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.creator_content_lifecycle as enum
    ('DRAFT','REVIEW','APPROVED','SCHEDULED','PUBLISHED','UPDATED','WITHDRAWN','ARCHIVED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.production_domain_status as enum
    ('PENDING_DNS','VERIFYING','PROVISIONING_SSL','ACTIVE','FAILED','SUSPENDED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.media_processing_status as enum
    ('INITIALIZED','UPLOADING','UPLOADED','QUARANTINED','SCANNING','PROMOTING','TRANSCODING','READY','RETRY_WAIT','DEAD_LETTER','CANCELLED','FAILED');
exception when duplicate_object then null; end $$;

-- The approved studio account remains the creator identity. Base currency is write-once.
alter table public.studio_accounts
  add column if not exists entity_type public.creator_entity_type not null default 'INDIVIDUAL_CREATOR',
  add column if not exists country_code text,
  add column if not exists base_currency text,
  add column if not exists verification_status public.creator_verification_status not null default 'DRAFT',
  add column if not exists rights_declaration jsonb not null default '{}'::jsonb,
  add column if not exists tax_country text,
  add column if not exists tax_secret_ref uuid references vault.secrets(id) on delete restrict,
  add column if not exists tax_identifier_suffix text,
  add column if not exists payout_bank_secret_ref uuid references vault.secrets(id) on delete restrict,
  add column if not exists payout_bank_suffix text,
  add column if not exists payout_bank_country text,
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_name text,
  add column if not exists verification_submitted_at timestamptz,
  add column if not exists verification_reviewed_at timestamptz,
  add column if not exists verification_reviewed_by uuid references auth.users(id),
  add column if not exists verification_reason text;
do $$ begin
  alter table public.studio_accounts add constraint studio_accounts_country_iso_check
    check (country_code is null or country_code ~ '^[A-Z]{2}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.studio_accounts add constraint studio_accounts_base_currency_iso_check
    check (base_currency is null or base_currency ~ '^[A-Z]{3}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.studio_accounts add constraint studio_accounts_secret_suffix_check
    check ((payout_bank_secret_ref is null and payout_bank_suffix is null) or
           (payout_bank_secret_ref is not null and payout_bank_suffix ~ '^[A-Za-z0-9]{4}$'));
exception when duplicate_object then null; end $$;
comment on column public.studio_accounts.tax_secret_ref is 'Vault secret reference only. Raw tax identifiers are never stored in public columns.';
comment on column public.studio_accounts.payout_bank_secret_ref is 'Vault secret reference only. Browser roles cannot decrypt or retrieve payout account numbers.';
revoke select (tax_secret_ref,payout_bank_secret_ref) on table public.studio_accounts from anon,authenticated;
comment on table public.studio_accounts is E'@graphql({"description":"Canonical creator/studio identity and verification state. Sensitive tax and payout values are Vault references only; private fields are not exposed to browser roles."})';

create or replace function public.prevent_creator_base_currency_change()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if old.base_currency is not null and new.base_currency is distinct from old.base_currency then
    raise exception 'creator_base_currency_is_immutable' using errcode='23514';
  end if;
  if new.base_currency is not null and not exists (
    select 1 from public.country_currency_rules r
    where r.currency_code=new.base_currency and r.enabled
  ) then
    raise exception 'unsupported_creator_base_currency' using errcode='22023';
  end if;
  return new;
end $$;
drop trigger if exists studio_accounts_immutable_base_currency on public.studio_accounts;
create trigger studio_accounts_immutable_base_currency
before update of base_currency on public.studio_accounts
for each row execute function public.prevent_creator_base_currency_change();

-- A case is the review/audit envelope for the existing studio account, identity and KYB records.
create table if not exists public.creator_verification_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  studio_account_id uuid,
  entity_type public.creator_entity_type not null,
  status public.creator_verification_status not null default 'DRAFT',
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  requirements_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(requirements_snapshot)='object'),
  rights_declaration jsonb not null default '{}'::jsonb check (jsonb_typeof(rights_declaration)='object'),
  identity_verification_id uuid references public.identity_verifications(id) on delete set null,
  business_verification_id uuid references public.business_verifications(id) on delete set null,
  provider_key text,
  provider_reference text,
  provider_status text,
  additional_information jsonb not null default '{}'::jsonb,
  appeal_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists creator_verification_one_open_case_per_user
  on public.creator_verification_cases(user_id)
  where status in ('DRAFT','SUBMITTED','UNDER_REVIEW','ADDITIONAL_INFO_REQUIRED','APPEAL_PENDING');
create index if not exists creator_verification_review_queue_idx
  on public.creator_verification_cases(status,submitted_at) where status in ('SUBMITTED','UNDER_REVIEW','APPEAL_PENDING');
alter table public.creator_verification_cases enable row level security;
alter table public.creator_verification_cases force row level security;
revoke all on public.creator_verification_cases from anon,authenticated;
grant select on public.creator_verification_cases to authenticated;
grant all on public.creator_verification_cases to service_role;
create policy creator_verification_case_owner_read on public.creator_verification_cases
  for select to authenticated using (user_id=(select auth.uid()));
comment on table public.creator_verification_cases is E'@graphql({"description":"Private creator verification workflow envelope. Owner read-only; review mutations are backend-only."})';

-- Append-only creator verification and governance audit.
create table if not exists public.creator_verification_audit (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.creator_verification_cases(id) on delete restrict,
  actor_id uuid references auth.users(id),
  action text not null check (action in ('created','submitted','provider_dispatched','review_started','additional_info_requested','approved','rejected','suspended','appeal_submitted','appeal_resolved','role_provisioned')),
  from_status public.creator_verification_status,
  to_status public.creator_verification_status,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details)='object'),
  created_at timestamptz not null default now()
);
create index if not exists creator_verification_audit_case_idx on public.creator_verification_audit(case_id,created_at desc);
alter table public.creator_verification_audit enable row level security;
alter table public.creator_verification_audit force row level security;
revoke all on public.creator_verification_audit from anon,authenticated;
grant select on public.creator_verification_audit to authenticated;
grant all on public.creator_verification_audit to service_role;
create policy creator_verification_audit_owner_read on public.creator_verification_audit
  for select to authenticated using (exists(
    select 1 from public.creator_verification_cases c where c.id=case_id and c.user_id=(select auth.uid())
  ));
comment on table public.creator_verification_audit is E'@graphql({"description":"Append-only creator verification audit history; visible only to the applicant and privileged backend reviewers."})';

-- Team RBAC is scoped to the canonical studio_accounts identity, never to a parallel tenant.
create table if not exists public.studio_memberships (
  id uuid primary key default gen_random_uuid(),
  studio_account_id uuid not null references public.studio_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('OWNER','ADMIN','PRODUCER','BROADCASTER','FINANCE_VIEWER','MODERATOR')),
  invited_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(studio_account_id,user_id)
);
create index if not exists studio_memberships_user_active_idx on public.studio_memberships(user_id,studio_account_id) where revoked_at is null;
create table if not exists public.studio_invitations (
  id uuid primary key default gen_random_uuid(),
  studio_account_id uuid not null references public.studio_accounts(id) on delete cascade,
  email text not null check (email=lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  invited_user_id uuid references auth.users(id) on delete restrict,
  role text not null check (role in ('ADMIN','PRODUCER','BROADCASTER','FINANCE_VIEWER','MODERATOR')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists studio_invitations_pending_idx on public.studio_invitations(studio_account_id,expires_at) where accepted_at is null and revoked_at is null;
alter table public.studio_memberships enable row level security;
alter table public.studio_memberships force row level security;
alter table public.studio_invitations enable row level security;
alter table public.studio_invitations force row level security;
revoke all on public.studio_memberships,public.studio_invitations from anon,authenticated;
grant select on public.studio_memberships to authenticated;
grant all on public.studio_memberships,public.studio_invitations to service_role;
create policy studio_membership_self_read on public.studio_memberships for select to authenticated
  using (user_id=(select auth.uid()) or exists(
    select 1 from public.studio_memberships own
    where own.studio_account_id=studio_memberships.studio_account_id
      and own.user_id=(select auth.uid()) and own.role in ('OWNER','ADMIN')
      and own.revoked_at is null and own.accepted_at is not null
  ));
comment on table public.studio_memberships is E'@graphql({"description":"Studio-scoped role membership. Self/admin membership read only; all writes use authenticated server workflows."})';
comment on table public.studio_invitations is E'@graphql({"description":"Private invitation tokens and email addresses. Backend-only; never exposed through GraphQL or the Data API."})';

-- Reusable authorization predicate for studio-owned content, screenings and streams.
create or replace function public.is_active_studio_member(p_studio_account_id uuid,p_roles text[] default null)
returns boolean language sql stable security definer set search_path=public,auth,pg_temp as $$
  select auth.uid() is not null and exists(
    select 1 from public.studio_memberships m
    where m.studio_account_id=p_studio_account_id and m.user_id=auth.uid()
      and m.accepted_at is not null and m.revoked_at is null
      and (p_roles is null or m.role=any(p_roles))
  );
$$;
revoke all on function public.is_active_studio_member(uuid,text[]) from public,anon;
grant execute on function public.is_active_studio_member(uuid,text[]) to authenticated,service_role;
comment on function public.is_active_studio_member(uuid,text[]) is 'Studio RBAC predicate; binds the subject to auth.uid() and active accepted membership.';

-- Canonical content table receives the complete Phase 2 preset and lifecycle contract.
alter table public.content
  add column if not exists lifecycle_state public.creator_content_lifecycle not null default 'DRAFT',
  add column if not exists creator_base_currency text,
  add column if not exists territory_rights jsonb not null default '{}'::jsonb,
  add column if not exists rights_status text not null default 'DECLARED',
  add column if not exists rights_reviewed_at timestamptz,
  add column if not exists lifecycle_updated_at timestamptz not null default now();
do $$ begin
  alter table public.content add constraint content_creator_base_currency_check
    check (creator_base_currency is null or creator_base_currency ~ '^[A-Z]{3}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.content add constraint content_territory_rights_object_check
    check (jsonb_typeof(territory_rights)='object');
exception when duplicate_object then null; end $$;
comment on column public.content.lifecycle_state is 'Authoritative creator publishing lifecycle; status remains the legacy catalogue projection.';
comment on table public.content is E'@graphql({"description":"Canonical content catalogue with creator publishing lifecycle and territory rights. Existing content identity is preserved.","max_rows":50})';

create table if not exists public.content_rights_declarations (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete restrict,
  creator_id uuid not null references auth.users(id) on delete restrict,
  declaration jsonb not null check (jsonb_typeof(declaration)='object'),
  declaration_hash text not null check (declaration_hash ~ '^[a-f0-9]{64}$'),
  declared_at timestamptz not null default now(),
  supersedes_id uuid references public.content_rights_declarations(id) on delete restrict
);
create index if not exists content_rights_declarations_content_idx on public.content_rights_declarations(content_id,declared_at desc);
alter table public.content_rights_declarations enable row level security;
alter table public.content_rights_declarations force row level security;
revoke all on public.content_rights_declarations from anon,authenticated;
grant select on public.content_rights_declarations to authenticated;
grant all on public.content_rights_declarations to service_role;
create policy content_rights_owner_read on public.content_rights_declarations for select to authenticated
 using (creator_id=(select auth.uid()));
comment on table public.content_rights_declarations is E'@graphql({"description":"Immutable versioned creator rights declarations. Creator can read own declarations; writes are server-validated."})';

alter table public.screenings
  add column if not exists price_amount numeric(20,6),
  add column if not exists price_currency text,
  add column if not exists replay_price_amount numeric(20,6),
  add column if not exists replay_price_currency text,
  add column if not exists territory_allowlist text[] not null default '{}',
  add column if not exists territory_blocklist text[] not null default '{}';
do $$ begin
  alter table public.screenings add constraint screenings_creator_price_currency_check
    check ((price_amount is null and price_currency is null) or (price_amount>=0 and price_currency ~ '^[A-Z]{3}$'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.screenings add constraint screenings_replay_price_currency_check
    check ((replay_price_amount is null and replay_price_currency is null) or (replay_price_amount>=0 and replay_price_currency ~ '^[A-Z]{3}$'));
exception when duplicate_object then null; end $$;
comment on column public.screenings.price_currency is 'Immutable creator base currency snapshot for this screening price; regional legacy columns remain compatibility projections.';

-- Extend the existing release_domains registry instead of creating a competing production_domains table.
alter table public.release_domains
  add column if not exists verification_token_hash text,
  add column if not exists dns_target text,
  add column if not exists ssl_status text not null default 'not_requested',
  add column if not exists ssl_certificate_expires_at timestamptz,
  add column if not exists verification_status public.production_domain_status,
  add column if not exists seo_metadata jsonb not null default '{}'::jsonb,
  add column if not exists branding_version bigint,
  add column if not exists verified_at timestamptz,
  add column if not exists last_verification_at timestamptz,
  add column if not exists verification_error text;
update public.release_domains set verification_status=
  case when status='active' then 'ACTIVE'::public.production_domain_status
       when status='suspended' then 'SUSPENDED'::public.production_domain_status
       else 'PENDING_DNS'::public.production_domain_status end
where verification_status is null;
create unique index if not exists release_domains_subdomain_unique on public.release_domains(subdomain);
create index if not exists release_domains_verification_queue_idx on public.release_domains(verification_status,updated_at);
comment on table public.release_domains is E'@graphql({"description":"Canonical per-production storefront hostname registry. Includes DNS ownership and SSL lifecycle; no duplicate production domain table.","max_rows":50})';

create table if not exists public.media_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  content_id uuid references public.content(id) on delete restrict,
  studio_account_id uuid references public.studio_accounts(id) on delete restrict,
  object_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  expected_size_bytes bigint not null check (expected_size_bytes>0),
  expected_sha256 text check (expected_sha256 is null or expected_sha256 ~ '^[a-f0-9]{64}$'),
  received_size_bytes bigint not null default 0 check (received_size_bytes>=0),
  storage_upload_id text,
  chunk_manifest jsonb not null default '[]'::jsonb check (jsonb_typeof(chunk_manifest)='array'),
  status public.media_processing_status not null default 'INITIALIZED',
  expires_at timestamptz not null,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (received_size_bytes<=expected_size_bytes),
  check (object_path like 'quarantine/%')
);
create index if not exists media_upload_sessions_owner_idx on public.media_upload_sessions(owner_id,created_at desc);
create index if not exists media_upload_sessions_expiry_idx on public.media_upload_sessions(expires_at) where status in ('INITIALIZED','UPLOADING');
alter table public.media_upload_sessions enable row level security;
alter table public.media_upload_sessions force row level security;
revoke all on public.media_upload_sessions from anon,authenticated;
grant select on public.media_upload_sessions to authenticated;
grant all on public.media_upload_sessions to service_role;
create policy media_upload_owner_read on public.media_upload_sessions for select to authenticated using(owner_id=(select auth.uid()));
comment on table public.media_upload_sessions is E'@graphql({"description":"Private resumable upload session metadata. Objects are confined to quarantine; only owner can read session status."})';

create table if not exists public.media_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  upload_session_id uuid not null references public.media_upload_sessions(id) on delete restrict,
  content_id uuid references public.content(id) on delete restrict,
  idempotency_key text not null unique,
  status public.media_processing_status not null default 'QUARANTINED',
  stage text not null default 'inspection' check (stage in ('inspection','malware_scan','promotion','transcode','package','complete')),
  attempts integer not null default 0 check (attempts>=0),
  max_attempts integer not null default 8 check (max_attempts between 1 and 20),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  dead_lettered_at timestamptz,
  quarantine_path text not null check (quarantine_path like 'quarantine/%'),
  clean_master_path text,
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  provenance jsonb not null default '{}'::jsonb,
  renditions jsonb not null default '[]'::jsonb check (jsonb_typeof(renditions)='array'),
  subtitles jsonb not null default '[]'::jsonb check (jsonb_typeof(subtitles)='array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists media_processing_claim_idx on public.media_processing_jobs(available_at,created_at)
 where status in ('QUARANTINED','RETRY_WAIT');
create index if not exists media_processing_owner_content_idx on public.media_processing_jobs(content_id,created_at desc);
alter table public.media_processing_jobs enable row level security;
alter table public.media_processing_jobs force row level security;
revoke all on public.media_processing_jobs from anon,authenticated;
grant all on public.media_processing_jobs to service_role;
comment on table public.media_processing_jobs is E'@graphql({"description":"Backend-only durable media processing queue. Quarantine objects are never directly readable by browser roles."})';

-- Durable queue claiming is atomic and service-role-only.
create or replace function public.claim_media_processing_jobs(p_worker text,p_limit integer default 5)
returns setof public.media_processing_jobs language plpgsql security definer
set search_path=public,pg_temp as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  if p_worker is null or length(btrim(p_worker))<3 or p_limit not between 1 and 20 then
    raise exception 'invalid_worker_claim' using errcode='22023';
  end if;
  return query
  with picked as (
    select id from public.media_processing_jobs
    where status in ('QUARANTINED','RETRY_WAIT') and available_at<=now()
      and (locked_at is null or locked_at<now()-interval '15 minutes')
    order by available_at,created_at
    for update skip locked limit p_limit
  )
  update public.media_processing_jobs j set status='SCANNING',locked_at=now(),locked_by=p_worker,
    attempts=j.attempts+1,updated_at=now()
  from picked where j.id=picked.id returning j.*;
end $$;
revoke all on function public.claim_media_processing_jobs(text,integer) from public,anon,authenticated;
grant execute on function public.claim_media_processing_jobs(text,integer) to service_role;

-- No browser write access to workflow, vault references, or processing outputs.
revoke insert,update,delete on public.creator_verification_cases,public.creator_verification_audit,
  public.studio_memberships,public.studio_invitations,public.content_rights_declarations,
  public.media_upload_sessions,public.media_processing_jobs from anon,authenticated;
grant select on public.creator_verification_cases,public.creator_verification_audit,
  public.studio_memberships,public.content_rights_declarations,public.media_upload_sessions to authenticated;


-- Complete content-format contract (kept as text so new formats do not require unsafe enum casts).
alter table public.content add column if not exists content_format text;
update public.content set content_format=coalesce(content_format,preset_type::text,'FILM');
do $ begin
  alter table public.content add constraint content_format_allowed_check
  check (content_format in ('FILM','SERIES','SEASON','EPISODE','SHORT','TRAILER','MUSIC_VIDEO','PODCAST','GAMING','SPORTS','EDUCATIONAL','VOD','LIVE_PRODUCTION','RECORDED_EVENT','REPLAY'));
exception when duplicate_object then null; end $$;

create table if not exists public.creator_content_lifecycle_audit (
  id bigint generated always as identity primary key,
  content_id uuid not null references public.content(id) on delete restrict,
  actor_id uuid references auth.users(id),
  from_state public.creator_content_lifecycle,
  to_state public.creator_content_lifecycle not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists creator_content_lifecycle_audit_content_idx
  on public.creator_content_lifecycle_audit(content_id,created_at desc);
alter table public.creator_content_lifecycle_audit enable row level security;
alter table public.creator_content_lifecycle_audit force row level security;
revoke all on public.creator_content_lifecycle_audit from anon,authenticated;
grant select on public.creator_content_lifecycle_audit to authenticated;
grant all on public.creator_content_lifecycle_audit to service_role;
create policy creator_content_lifecycle_audit_owner_read on public.creator_content_lifecycle_audit
 for select to authenticated using (exists(
   select 1 from public.content c where c.id=content_id and c.creator_id=(select auth.uid())
 ));
comment on table public.creator_content_lifecycle_audit is E'@graphql({"description":"Append-only publishing lifecycle history. Visible only to the owning creator; state changes are server-validated."})';

create or replace function public.enforce_creator_content_lifecycle()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_allowed boolean;
begin
  if tg_op='INSERT' then
    if new.creator_base_currency is null then
      select sa.base_currency into new.creator_base_currency
      from public.studio_accounts sa where sa.user_id=new.creator_id and sa.status='approved';
    end if;
    if new.lifecycle_state not in ('DRAFT','REVIEW') then
      raise exception 'new_content_must_start_as_draft' using errcode='23514';
    end if;
    return new;
  end if;
  if old.creator_base_currency is not null and new.creator_base_currency is distinct from old.creator_base_currency then
    raise exception 'content_creator_base_currency_is_immutable' using errcode='23514';
  end if;
  if new.lifecycle_state is distinct from old.lifecycle_state then
    v_allowed := case old.lifecycle_state
      when 'DRAFT' then new.lifecycle_state in ('REVIEW','ARCHIVED')
      when 'REVIEW' then new.lifecycle_state in ('DRAFT','APPROVED','WITHDRAWN')
      when 'APPROVED' then new.lifecycle_state in ('SCHEDULED','PUBLISHED','WITHDRAWN')
      when 'SCHEDULED' then new.lifecycle_state in ('PUBLISHED','WITHDRAWN')
      when 'PUBLISHED' then new.lifecycle_state in ('UPDATED','WITHDRAWN','ARCHIVED')
      when 'UPDATED' then new.lifecycle_state in ('PUBLISHED','WITHDRAWN','ARCHIVED')
      when 'WITHDRAWN' then new.lifecycle_state in ('REVIEW','ARCHIVED')
      when 'ARCHIVED' then false
      else false end;
    if not v_allowed then
      raise exception 'invalid_content_lifecycle_transition:%->%',old.lifecycle_state,new.lifecycle_state using errcode='23514';
    end if;
    new.lifecycle_updated_at:=now();
    insert into public.creator_content_lifecycle_audit(content_id,actor_id,from_state,to_state,reason)
    values(old.id,auth.uid(),old.lifecycle_state,new.lifecycle_state,'lifecycle_transition');
  end if;
  return new;
end $$;
drop trigger if exists content_creator_lifecycle_guard on public.content;
create trigger content_creator_lifecycle_guard
before insert or update of lifecycle_state,creator_base_currency on public.content
for each row execute function public.enforce_creator_content_lifecycle();

-- Explicit deny policies document backend-only access while keeping RLS policy-complete.
create policy studio_invitations_backend_only on public.studio_invitations
 for all to anon,authenticated using (false) with check (false);
create policy media_processing_jobs_backend_only on public.media_processing_jobs
 for all to anon,authenticated using (false) with check (false);


create or replace function public.audit_creator_content_insert()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  insert into public.creator_content_lifecycle_audit(content_id,actor_id,from_state,to_state,reason)
  values(new.id,auth.uid(),null,new.lifecycle_state,'content_created');
  return new;
end $$;
drop trigger if exists content_creator_lifecycle_audit_insert on public.content;
create trigger content_creator_lifecycle_audit_insert
after insert on public.content for each row execute function public.audit_creator_content_insert();

-- Edge-function-only Vault write boundary. Raw values are accepted only by this RPC,
-- immediately moved into Vault, and never returned to the caller.
create or replace function public.store_creator_vault_material(
  p_user_id uuid,p_bank_account_number text default null,p_tax_identifier text default null
) returns jsonb language plpgsql security definer
set search_path=public,vault,auth,pg_temp as $$
declare v_bank_ref uuid; v_tax_ref uuid; v_bank_suffix text; v_tax_suffix text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  if p_user_id is null then raise exception 'creator_user_required' using errcode='22023'; end if;
  if nullif(btrim(coalesce(p_bank_account_number,'')),'') is not null then
    if btrim(p_bank_account_number) !~ '^[A-Za-z0-9 -]{4,34}
      raise exception 'invalid_bank_account_number' using errcode='22023';
    end if;
    v_bank_suffix:=right(regexp_replace(btrim(p_bank_account_number),'[^A-Za-z0-9]','','g'),4);
    v_bank_ref:=vault.create_secret(btrim(p_bank_account_number),'creator-payout-'||p_user_id::text||'-'||gen_random_uuid()::text,'Creator payout account',null);
  end if;
  if nullif(btrim(coalesce(p_tax_identifier,'')),'') is not null then
    if length(btrim(p_tax_identifier)) not between 4 and 64 then
      raise exception 'invalid_tax_identifier' using errcode='22023';
    end if;
    v_tax_suffix:=right(regexp_replace(btrim(p_tax_identifier),'[^A-Za-z0-9]','','g'),4);
    v_tax_ref:=vault.create_secret(btrim(p_tax_identifier),'creator-tax-'||p_user_id::text||'-'||gen_random_uuid()::text,'Creator tax identifier',null);
  end if;
  update public.studio_accounts set
    payout_bank_secret_ref=coalesce(v_bank_ref,payout_bank_secret_ref),
    payout_bank_suffix=coalesce(v_bank_suffix,payout_bank_suffix),
    tax_secret_ref=coalesce(v_tax_ref,tax_secret_ref),
    tax_identifier_suffix=coalesce(v_tax_suffix,tax_identifier_suffix),
    updated_at=now()
  where user_id=p_user_id;
  if not found then raise exception 'studio_account_not_found' using errcode='P0002'; end if;
  return jsonb_build_object('bank_masked_suffix',case when v_bank_suffix is null then null else '****'||v_bank_suffix end,
    'tax_masked_suffix',case when v_tax_suffix is null then null else '****'||v_tax_suffix end,
    'bank_stored',v_bank_ref is not null,'tax_stored',v_tax_ref is not null);
end $$;
revoke all on function public.store_creator_vault_material(uuid,text,text) from public,anon,authenticated;
grant execute on function public.store_creator_vault_material(uuid,text,text) to service_role;

commit;
 then
      raise exception 'invalid_bank_account_number' using errcode='22023';
    end if;
    v_bank_suffix:=right(regexp_replace(btrim(p_bank_account_number),'[^A-Za-z0-9]','','g'),4);
    v_bank_ref:=vault.create_secret(btrim(p_bank_account_number),'creator-payout-'||p_user_id::text||'-'||gen_random_uuid()::text,'Creator payout account',null);
  end if;
  if nullif(btrim(coalesce(p_tax_identifier,'')),'') is not null then
    if length(btrim(p_tax_identifier)) not between 4 and 64 then
      raise exception 'invalid_tax_identifier' using errcode='22023';
    end if;
    v_tax_suffix:=right(regexp_replace(btrim(p_tax_identifier),'[^A-Za-z0-9]','','g'),4);
    v_tax_ref:=vault.create_secret(btrim(p_tax_identifier),'creator-tax-'||p_user_id::text||'-'||gen_random_uuid()::text,'Creator tax identifier',null);
  end if;
  update public.studio_accounts set
    payout_bank_secret_ref=coalesce(v_bank_ref,payout_bank_secret_ref),
    payout_bank_suffix=coalesce(v_bank_suffix,payout_bank_suffix),
    tax_secret_ref=coalesce(v_tax_ref,tax_secret_ref),
    tax_identifier_suffix=coalesce(v_tax_suffix,tax_identifier_suffix),
    updated_at=now()
  where user_id=p_user_id;
  if not found then raise exception 'studio_account_not_found' using errcode='P0002'; end if;
  return jsonb_build_object('bank_masked_suffix',case when v_bank_suffix is null then null else '****'||v_bank_suffix end,
    'tax_masked_suffix',case when v_tax_suffix is null then null else '****'||v_tax_suffix end,
    'bank_stored',v_bank_ref is not null,'tax_stored',v_tax_ref is not null);
end $$;
revoke all on function public.store_creator_vault_material(uuid,text,text) from public,anon,authenticated;
grant execute on function public.store_creator_vault_material(uuid,text,text) to service_role;

commit;
