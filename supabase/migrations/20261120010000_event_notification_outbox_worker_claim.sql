create or replace function public.claim_event_notification_outbox(p_limit integer default 50)
returns setof public.event_notification_outbox
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
 if auth.role()<>'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
 if p_limit<1 or p_limit>200 then raise exception 'invalid_batch_limit' using errcode='22023'; end if;
 return query
 with picked as (
  select id from public.event_notification_outbox
  where (status='pending' and scheduled_for<=now())
     or (status='processing' and created_at<now()-interval '15 minutes')
  order by scheduled_for,created_at
  limit p_limit
  for update skip locked
 )
 update public.event_notification_outbox o
 set status='processing',attempts=o.attempts+1,last_error=null
 from picked
 where o.id=picked.id
 returning o.*;
end;
$$;
revoke all on function public.claim_event_notification_outbox(integer) from public,anon,authenticated;
grant execute on function public.claim_event_notification_outbox(integer) to service_role;