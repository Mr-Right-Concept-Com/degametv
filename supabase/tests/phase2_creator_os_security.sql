-- Phase 2 security contract tests. Run after migrations with psql/Supabase CLI.
begin;
do $$
declare
  v_rls boolean;
  v_force boolean;
  v_def text;
begin
  select relrowsecurity,relforcerowsecurity into v_rls,v_force from pg_class where oid='public.studio_accounts'::regclass;
  if not v_rls or not v_force then raise exception 'studio_accounts must enforce RLS'; end if;
  select relrowsecurity,relforcerowsecurity into v_rls,v_force from pg_class where oid='public.media_upload_sessions'::regclass;
  if not v_rls or not v_force then raise exception 'media_upload_sessions must enforce RLS'; end if;
  select relrowsecurity,relforcerowsecurity into v_rls,v_force from pg_class where oid='public.media_processing_jobs'::regclass;
  if not v_rls or not v_force then raise exception 'media_processing_jobs must enforce RLS'; end if;
  if has_table_privilege('authenticated','public.studio_accounts','select') is false then
    raise exception 'authenticated creator account read access contract missing';
  end if;
  if has_column_privilege('authenticated','public.studio_accounts','tax_secret_ref','select')
     or has_column_privilege('authenticated','public.studio_accounts','payout_bank_secret_ref','select') then
    raise exception 'Vault secret references must not be readable by browser roles';
  end if;
  if has_function_privilege('authenticated','public.store_creator_vault_material(uuid,text,text)','execute') then
    raise exception 'browser roles must not write Vault materials';
  end if;
  if not has_function_privilege('service_role','public.store_creator_vault_material(uuid,text,text)','execute') then
    raise exception 'service role must be able to store Vault materials';
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.release_domains'::regclass and conname like '%hostname%') then
    raise exception 'release domain hostname uniqueness constraint/index is missing';
  end if;
  if not exists(select 1 from pg_indexes where schemaname='public' and tablename='release_domains' and indexdef ilike '%unique%hostname%') then
    raise exception 'release_domains hostname uniqueness index is required to prevent slug races';
  end if;
  select pg_get_functiondef('public.enforce_creator_content_lifecycle()'::regprocedure) into v_def;
  if position('invalid_content_lifecycle_transition' in v_def)=0 then raise exception 'content lifecycle guard is missing'; end if;
  if not exists(select 1 from pg_proc where proname='claim_media_processing_jobs' and prosecdef) then
    raise exception 'durable worker claim RPC must be SECURITY DEFINER';
  end if;
  if has_function_privilege('authenticated','public.claim_media_processing_jobs(text,integer)','execute') then
    raise exception 'browser roles must not claim media jobs';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='studio_invitations' and policyname='studio_invitations_backend_only') then
    raise exception 'studio invitation browser deny policy missing';
  end if;
end $$;
rollback;