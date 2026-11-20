drop policy if exists support_attachment_read on storage.objects;
create policy support_attachment_read on storage.objects for select to authenticated using(
 bucket_id='support-attachments' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
 and exists(select 1 from public.support_tickets t where t.id::text=(storage.foldername(name))[1]
  and ((t.user_id=(select auth.uid()) and exists(select 1 from public.support_messages m where m.ticket_id=t.id and name=any(m.attachment_paths) and m.is_internal=false))
   or (t.assigned_agent_id=(select auth.uid()) and exists(select 1 from public.support_agents a where a.user_id=(select auth.uid()) and a.is_active))))
);
