alter table public.support_tickets
  add column if not exists department text not null default 'general',
  add column if not exists escalated_at timestamptz,
  add column if not exists last_message_at timestamptz not null default now();

create index if not exists support_tickets_agent_queue_idx
  on public.support_tickets(department,status,priority,last_message_at desc);

create or replace function public.support_touch_ticket_from_message()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare v_is_agent boolean;
begin
  select exists(select 1 from public.support_agents a where a.user_id=new.sender_id and a.is_active) into v_is_agent;
  update public.support_tickets
  set last_message_at=now(), updated_at=now(),
      status=case
        when new.is_internal then status
        when v_is_agent and status not in ('closed','resolved') then 'awaiting_user'
        when not v_is_agent and status not in ('closed','resolved') then 'awaiting_support'
        else status end
  where id=new.ticket_id;
  return new;
end;
$$;
revoke all on function public.support_touch_ticket_from_message() from public,anon,authenticated;
drop trigger if exists support_message_touch_ticket on public.support_messages;
create trigger support_message_touch_ticket after insert on public.support_messages
for each row execute function public.support_touch_ticket_from_message();
alter table public.support_tickets replica identity full;
alter table public.support_messages replica identity full;
