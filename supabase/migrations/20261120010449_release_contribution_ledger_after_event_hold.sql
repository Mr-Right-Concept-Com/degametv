create or replace function public.refresh_event_settlement_holds(p_limit integer default 500)
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_count integer:=0; r record;
begin
 if auth.role()<>'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
 if p_limit<1 or p_limit>5000 then raise exception 'invalid_batch_limit' using errcode='22023'; end if;
 for r in
  select id,source_type,source_id,release_at
  from public.event_settlement_holds
  where hold_status='held'
  order by created_at
  limit p_limit
  for update skip locked
 loop
  update public.event_settlement_holds
   set event_ended_at=event_ended_at,delivery_confirmed_at=delivery_confirmed_at,updated_at=now()
   where id=r.id;
  update public.event_settlement_holds
   set hold_status='eligible',updated_at=now()
   where id=r.id and hold_status='held' and release_at is not null and release_at<=now();
  if found then
   v_count:=v_count+1;
   if r.source_type='ticket' then
    update public.wallet_ledger set settles_at=r.release_at where ticket_id=r.source_id and kind='sale';
   elsif r.source_type in ('tip','gift') then
    update public.wallet_ledger set settles_at=r.release_at where event_contribution_id=r.source_id;
   end if;
  end if;
 end loop;
 return v_count;
end;
$$;
revoke all on function public.refresh_event_settlement_holds(integer) from public,anon,authenticated;
grant execute on function public.refresh_event_settlement_holds(integer) to service_role;