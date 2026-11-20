alter table public.withdrawal_requests
 add column if not exists approved_at timestamptz,
 add column if not exists approved_by uuid references auth.users(id),
 add column if not exists rejected_at timestamptz,
 add column if not exists rejected_by uuid references auth.users(id),
 add column if not exists processing_at timestamptz,
 add column if not exists processing_by uuid references auth.users(id),
 add column if not exists payout_reference text,
 add column if not exists payout_provider_key text,
 add column if not exists paid_at timestamptz,
 add column if not exists failure_reason text;
create index if not exists withdrawal_requests_status_created_idx on public.withdrawal_requests(status,created_at desc);
revoke select,insert,update,delete on table public.withdrawal_requests from anon,authenticated;
grant select(id,user_id,amount,currency,bank_name,account_name,bank_country,status,admin_note,created_at,updated_at,approved_at,rejected_at,processing_at,payout_reference,payout_provider_key,paid_at,failure_reason)
 on table public.withdrawal_requests to authenticated;
grant all on table public.withdrawal_requests to service_role;
comment on table public.withdrawal_requests is
'Financial OS withdrawal request records. Bank account numbers are server-only and are never exposed through PostgREST/GraphQL; all admin transitions are performed through privileged audited Edge Functions.';
comment on column public.withdrawal_requests.account_number is
'Highly sensitive bank account number. Service-role only; never grant SELECT to anon/authenticated. Frontend receives only last four digits from the privileged payout listing endpoint.';
