alter table public.withdrawal_requests alter column account_secret_ref set not null;
alter table public.withdrawal_requests alter column account_number set not null;
do $$begin
 if not exists(select 1 from pg_constraint where conrelid='public.withdrawal_requests'::regclass and conname='withdrawal_account_number_masked_check') then
  alter table public.withdrawal_requests add constraint withdrawal_account_number_masked_check check(account_number ~ '^\\*{4}[A-Za-z0-9]{4}$');
 end if;
end $$;
comment on column public.withdrawal_requests.account_number is 'Masked suffix only; full bank details are mandatory Vault secrets referenced by account_secret_ref.';
