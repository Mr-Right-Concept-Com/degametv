alter table public.support_tickets
  add column if not exists channel text not null default 'ticket'
  check (channel in ('ticket','live_chat'));
create index if not exists support_tickets_live_chat_queue_idx
  on public.support_tickets(channel,status,last_message_at desc)
  where channel='live_chat';

drop policy if exists knowledgebase_categories_admin_manage on public.knowledgebase_categories;
create policy knowledgebase_categories_admin_manage on public.knowledgebase_categories
for all to authenticated
using (public.is_super_admin((select auth.uid())))
with check (public.is_super_admin((select auth.uid())));

drop policy if exists knowledgebase_articles_admin_manage on public.knowledgebase_articles;
create policy knowledgebase_articles_admin_manage on public.knowledgebase_articles
for all to authenticated
using (public.is_super_admin((select auth.uid())))
with check (public.is_super_admin((select auth.uid())));

grant insert,update,delete on public.knowledgebase_categories,public.knowledgebase_articles to authenticated;
