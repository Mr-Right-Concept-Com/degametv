-- Playback sessions must bind to the live-ticket table populated by complete_live_payment_order.
drop function if exists public.authorize_screening_ticket_playback(uuid,text,text);
drop table if exists public.screening_playback_sessions cascade;
alter table public.tickets add column if not exists stream_count integer not null default 0;
alter table public.tickets add column if not exists active_session_token text;
alter table public.tickets add column if not exists active_session_started_at timestamptz;
alter table public.tickets add column if not exists active_session_expires_at timestamptz;
create table public.screening_playback_sessions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null,
 screening_id uuid not null references public.screenings(id) on delete cascade,
 ticket_id uuid not null references public.tickets(id) on delete cascade,
 user_id uuid not null, session_token_hash text not null unique, country_code text,
 started_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 expires_at timestamptz not null, revoked_at timestamptz
);
create index screening_playback_sessions_active_idx on public.screening_playback_sessions(screening_id,expires_at) where revoked_at is null;
alter table public.screening_playback_sessions enable row level security;
revoke all on public.screening_playback_sessions from anon,authenticated;
create or replace function public.authorize_screening_ticket_playback(p_screening_id uuid,p_session_token_hash text,p_country_code text default null)
returns table(ticket_id uuid,session_expires_at timestamptz,session_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_screening public.screenings%rowtype; v_ticket public.tickets%rowtype; v_session uuid; v_expiry timestamptz; v_country text:=upper(left(coalesce(p_country_code,''),2)); v_now timestamptz:=now();
begin
 if v_user is null then raise exception 'authentication_required'; end if;
 if p_session_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_playback_session'; end if;
 select * into v_screening from public.screenings where id=p_screening_id and status='published' for update;
 if not found then raise exception 'screening_unavailable'; end if;
 if cardinality(coalesce(v_screening.allowed_countries,'{}'::text[]))>0 and not (v_country=any(v_screening.allowed_countries)) then raise exception 'territory_not_permitted'; end if;
 if v_country<>'' and v_country=any(coalesce(v_screening.blocked_countries,'{}'::text[])) then raise exception 'territory_not_permitted'; end if;
 select * into v_ticket from public.tickets where stream_id in (select id from public.live_streams where metadata->>'screening_id'=p_screening_id::text) and user_id=v_user and revoked_at is null and valid_from<=v_now and valid_until>v_now and ticket_type in ('live','replay','combo') order by created_at desc limit 1 for update;
 if not found then raise exception 'valid_ticket_required'; end if;
 if v_ticket.active_session_expires_at is not null and v_ticket.active_session_expires_at>v_now then raise exception 'ticket_already_streaming'; end if;
 if coalesce(v_screening.max_streams_per_ticket,0)>0 and coalesce(v_ticket.stream_count,0)>=v_screening.max_streams_per_ticket then raise exception 'ticket_stream_limit_reached'; end if;
 if coalesce(v_screening.max_concurrent_streams,0)>0 and (select count(*) from public.screening_playback_sessions ps where ps.screening_id=p_screening_id and ps.revoked_at is null and ps.expires_at>v_now)>=v_screening.max_concurrent_streams then raise exception 'screening_concurrency_limit_reached'; end if;
 v_expiry:=least(v_ticket.valid_until,v_now+interval '60 minutes');
 insert into public.screening_playback_sessions(tenant_id,screening_id,ticket_id,user_id,session_token_hash,country_code,expires_at) values(v_ticket.tenant_id,p_screening_id,v_ticket.id,v_user,p_session_token_hash,nullif(v_country,''),v_expiry) returning id into v_session;
 update public.tickets set stream_count=coalesce(stream_count,0)+1,active_session_token=p_session_token_hash,active_session_started_at=v_now,active_session_expires_at=v_expiry where id=v_ticket.id;
 return query select v_ticket.id,v_expiry,v_session;
end $$;
revoke all on function public.authorize_screening_ticket_playback(uuid,text,text) from public;
grant execute on function public.authorize_screening_ticket_playback(uuid,text,text) to authenticated;
