revoke all on public.support_agents, public.support_tickets, public.support_messages, public.knowledgebase_categories, public.knowledgebase_articles from anon, authenticated;
grant select on public.support_agents to authenticated;
grant select, insert, update on public.support_tickets to authenticated;
grant select, insert on public.support_messages to authenticated;
grant select on public.knowledgebase_categories, public.knowledgebase_articles to anon, authenticated;
