create or replace function public.support_touch_ticket_from_message()
returns trigger language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_is_agent boolean;
begin
 select exists(select 1 from public.support_agents a where a.user_id=new.sender_id and a.is_active) into v_is_agent;
 update public.support_tickets set last_message_at=now(),updated_at=now(),status=case
  when new.is_internal then status
  when v_is_agent and status<>'closed' then 'awaiting_user'
  when not v_is_agent and status<>'closed' then 'awaiting_support'
  else status end where id=new.ticket_id;
 return new;
end;$$;
revoke all on function public.support_touch_ticket_from_message() from public,anon,authenticated;
