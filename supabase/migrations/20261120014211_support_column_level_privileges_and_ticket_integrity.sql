drop policy if exists support_tickets_create_owner on public.support_tickets;
create policy support_tickets_create_owner on public.support_tickets for insert to authenticated
with check (user_id=(select auth.uid()) and assigned_agent_id is null and status='open' and priority='normal' and department='general' and resolved_at is null and closed_at is null and escalated_at is null and first_responded_at is null);
revoke insert,update,delete on public.support_tickets from authenticated;
grant insert(user_id,subject,category,description,related_content_id,related_event_id,related_transaction_reference,channel) on public.support_tickets to authenticated;
grant update(assigned_agent_id,status,resolution,satisfaction_rating,resolved_at,closed_at,escalated_at,updated_at,department) on public.support_tickets to authenticated;
grant select on public.support_tickets to authenticated;
revoke insert,update,delete on public.support_messages from authenticated;
grant insert(ticket_id,sender_id,body,is_internal) on public.support_messages to authenticated;
grant select on public.support_messages to authenticated;
revoke insert,update,delete on public.support_agents from authenticated;
grant select on public.support_agents to authenticated;
grant insert(user_id,display_name,department,is_active) on public.support_agents to authenticated;
grant update(display_name,department,is_active,updated_at) on public.support_agents to authenticated;
