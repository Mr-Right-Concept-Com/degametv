drop policy if exists support_tickets_update_agent on public.support_tickets;
create policy support_tickets_update_agent on public.support_tickets
for update to authenticated
using (
  exists (select 1 from public.support_agents a where a.user_id=(select auth.uid()) and a.is_active)
  and (assigned_agent_id is null or assigned_agent_id=(select auth.uid()))
)
with check (
  exists (select 1 from public.support_agents a where a.user_id=(select auth.uid()) and a.is_active)
  and assigned_agent_id=(select auth.uid())
);

drop policy if exists support_messages_create_agent on public.support_messages;
create policy support_messages_create_agent on public.support_messages
for insert to authenticated
with check (
  sender_id=(select auth.uid())
  and exists (select 1 from public.support_agents a where a.user_id=(select auth.uid()) and a.is_active)
  and exists (select 1 from public.support_tickets t where t.id=ticket_id and t.assigned_agent_id=(select auth.uid()))
);
