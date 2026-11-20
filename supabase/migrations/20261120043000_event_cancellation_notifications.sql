create or replace function public.enqueue_event_cancellation_notifications(p_screening_id uuid)
returns integer
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare v_count integer;
begin
 if current_setting('request.jwt.claim.role',true)<>'service_role' then raise exception 'service_role_required' using errcode='42501';end if;
 with event_row as (
  select id,tenant_id,title from public.screenings where id=p_screening_id and lifecycle='cancelled'
 ), recipients as (
  select coalesce(nullif(lower(st.email),''),lower(u.email)) as email
  from public.screening_tickets st left join auth.users u on u.id=st.user_id
  where st.screening_id=p_screening_id and st.payment_status in ('completed','paid')
  union
  select coalesce(nullif(lower(t.guest_email),''),lower(u.email)) as email
  from public.tickets t left join auth.users u on u.id=t.user_id
  where t.metadata->>'screening_id'=p_screening_id::text
  union
  select lower(i.invited_email) from public.event_access_invites i
  where i.screening_id=p_screening_id and i.status='accepted'
 )
 insert into public.event_notification_outbox(
  tenant_id,screening_id,recipient_email,notification_type,idempotency_key,payload,scheduled_for,status
 )
 select e.tenant_id,e.id,r.email,'event_cancelled',
  'event-cancelled-'||e.id::text||'-'||md5(r.email),
  jsonb_build_object('subject','Event cancelled: '||e.title,'text','The event "'||e.title||'" has been cancelled. Any eligible ticket refund is being processed through the original payment provider.'),
  now(),'pending'
 from event_row e cross join recipients r where r.email is not null
 on conflict(idempotency_key) do nothing;
 get diagnostics v_count=row_count;
 return v_count;
end;
$$;
revoke all on function public.enqueue_event_cancellation_notifications(uuid) from public,anon,authenticated;
grant execute on function public.enqueue_event_cancellation_notifications(uuid) to service_role;