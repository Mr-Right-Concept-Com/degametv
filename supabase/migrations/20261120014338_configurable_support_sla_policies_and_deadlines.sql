create table if not exists public.support_sla_policies(priority text primary key check(priority in ('low','normal','high','urgent')),first_response_minutes integer not null check(first_response_minutes between 5 and 10080),resolution_minutes integer not null check(resolution_minutes between 15 and 43200),is_active boolean not null default true,updated_at timestamptz not null default now());
alter table public.support_sla_policies enable row level security;
drop policy if exists support_sla_policies_admin_manage on public.support_sla_policies;
create policy support_sla_policies_admin_manage on public.support_sla_policies for all to authenticated using(public.is_super_admin((select auth.uid()))) with check(public.is_super_admin((select auth.uid())));
revoke all on public.support_sla_policies from anon,authenticated;
grant select,insert,update,delete on public.support_sla_policies to authenticated;
insert into public.support_sla_policies(priority,first_response_minutes,resolution_minutes) values('low',2880,10080),('normal',1440,4320),('high',240,1440),('urgent',60,240) on conflict(priority) do nothing;
create or replace function public.apply_support_ticket_sla() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_response integer;v_resolution integer;
begin select first_response_minutes,resolution_minutes into v_response,v_resolution from public.support_sla_policies where priority=new.priority and is_active;
if v_response is null then v_response:=case new.priority when 'urgent' then 60 when 'high' then 240 when 'low' then 2880 else 1440 end;v_resolution:=case new.priority when 'urgent' then 240 when 'high' then 1440 when 'low' then 10080 else 4320 end;end if;
new.first_response_due_at:=coalesce(new.first_response_due_at,now()+make_interval(mins=>v_response));new.resolution_due_at:=coalesce(new.resolution_due_at,now()+make_interval(mins=>v_resolution));return new;end;$$;
revoke all on function public.apply_support_ticket_sla() from public,anon,authenticated;
drop trigger if exists support_ticket_apply_sla on public.support_tickets;
create trigger support_ticket_apply_sla before insert on public.support_tickets for each row execute function public.apply_support_ticket_sla();
