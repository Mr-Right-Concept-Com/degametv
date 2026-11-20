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
  v_used bigint;
begin
  if p_provider_reference is null or length(p_provider_reference) < 8 then
    raise exception 'invalid_provider_reference' using errcode='22023';
  end if;
  select * into v_event from public.screenings where id=p_screening_id for update;
  if not found or v_event.status <> 'published' then
    raise exception 'event_not_available' using errcode='P0002';
  end if;
  if v_event.sales_open_at is not null and now() < v_event.sales_open_at then
    raise exception 'ticket_sales_not_open' using errcode='P0001';
  end if;
  if v_event.sales_close_at is not null and now() >= v_event.sales_close_at then
    raise exception 'ticket_sales_closed' using errcode='P0001';
  end if;
  if v_event.early_bird_price is null or v_event.early_bird_ends_at is null
     or now() >= v_event.early_bird_ends_at or coalesce(v_event.early_bird_capacity,0) <= 0 then
    return false;
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '30 minutes' then
    raise exception 'invalid_reservation_expiry' using errcode='22023';
  end if;

  delete from public.event_early_bird_reservations
   where screening_id=p_screening_id and reservation_status='reserved' and expires_at<=now();

  select
    (select count(*) from public.screening_tickets t
      where t.screening_id=p_screening_id
        and t.payment_status='paid'
        and t.created_at<=v_event.early_bird_ends_at)
    +
    (select count(*) from public.event_early_bird_reservations r
      where r.screening_id=p_screening_id
        and r.reservation_status='reserved'
        and r.expires_at>now())
  into v_used;

  if v_used >= v_event.early_bird_capacity then return false; end if;

  insert into public.event_early_bird_reservations(screening_id,provider_reference,reservation_status,expires_at)
  values(p_screening_id,p_provider_reference,'reserved',p_expires_at)
  on conflict(provider_reference) do nothing;
  return found;
end;
$$;

revoke all on function public.reserve_event_early_bird_slot(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.reserve_event_early_bird_slot(uuid,text,timestamptz) to service_role;