revoke all on public.support_agents, public.support_tickets, public.support_messages from anon;
revoke insert, update, delete on public.knowledgebase_categories, public.knowledgebase_articles from anon, authenticated;

create policy support_tickets_update_agent on public.support_tickets
  for update to authenticated
  using (exists (select 1 from public.support_agents a where a.user_id = (select auth.uid()) and a.is_active))
  with check (exists (select 1 from public.support_agents a where a.user_id = (select auth.uid()) and a.is_active));

create policy support_messages_create_agent on public.support_messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and exists (select 1 from public.support_agents a where a.user_id = (select auth.uid()) and a.is_active)
    and exists (select 1 from public.support_tickets t where t.id = ticket_id)
  );

grant update on public.support_tickets to authenticated;
