-- Pass 4B database security and isolation invariants.
-- Run with: supabase test db
begin;
do $$
declare
  v_options text[];
  v_view text;
  v_definition text;
  v_policy_count integer;
begin
  -- Personal stored-value wallet: owner-keyed accounts, non-negative balances,
  -- and immutable client-side ledger access. Creator earnings stay separate.
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.personal_wallet_accounts'::regclass
      and contype='p' and pg_get_constraintdef(oid) ilike '%user_id%currency%'
  ) then raise exception 'personal wallet must be keyed by user and currency'; end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.personal_wallet_accounts'::regclass
      and contype='c' and pg_get_constraintdef(oid) ilike '%balance_minor%>=%0%'
  ) then raise exception 'personal wallet overdraft constraint missing'; end if;
  if has_table_privilege('authenticated','public.personal_wallet_ledger','insert')
     or has_table_privilege('authenticated','public.personal_wallet_ledger','update')
     or has_table_privilege('authenticated','public.personal_wallet_ledger','delete') then
    raise exception 'authenticated clients must not mutate personal wallet ledger'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='personal_wallet_accounts'
    and qual ilike '%auth.uid()%') then raise exception 'personal wallet account owner isolation policy missing'; end if;
  if to_regclass('public.wallet_ledger') is null then raise exception 'creator earnings ledger is missing'; end if;
  if to_regclass('public.personal_wallet_ledger') = to_regclass('public.wallet_ledger') then
    raise exception 'personal wallet and creator earnings ledgers must remain distinct'; end if;

  -- Unified entitlement view must execute under invoker permissions and mark
  -- refunded/revoked/expired tickets inactive rather than granting playback.
  select reloptions into v_options from pg_class where oid='public.user_ticket_entitlements'::regclass;
  if not coalesce(v_options @> array['security_invoker=true'],false) then
    raise exception 'user_ticket_entitlements must use security_invoker'; end if;
  select pg_get_viewdef('public.user_ticket_entitlements'::regclass,true) into v_view;
  if position('refunded' in lower(v_view))=0 or position('revoked' in lower(v_view))=0
     or position('is_active' in lower(v_view))=0 then
    raise exception 'unified entitlements must explicitly classify refunded/revoked rows and active status'; end if;
  if not exists(select 1 from pg_indexes where schemaname='public' and tablename='live_streams'
    and indexdef ilike '%unique%' and indexdef ilike '%provisioning_idempotency_key%') then
    raise exception 'live stream provisioning idempotency unique index missing'; end if;
  if not exists(select 1 from pg_constraint where conrelid='public.stream_provider_event_logs'::regclass
    and contype='u' and pg_get_constraintdef(oid) ilike '%provider_key%provider_event_id%') then
    raise exception 'provider event replay unique constraint missing'; end if;
  if exists(select 1 from pg_indexes where schemaname='public' and tablename='stream_provider_event_logs'
    and indexname='stream_provider_event_logs_provider_event_uidx') then
    raise exception 'redundant provider event unique index remains'; end if;

  -- Operating-hours schedule is public read/admin write. SLA audit is
  -- invisible to public and readable only by super-admin/assigned agents.
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='support_operating_hours'
    and policyname='support_operating_hours_public_read' and cmd='SELECT') then
    raise exception 'support operating-hours public read policy missing'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='support_operating_hours'
    and policyname='support_operating_hours_admin_manage' and cmd='ALL') then
    raise exception 'support operating-hours admin write policy missing'; end if;
  if has_table_privilege('anon','public.support_sla_escalation_events','select') then
    raise exception 'anonymous role must not read SLA escalation events'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='support_sla_escalation_events'
    and policyname='support_sla_escalation_admin_read' and cmd='SELECT') then
    raise exception 'scoped support escalation admin read policy missing'; end if;
  select pg_get_functiondef('public.escalate_breached_support_tickets(integer)'::regprocedure) into v_definition;
  if position('service_role_required' in v_definition)=0
     or position('search_path' in lower(v_definition))=0 then
    raise exception 'SLA escalation worker must be service-role guarded with pinned search_path'; end if;
  if has_function_privilege('authenticated','public.escalate_breached_support_tickets(integer)','execute') then
    raise exception 'authenticated clients must not execute SLA escalation worker'; end if;
end $$;
rollback;
