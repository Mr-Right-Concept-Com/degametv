begin;

create or replace function public.run_event_settlement_maintenance()
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_count integer;
begin
  perform set_config('request.jwt.claim.role','service_role',true);
  v_count:=public.refresh_event_settlement_holds(500);
  delete from public.event_early_bird_reservations
   where reservation_status='reserved' and expires_at<=now();
  update public.event_access_invites
     set status='expired'
   where status in ('pending','sent') and expires_at is not null and expires_at<=now();
  return v_count;
end;
$$;
revoke all on function public.run_event_settlement_maintenance() from public,anon,authenticated;
grant execute on function public.run_event_settlement_maintenance() to postgres;

do $$
begin
  if exists(select 1 from pg_namespace where nspname='cron') then
    perform cron.unschedule(jobid) from cron.job where jobname='degame-event-settlement-maintenance';
    perform cron.schedule(
      'degame-event-settlement-maintenance',
      '*/5 * * * *',
      'select public.run_event_settlement_maintenance();'
    );
  end if;
end $$;

commit;