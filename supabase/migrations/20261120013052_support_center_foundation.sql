create table if not exists public.support_agents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  department text not null default 'general',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 5 and 180),
  category text not null check (category in ('account','payments','wallet','tickets','playback','live_streaming','creator_studio','verification','copyright','technical','other')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','awaiting_support','awaiting_user','in_progress','escalated','resolved','closed')),
  description text not null check (char_length(btrim(description)) between 10 and 10000),
  related_content_id uuid,
  related_event_id uuid,
  related_transaction_reference text,
  assigned_agent_id uuid references public.support_agents(user_id) on delete set null,
  resolution text,
  satisfaction_rating smallint check (satisfaction_rating between 1 and 5),
  last_message_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 12000),
  is_internal boolean not null default false,
  attachment_paths text[] not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledgebase_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledgebase_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.knowledgebase_categories(id) on delete set null,
  slug text not null unique,
  title text not null,
  summary text,
  body_markdown text not null,
  audience text not null default 'all' check (audience in ('all','viewer','creator','studio','technical')),
  search_vector tsvector generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(body_markdown,''))) stored,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_recent_idx on public.support_tickets(user_id, created_at desc);
create index if not exists support_tickets_queue_idx on public.support_tickets(status, priority, last_message_at desc);
create index if not exists support_messages_ticket_recent_idx on public.support_messages(ticket_id, created_at);
create index if not exists knowledgebase_articles_search_idx on public.knowledgebase_articles using gin(search_vector);
create index if not exists knowledgebase_articles_published_idx on public.knowledgebase_articles(is_published, audience, published_at desc);

alter table public.support_agents enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.knowledgebase_categories enable row level security;
alter table public.knowledgebase_articles enable row level security;

create policy support_agents_read_self on public.support_agents for select to authenticated using (user_id = (select auth.uid()));
create policy support_tickets_read_owner_or_agent on public.support_tickets for select to authenticated using (
  user_id = (select auth.uid()) or exists (select 1 from public.support_agents a where a.user_id = (select auth.uid()) and a.is_active)
);
create policy support_tickets_create_owner on public.support_tickets for insert to authenticated with check (user_id = (select auth.uid()) and assigned_agent_id is null);
create policy support_messages_read_owner_or_agent on public.support_messages for select to authenticated using (
  exists (select 1 from public.support_tickets t where t.id = ticket_id and (
    t.user_id = (select auth.uid()) or exists (select 1 from public.support_agents a where a.user_id = (select auth.uid()) and a.is_active)
  )) and (not is_internal or exists (select 1 from public.support_agents a where a.user_id = (select auth.uid()) and a.is_active))
);
create policy support_messages_create_owner_or_agent on public.support_messages for insert to authenticated with check (
  sender_id = (select auth.uid()) and is_internal = false and exists (
    select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = (select auth.uid()) and t.status not in ('closed')
  )
);
create policy knowledgebase_categories_public_read on public.knowledgebase_categories for select to anon, authenticated using (is_published);
create policy knowledgebase_articles_public_read on public.knowledgebase_articles for select to anon, authenticated using (is_published and published_at is not null and published_at <= now());

grant select on public.knowledgebase_categories, public.knowledgebase_articles to anon, authenticated;
grant select, insert on public.support_tickets to authenticated;
grant select, insert on public.support_messages to authenticated;
grant select on public.support_agents to authenticated;
