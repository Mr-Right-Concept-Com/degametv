-- Pass 3B: durable stream provisioning idempotency and support operating-hour SLA controls.
alter table public.live_streams add column if not exists provisioning_idempotency_key text;
create unique index if not exists live_streams_creator_provisioning_idempotency_uidx on public.live_streams (tenant_id, creator_id, provisioning_idempotency_key) where provisioning_idempotency_key is not null;
create unique index if not exists stream_provider_event_logs_provider_event_uidx on public.stream_provider_event_logs (provider_key, provider_event_id);
create table if not exists public.support_operating_hours (
  id smallint primary key default 1 check (id = 1),
  timezone text not null default 'Africa/Lagos',
  weekly_schedule jsonb not null default '{"0":null,"1":{"open":"09:00","close":"17:00"},"2":{"open":"09:00","close":"17:00"},"3":{"open":"09:00","close":"17:00"},"4":{"open":"09:00","close":"17:00"},"5":{"open":"09:00","close":"17:00"},"6":null}'::jsonb,
  holidays date[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.support_operating_hours enable row level security;
drop policy if exists support_operating_hours_admin_manage on public.support_operating_hours;
create policy support_operating_hours_admin_manage on public.support_operating_hours for all to authenticated using (public.is_super_admin((select auth.uid()))) with check (public.is_super_admin((select auth.uid())));
revoke all on public.support_operating_hours from anon;
revoke all on public.support_operating_hours from authenticated;
grant select, insert, update on public.support_operating_hours to authenticated;
grant all on public.support_operating_hours to service_role;
insert into public.support_operating_hours(id) values (1) on conflict (id) do nothing;
create table if not exists public.support_sla_escalation_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  breach_type text not null check (breach_type in ('first_response','resolution')),
  due_at timestamptz not null,
  escalated_at timestamptz not null default now(),
  previous_status text not null,
  unique (ticket_id, breach_type)
);
create index if not exists support_sla_escalation_events_escalated_at_idx on public.support_sla_escalation_events (escalated_at desc);
alter table public.support_sla_escalation_events enable row level security;
revoke all on public.support_sla_escalation_events from public, anon, authenticated;
grant all on public.support_sla_escalation_events to service_role;
create or replace function public.support_add_business_minutes(p_start timestamptz, p_minutes integer)
returns timestamptz language plpgsql stable set search_path = public, pg_temp as $function$
declare v_cursor timestamptz := p_start; v_remaining integer := p_minutes; v_hours public.support_operating_hours%rowtype; v_local timestamp; v_day integer; v_slot jsonb; v_open time; v_close time;
begin
 if p_start is null or p_minutes < 0 or p_minutes > 43200 then raise exception 'invalid_business_minutes'; end if;
 select * into v_hours from public.support_operating_hours where id = 1;
 if not found then return p_start + make_interval(mins => p_minutes); end if;
 perform 1 from pg_timezone_names where name = v_hours.timezone;
 if not found then raise exception 'invalid_support_timezone'; end if;
 while v_remaining > 0 loop
  v_local := v_cursor at time zone v_hours.timezone; v_day := extract(dow from v_local)::integer; v_slot := v_hours.weekly_schedule -> v_day::text;
  if v_slot is null or v_slot = 'null'::jsonb or exists (select 1 from unnest(v_hours.holidays) as holiday(value) where holiday.value = v_local::date) then
   v_cursor := (date_trunc('day', v_local) + interval '1 day') at time zone v_hours.timezone;
  else
   v_open := (v_slot->>'open')::time; v_close := (v_slot->>'close')::time;
   if v_close <= v_open then raise exception 'invalid_support_operating_hours'; end if;
   if v_local::time < v_open then v_cursor := (v_local::date + v_open) at time zone v_hours.timezone;
   elsif v_local::time >= v_close then v_cursor := (v_local::date + interval '1 day') at time zone v_hours.timezone;
   else v_cursor := v_cursor + interval '1 minute'; v_remaining := v_remaining - 1; end if;
  end if;
 end loop;
 return v_cursor;
end;
$function$;
revoke all on function public.support_add_business_minutes(timestamptz, integer) from public, anon;
grant execute on function public.support_add_business_minutes(timestamptz, integer) to authenticated, service_role;
create or replace function public.apply_support_ticket_sla()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $function$
declare v_response integer; v_resolution integer;
begin
 select first_response_minutes, resolution_minutes into v_response, v_resolution from public.support_sla_policies where priority = new.priority and is_active;
 if v_response is null then
  v_response := case new.priority when 'urgent' then 60 when 'high' then 240 when 'low' then 2880 else 1440 end;
  v_resolution := case new.priority when 'urgent' then 240 when 'high' then 1440 when 'low' then 10080 else 4320 end;
 end if;
 new.first_response_due_at := coalesce(new.first_response_due_at, public.support_add_business_minutes(now(), v_response));
 new.resolution_due_at := coalesce(new.resolution_due_at, public.support_add_business_minutes(now(), v_resolution));
 return new;
end;
$function$;
revoke all on function public.apply_support_ticket_sla() from public, anon, authenticated;
create or replace function public.escalate_breached_support_tickets(p_limit integer default 200)
returns integer language plpgsql security definer set search_path = public, pg_temp as $function$
declare v_count integer := 0; v_ticket record; v_breach text; v_due timestamptz;
begin
 if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
 if p_limit < 1 or p_limit > 1000 then raise exception 'invalid_limit'; end if;
 for v_ticket in
  select t.id, t.status, t.first_response_due_at, t.resolution_due_at, t.first_responded_at, t.resolved_at, t.closed_at
  from public.support_tickets t where t.status not in ('resolved','closed')
   and ((t.first_responded_at is null and t.first_response_due_at <= now()) or t.resolution_due_at <= now())
  order by least(coalesce(t.first_response_due_at, 'infinity'::timestamptz), coalesce(t.resolution_due_at, 'infinity'::timestamptz))
  for update skip locked limit p_limit
 loop
  if v_ticket.first_responded_at is null and v_ticket.first_response_due_at <= now() then v_breach := 'first_response'; v_due := v_ticket.first_response_due_at;
  else v_breach := 'resolution'; v_due := v_ticket.resolution_due_at; end if;
  insert into public.support_sla_escalation_events(ticket_id, breach_type, due_at, previous_status) values (v_ticket.id, v_breach, v_due, v_ticket.status) on conflict (ticket_id, breach_type) do nothing;
  if found then
   update public.support_tickets set status = 'escalated', escalated_at = coalesce(escalated_at, now()), updated_at = now() where id = v_ticket.id;
   v_count := v_count + 1;
  end if;
 end loop;
 return v_count;
end;
$function$;
revoke all on function public.escalate_breached_support_tickets(integer) from public, anon, authenticated;
grant execute on function public.escalate_breached_support_tickets(integer) to service_role;
comment on table public.support_operating_hours is 'Single-row support operating-hours configuration. weekly_schedule keys use PostgreSQL DOW 0-6 and local HH:MM open/close values.';
comment on table public.support_sla_escalation_events is 'Immutable-once-per-breach audit of automated support SLA escalations.';
