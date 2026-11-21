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

  -- Every public SECURITY DEFINER function has a pinned path with pg_temp last.
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and not exists (
        select 1 from pg_options_to_table(p.proconfig) o
        where o.option_name='search_path'
          and (string_to_array(replace(o.option_value,' ',''),','))[array_length(string_to_array(replace(o.option_value,' ',''),','),1)]='pg_temp'
      )
  ) then raise exception 'public SECURITY DEFINER function has an unpinned or unsafe search_path'; end if;

  -- Only published-content feed/resolution endpoints are public SECURITY DEFINER RPCs.
  if exists (
    select 1 from pg_proc p
    where p.prosecdef and p.pronamespace='public'::regnamespace
      and has_function_privilege('anon',p.oid,'execute')
      and p.proname not in ('get_content_support_feed','get_event_contribution_feed',
        'get_event_contribution_leaderboard','get_event_contribution_totals','resolve_release_domain')
  ) then raise exception 'unexpected anonymous SECURITY DEFINER execute grant'; end if;

  -- Credential and queue worker routines must remain service-role-only.
  if has_function_privilege('anon','public.get_media_worker_secret()','execute')
     or has_function_privilege('authenticated','public.get_media_worker_secret()','execute')
     or not has_function_privilege('service_role','public.get_media_worker_secret()','execute')
     or has_function_privilege('anon','public.get_media_transcoder_callback_secret()','execute')
     or has_function_privilege('authenticated','public.get_media_transcoder_callback_secret()','execute')
     or not has_function_privilege('service_role','public.get_media_transcoder_callback_secret()','execute')
     or has_function_privilege('authenticated','public.get_service_provider_runtime_config(text)','execute')
     or not has_function_privilege('service_role','public.get_service_provider_runtime_config(text)','execute')
     or has_function_privilege('authenticated','public.claim_media_processing_jobs(text,integer)','execute')
     or not has_function_privilege('service_role','public.claim_media_processing_jobs(text,integer)','execute') then
    raise exception 'media worker privileged functions have incorrect EXECUTE grants'; end if;

  -- Preserve authenticated self-service wallet, tenant and support APIs.
  if not has_function_privilege('authenticated','public.get_my_tenant_config()','execute')
     or not has_function_privilege('authenticated','public.get_my_wallet_activity(integer,timestamp with time zone)','execute')
     or not has_function_privilege('authenticated','public.get_my_personal_wallet_balances()','execute')
     or not has_function_privilege('authenticated','public.create_support_chat()','execute')
     or not has_function_privilege('authenticated','public.reopen_support_ticket(uuid)','execute') then
    raise exception 'required authenticated self-service RPC grants were removed'; end if;
end $$;
rollback;