revoke all on public.withdrawal_requests from anon, authenticated;
grant select on public.withdrawal_requests to authenticated;
grant update(status) on public.withdrawal_requests to authenticated;
