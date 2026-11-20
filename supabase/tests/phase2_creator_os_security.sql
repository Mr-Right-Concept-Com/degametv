-- Phase 2 security contract tests. Run after migrations with psql/Supabase CLI.
begin;
do $$
declare
  v_rls boolean;
  v_force boolean;
  v_def text;
begin
  select relrowsecurity,relforcerowsecurity into v_rls,v_force from pg_class where oid='public.studio_accounts'::regclass;
  if not v_rls then raise exception 'studio_accounts must enforce RLS'; end if;
  if exists(select 1 from pg_class where oid in ('public.content'::regclass,'public.screenings'::regclass,'public.release_domains'::regclass,'public.studio_memberships'::regclass,'public.creator_verification_cases'::regclass) and not relrowsecurity) then
    raise exception 'Phase 2 creator, content, screening, domain and team tables must enforce RLS';
  end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.content'::regclass and tgname='content_creator_lifecycle_guard' and not tgisinternal) then
    raise exception 'content lifecycle transition trigger is missing';
  end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.screenings'::regclass and tgname='screenings_immutable_creator_price_currency' and not tgisinternal) then
    raise exception 'screening creator currency immutability trigger is missing';
  end if;
  select relrowsecurity,relforcerowsecurity into v_rls,v_force from pg_class where oid='public.media_upload_sessions'::regclass;
  if not v_rls or not v_force then raise exception 'media_upload_sessions must enforce RLS'; end if;
  select relrowsecurity,relforcerowsecurity into v_rls,v_force from pg_class where oid='public.media_processing_jobs'::regclass;
  if not v_rls or not v_force then raise exception 'media_processing_jobs must enforce RLS'; end if;
  if not has_column_privilege('authenticated','public.studio_accounts','id','select') then
    raise exception 'authenticated creator account safe projection is missing';
  end if;
  if has_table_privilege('authenticated','public.studio_accounts','select') then
    raise exception 'browser roles must not have table-wide studio account reads';
  end if;
  if has_column_privilege('authenticated','public.studio_accounts','bank_account_number','select')
     or has_column_privilege('authenticated','public.studio_accounts','tax_id','select') then
    raise exception 'legacy plaintext bank and tax columns must not be readable by browser roles';
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
  if has_function_privilege('authenticated','public.get_media_worker_secret()','execute')
     or has_function_privilege('authenticated','public.get_media_transcoder_callback_secret()','execute') then
    raise exception 'browser roles must not read media worker or callback tokens';
  end if;
  if not has_function_privilege('service_role','public.get_media_worker_secret()','execute')
     or not has_function_privilege('service_role','public.get_media_transcoder_callback_secret()','execute') then
    raise exception 'service-role media token access is not configured';
  end if;
  if not exists(select 1 from vault.decrypted_secrets where name='degame-media-worker-token')
     or not exists(select 1 from vault.decrypted_secrets where name='degame-media-transcoder-callback-token') then
    raise exception 'media worker and callback tokens must be stored in Vault';
  end if;
  if not exists(select 1 from cron.job where jobname='degame-media-ingest-worker' and active) then
    raise exception 'durable media worker cron dispatcher is not active';
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
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='studio_memberships') then
    raise exception 'studio membership row-level policies are required';
  end if;
  if not exists(select 1 from pg_indexes where schemaname='public' and tablename='media_upload_sessions' and indexdef ilike '%owner_id%') then
    raise exception 'owner-scoped upload session lookup index is required';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='media_upload_sessions' and column_name='chunk_size_bytes') then
    raise exception 'multipart chunk sizing is not persisted';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='content' and column_name='hls_manifest_url')
     or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='content' and column_name='dash_manifest_url') then
    raise exception 'content playback rendition fields are missing';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='studio_invitations' and policyname='studio_invitations_backend_only') then
    raise exception 'studio invitation browser deny policy missing';
  end if;
  if has_function_privilege('authenticated','public.accept_studio_invitation(uuid,uuid,text)','execute')
     or not has_function_privilege('service_role','public.accept_studio_invitation(uuid,uuid,text)','execute') then
    raise exception 'atomic invitation acceptance must be service-role-only';
  end if;
end $$;
rollback;