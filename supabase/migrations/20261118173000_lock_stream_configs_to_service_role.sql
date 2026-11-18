begin;
drop policy if exists "Owners manage stream configs" on public.stream_configs;
drop policy if exists "Service role manages stream configs" on public.stream_configs;
create policy "Service role manages stream configs" on public.stream_configs
  for all to service_role using (true) with check (true);
revoke all on table public.stream_configs from anon, authenticated;
commit;
