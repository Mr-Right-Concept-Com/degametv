-- Run with: supabase test db --linked
begin;
do $$
declare
 v_actor uuid;
 v_request uuid;
 v_result jsonb;
 v_secret_ref uuid;
 v_bank_data text;
begin
 select user_id into v_actor from public.user_roles where role='super_admin' limit 1;
 if v_actor is null then raise exception 'verified_super_admin_missing';end if;
 v_secret_ref:=vault.create_secret(repeat('1',10),'phase1-withdrawal-test-'||gen_random_uuid()::text,'Synthetic test bank details',null);
 insert into public.withdrawal_requests(user_id,amount,currency,bank_name,account_number,account_secret_ref,account_name,bank_country,status)
 values(v_actor,1,'NGN','Phase1 test bank','****1111',v_secret_ref,'Phase1 Test','NG','pending')
 returning id into v_request;
 v_result:=public.transition_withdrawal_request(v_request,'approve',v_actor,'Phase 1 approval test');
 if v_result ? 'account_number' or v_result ? 'account_secret_ref' then raise exception 'withdrawal_transition_returned_sensitive_bank_data';end if;
 if v_result->>'status'<>'approved' then raise exception 'withdrawal_transition_not_approved';end if;
 select account_number into v_bank_data from public.withdrawal_requests where id=v_request;
 if v_bank_data<>'****1111' then raise exception 'withdrawal_account_number_not_masked';end if;
 select account_number into v_bank_data from public.get_withdrawal_bank_details(v_request);
 if v_bank_data<>repeat('1',10) then raise exception 'vault_withdrawal_secret_decryption_failed';end if;
 if not exists(select 1 from public.audit_logs where entity_type='withdrawal_request' and entity_id=v_request and action='withdrawal.approved') then
  raise exception 'withdrawal_transition_audit_missing';
 end if;
 if not exists(select 1 from public.withdrawal_requests where id=v_request and status='approved' and approved_by=v_actor and approved_at is not null) then
  raise exception 'withdrawal_approval_metadata_missing';
 end if;
end $$;
rollback;
