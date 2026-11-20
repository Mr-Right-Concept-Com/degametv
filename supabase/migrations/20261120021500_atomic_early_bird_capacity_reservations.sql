begin;

create table if not exists public.event_early_bird_reservations (
  id uuid primary key default gen_random_uuid(),
  screening_id uuid not null references public.screenings(id) on delete cascade,
  provider_reference text not null unique,
  reservation_status text not null default 'reserved'
    check (reservation_status in ('reserved','paid','released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  released_at timestamptz
);

create index if not exists event_early_bird_reservations_capacity_idx
  on public.event_early_bird_reservations(screening_id, reservation_status, expires_at);

alter table public.event_early_bird_reservations enable row level security;
revoke all privileges on table public.event_early_bird_reservations from anon, authenticated;

create or replace function public.reserve_event_early_bird_slot(
  p_screening_id uuid,
  p_provider_reference text,
  p_expires_at timestamptz default now() + interval '20 minutes'
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.screenings%rowtype;
  v_capacity integer;
  v_used bigint;
begin
  if p_provider_reference is null or length(p_provider_reference) < 8 then
    raise exception 'invalid_provider_reference' using errcode='22023';
  end if;
  select * into v_event
  from public.screenings
  where id = p_screening_id
  for update;
  if not found or v_event.status <> 'published' then
    raise exception 'event_not_available' using errcode='P0002';
  end if;
  if v_event.sales_open_at is not null and now() < v_event.sales_open_at then
    raise exception 'ticket_sales_not_open' using errcode='P0001';
  end if;
  if v_event.sales_close_at is not null and now() >= v_event.sales_close_at then
    raise exception 'ticket_sales_closed' using errcode='P0001';
  end if;
  if v_event.early_bird_price is null
     or v_event.early_bird_ends_at is null
     or now() >= v_event.early_bird_ends_at
     or coalesce(v_event.early_bird_capacity,0) <= 0 then
    return false;
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '30 minutes' then
    raise exception 'invalid_reservation_expiry' using errcode='22023';
  end if;

  delete from public.event_early_bird_reservations
   where screening_id = p_screening_id
     and reservation_status = 'reserved'
     and expires_at <= now();

  select count(*) into v_used
  from public.event_early_bird_reservations
  where screening_id = p_screening_id
    and (reservation_status = 'paid'
      or (reservation_status = 'reserved' and expires_at > now()));

  v_capacity := v_event.early_bird_capacity;
  if v_used >= v_capacity then
    return false;
  end if;

  insert into public.event_early_bird_reservations(
    screening_id, provider_reference, reservation_status, expires_at
  ) values (
    p_screening_id, p_provider_reference, 'reserved', p_expires_at
  )
  on conflict (provider_reference) do nothing;

  return found;
end;
$$;

create or replace function public.release_event_early_bird_slot(p_provider_reference text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.event_early_bird_reservations
     set reservation_status='released', released_at=now()
   where provider_reference=p_provider_reference
     and reservation_status='reserved';
$$;

create or replace function public.sync_event_early_bird_reservation_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'paid' and old.status is distinct from new.status then
    update public.event_early_bird_reservations
       set reservation_status='paid', paid_at=coalesce(new.paid_at,now())
     where provider_reference=new.provider_reference
       and reservation_status='reserved';
  elsif new.status in ('failed','cancelled','expired','refunded')
        and old.status is distinct from new.status then
    update public.event_early_bird_reservations
       set reservation_status='released', released_at=now()
     where provider_reference=new.provider_reference
       and reservation_status='reserved';
  end if;
  return new;
end;
$$;

drop trigger if exists live_payment_order_early_bird_reservation_sync on public.live_payment_orders;
create trigger live_payment_order_early_bird_reservation_sync
after update of status on public.live_payment_orders
for each row execute function public.sync_event_early_bird_reservation_payment();

revoke all on function public.reserve_event_early_bird_slot(uuid,text,timestamptz) from public, anon, authenticated;
revoke all on function public.release_event_early_bird_slot(text) from public, anon, authenticated;
grant execute on function public.reserve_event_early_bird_slot(uuid,text,timestamptz) to service_role;
grant execute on function public.release_event_early_bird_slot(text) to service_role;

commit;