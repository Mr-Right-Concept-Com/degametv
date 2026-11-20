drop trigger if exists event_settlement_hold_guard on public.event_settlement_holds;
create trigger event_settlement_hold_guard before insert or update of event_ended_at,delivery_confirmed_at,hold_hours,screening_id,live_stream_id,content_id,creator_id,tenant_id on public.event_settlement_holds for each row execute function public.guard_event_settlement_hold();
