alter table public.support_tickets add column if not exists channel text not null default 'ticket';
alter table public.support_tickets drop constraint if exists support_tickets_channel_check;
alter table public.support_tickets add constraint support_tickets_channel_check check(channel in ('ticket','live_chat'));
create index if not exists support_tickets_live_chat_queue_idx on public.support_tickets(channel,status,last_message_at desc);
drop policy if exists knowledgebase_categories_admin_manage on public.knowledgebase_categories;
create policy knowledgebase_categories_admin_manage on public.knowledgebase_categories for all to authenticated using(public.is_super_admin((select auth.uid()))) with check(public.is_super_admin((select auth.uid())));
drop policy if exists knowledgebase_articles_admin_manage on public.knowledgebase_articles;
create policy knowledgebase_articles_admin_manage on public.knowledgebase_articles for all to authenticated using(public.is_super_admin((select auth.uid()))) with check(public.is_super_admin((select auth.uid())));
grant insert,update,delete on public.knowledgebase_categories,public.knowledgebase_articles to authenticated;
create or replace function public.create_support_chat() returns jsonb language plpgsql security definer set search_path to 'public','auth','pg_temp' as $function$
declare v_user uuid:=auth.uid();v_ticket public.support_tickets%rowtype;
begin
 if v_user is null then raise exception 'authentication_required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text||':support-live-chat',0));
 select * into v_ticket from public.support_tickets where user_id=v_user and channel='live_chat' and status not in ('resolved','closed') order by created_at desc limit 1 for update;
 if not found then
  insert into public.support_tickets(user_id,subject,category,priority,status,description,channel)
  values(v_user,'Live support chat','other','normal','open','Live support conversation started from the user dashboard.','live_chat') returning * into v_ticket;
 end if;
 return jsonb_build_object('id',v_ticket.id,'ticket_number',v_ticket.ticket_number,'user_id',v_ticket.user_id,'subject',v_ticket.subject,'category',v_ticket.category,'priority',v_ticket.priority,'status',v_ticket.status,'description',v_ticket.description,'assigned_agent_id',v_ticket.assigned_agent_id,'department',v_ticket.department,'channel',v_ticket.channel,'created_at',v_ticket.created_at,'last_message_at',v_ticket.last_message_at);
end;$function$;
revoke all on function public.create_support_chat() from public,anon;
grant execute on function public.create_support_chat() to authenticated;
create or replace function public.reopen_support_ticket(p_ticket_id uuid) returns jsonb language plpgsql security definer set search_path to 'public','auth','pg_temp' as $function$
declare v_ticket public.support_tickets%rowtype;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501';end if;
 update public.support_tickets set status='open',resolved_at=null,closed_at=null,updated_at=now(),last_message_at=now() where id=p_ticket_id and user_id=auth.uid() and status in ('resolved','closed') returning * into v_ticket;
 if not found then raise exception 'ticket_not_reopenable' using errcode='22023';end if;
 return jsonb_build_object('id',v_ticket.id,'ticket_number',v_ticket.ticket_number,'status',v_ticket.status);
end;$function$;
revoke all on function public.reopen_support_ticket(uuid) from public,anon;
grant execute on function public.reopen_support_ticket(uuid) to authenticated;
