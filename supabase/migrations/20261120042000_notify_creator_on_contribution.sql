begin;
alter table public.event_notification_outbox drop constraint if exists event_notification_outbox_notification_type_check;
alter table public.event_notification_outbox add constraint event_notification_outbox_notification_type_check
 check(notification_type=any(array['ticket_confirmation','early_bird_access','event_reminder','event_started','private_invitation','event_cancelled','replay_ready','refund_update','contribution_received']));

create or replace function public.enqueue_creator_contribution_notification()
returns trigger
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare v_email text;v_title text;v_name text;
begin
 if new.status<>'paid' or old.status is not distinct from new.status then return new;end if;
 select email into v_email from auth.users where id=new.creator_id;
 if v_email is null then return new;end if;
 if new.screening_id is not null then
  select title into v_title from public.screenings where id=new.screening_id;
 else
  select title into v_title from public.live_streams where id=new.live_stream_id;
 end if;
 v_name:=case when new.is_anonymous then 'An anonymous viewer' else coalesce(nullif(new.contributor_name,''),'A viewer') end;
 insert into public.event_notification_outbox(
  tenant_id,screening_id,live_stream_id,recipient_email,notification_type,idempotency_key,payload,scheduled_for,status
 ) values(
  new.tenant_id,new.screening_id,new.live_stream_id,v_email,'contribution_received',
  'contribution-paid-'||new.id::text,
  jsonb_build_object(
   'subject','You received a new creator contribution on DeGameTV',
   'text',v_name||' sent a '||new.contribution_type||' of '||coalesce(new.amount_major::text,new.amount_minor::text)||' '||new.currency||' for '||coalesce(v_title,'your event')||'.'
  ),now(),'pending'
 ) on conflict(idempotency_key) do nothing;
 return new;
end;
$$;
drop trigger if exists event_contribution_notify_creator on public.event_contributions;
create trigger event_contribution_notify_creator
after update of status on public.event_contributions
for each row execute function public.enqueue_creator_contribution_notification();
revoke all on function public.enqueue_creator_contribution_notification() from public,anon,authenticated;
commit;