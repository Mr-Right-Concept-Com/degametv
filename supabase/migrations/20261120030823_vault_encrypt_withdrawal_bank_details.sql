alter table public.withdrawal_requests add column if not exists account_secret_ref uuid references vault.secrets(id) on delete restrict;
do $$ declare r record;v_ref uuid;v_last4 text;begin
 for r in select id,account_number from public.withdrawal_requests where account_secret_ref is null and account_number is not null loop
  v_ref:=vault.create_secret(r.account_number,'degame-withdrawal-'||r.id::text||'-v1','Encrypted withdrawal bank account details',null);
  v_last4:=right(regexp_replace(r.account_number,'[^A-Za-z0-9]','','g'),4);
  update public.withdrawal_requests set account_secret_ref=v_ref,account_number='****'||v_last4 where id=r.id;
 end loop;
end $$;
create or replace function public.request_wallet_withdrawal(p_amount numeric,p_currency text,p_bank_country text,p_bank_name text,p_account_number text,p_account_name text)
returns jsonb language plpgsql security definer set search_path=public,vault,auth,pg_temp as $$
declare v_user uuid:=auth.uid();v_settled numeric:=0;v_reserved numeric:=0;v_available numeric:=0;v_request public.withdrawal_requests%rowtype;v_secret_ref uuid;v_last4 text;
begin
 if v_user is null then raise exception 'Authentication required.' using errcode='42501';end if;
 if p_amount is null or p_amount<=0 or p_currency !~ '^[A-Z]{3}$' or p_bank_country !~ '^[A-Z]{2}$'
  or length(trim(coalesce(p_bank_name,'')))<2 or length(trim(coalesce(p_account_name,'')))<2 or trim(coalesce(p_account_number,'')) !~ '^[A-Za-z0-9 -]{4,34}$' then
  raise exception 'Invalid payout request details.' using errcode='22023';end if;
 if not exists(select 1 from public.country_currency_rules where country_code=p_bank_country and enabled)
  or not exists(select 1 from public.country_currency_rules where currency_code=p_currency and enabled) then raise exception 'Unsupported payout country or currency.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text||':'||p_currency,0));
 select coalesce(sum(l.net),0) into v_settled from public.wallet_ledger l where l.user_id=v_user and l.currency=p_currency and l.settles_at<=now();
 select coalesce(sum(w.amount),0) into v_reserved from public.withdrawal_requests w where w.user_id=v_user and w.currency=p_currency and w.status not in ('rejected','failed');
 v_available:=v_settled-v_reserved;
 if p_amount>v_available then raise exception 'Insufficient settled funds for % withdrawal. Available: %.',p_currency,greatest(v_available,0) using errcode='22023';end if;
 v_secret_ref:=vault.create_secret(trim(p_account_number),'degame-withdrawal-'||gen_random_uuid()::text||'-v1','Encrypted withdrawal bank account details',null);
 v_last4:=right(regexp_replace(trim(p_account_number),'[^A-Za-z0-9]','','g'),4);
 insert into public.withdrawal_requests(user_id,amount,currency,bank_country,bank_name,account_number,account_secret_ref,account_name,status)
 values(v_user,p_amount,p_currency,p_bank_country,trim(p_bank_name),'****'||v_last4,v_secret_ref,trim(p_account_name),'pending') returning * into v_request;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data) values(v_user,'wallet.withdrawal_requested','withdrawal_request',v_request.id,
  jsonb_build_object('amount',p_amount,'currency',p_currency,'bank_country',p_bank_country,'status','pending'));
 return jsonb_build_object('id',v_request.id,'amount',v_request.amount,'currency',v_request.currency,'bank_country',v_request.bank_country,'status',v_request.status,'created_at',v_request.created_at,'available_after_request',v_available-p_amount);
end $$;
revoke all on function public.request_wallet_withdrawal(numeric,text,text,text,text,text) from public,anon;
grant execute on function public.request_wallet_withdrawal(numeric,text,text,text,text,text) to authenticated;
create or replace function public.get_withdrawal_bank_details(p_request_id uuid)
returns table(request_id uuid,user_id uuid,bank_country text,bank_name text,account_name text,account_number text)
language sql stable security definer set search_path=public,vault,pg_temp as $$
 select w.id,w.user_id,w.bank_country,w.bank_name,w.account_name,s.decrypted_secret from public.withdrawal_requests w
 join vault.decrypted_secrets s on s.id=w.account_secret_ref where w.id=p_request_id and w.status in ('approved','processing') and w.account_secret_ref is not null;
$$;
revoke all on function public.get_withdrawal_bank_details(uuid) from public,anon,authenticated;
grant execute on function public.get_withdrawal_bank_details(uuid) to service_role;
comment on function public.get_withdrawal_bank_details(uuid) is 'Service-role-only payout adapter lookup. Decrypts bank details from Vault only for approved or processing withdrawals; never exposed to browser roles.';
comment on column public.withdrawal_requests.account_number is 'Masked account suffix only. Full bank account details are encrypted in Supabase Vault and referenced by account_secret_ref.';
