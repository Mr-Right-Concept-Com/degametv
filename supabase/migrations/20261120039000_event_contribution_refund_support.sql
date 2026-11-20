begin;
alter table public.payment_refunds add column if not exists contribution_id uuid references public.event_contributions(id) on delete restrict;
alter table public.payment_refunds drop constraint if exists payment_refunds_check;
alter table public.payment_refunds add constraint payment_refunds_target_check
 check ((((ticket_id is not null)::int)+((live_ticket_id is not null)::int)+((contribution_id is not null)::int))=1);
drop index if exists public.wallet_ledger_event_contribution_unique;
create unique index wallet_ledger_event_contribution_unique
 on public.wallet_ledger(event_contribution_id,kind) where event_contribution_id is not null;

create or replace function public.complete_payment_refund(p_refund_id uuid,p_provider_refund_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare r public.payment_refunds%rowtype;v_order_status text;v_ticket_id uuid;
begin
 if current_setting('request.jwt.claim.role',true)<>'service_role' then raise exception 'forbidden' using errcode='42501';end if;
 select * into r from public.payment_refunds where id=p_refund_id for update;
 if not found then raise exception 'refund_not_found';end if;
 if r.status='succeeded' then return jsonb_build_object('already_refunded',true,'refund_id',r.id);end if;
 if r.status not in ('pending','provider_confirmed') then raise exception 'refund_not_pending';end if;
 if r.ticket_id is not null then
  select status into v_order_status from public.guest_payment_orders where ticket_id=r.ticket_id and provider_reference=r.payment_reference for update;
  if v_order_status is distinct from 'paid' then raise exception 'payment_not_paid';end if;
  update public.guest_payment_orders set status='refunded',updated_at=now() where provider_reference=r.payment_reference;
  update public.screening_tickets set payment_status='refunded',refunded_at=now(),refund_reason=r.reason where id=r.ticket_id;
  v_ticket_id:=r.ticket_id;
 elsif r.live_ticket_id is not null then
  select status into v_order_status from public.live_payment_orders where provider_reference=r.payment_reference for update;
  if v_order_status is distinct from 'paid' then raise exception 'payment_not_paid';end if;
  update public.live_payment_orders set status='refunded',updated_at=now() where provider_reference=r.payment_reference;
  update public.tickets set revoked_at=now(),revocation_reason=r.reason where id=r.live_ticket_id;
  v_ticket_id:=r.live_ticket_id;
 else
  select status into v_order_status from public.event_contributions where id=r.contribution_id and provider_reference=r.payment_reference for update;
  if v_order_status is distinct from 'paid' then raise exception 'contribution_not_paid';end if;
  update public.event_contributions set status='refunded' where id=r.contribution_id;
  update public.event_settlement_holds set hold_status='refunded',updated_at=now()
   where source_type in ('tip','gift') and source_id=r.contribution_id and hold_status in ('held','eligible','blocked');
  insert into public.wallet_ledger(user_id,screening_id,event_contribution_id,gross,fee,net,currency,kind,settles_at)
  select user_id,screening_id,event_contribution_id,-gross,-fee,-net,currency,'refund',now()
  from public.wallet_ledger where event_contribution_id=r.contribution_id and kind in ('tip','gift')
  on conflict(event_contribution_id,kind) where event_contribution_id is not null do nothing;
 end if;
 if v_ticket_id is not null then
  insert into public.wallet_ledger(user_id,ticket_id,screening_id,gross,fee,net,currency,kind,settles_at)
  select user_id,ticket_id,screening_id,-gross,-fee,-net,currency,'refund',now()
  from public.wallet_ledger where ticket_id=v_ticket_id and kind='sale'
  on conflict(ticket_id,kind) where ticket_id is not null and kind in ('sale','refund') do nothing;
  update public.event_settlement_holds set hold_status='refunded',updated_at=now()
   where source_type='ticket' and source_id=v_ticket_id and hold_status in ('held','eligible','blocked');
 end if;
 update public.payment_refunds set status='succeeded',provider_refund_id=coalesce(p_provider_refund_id,provider_refund_id),updated_at=now(),error_code=null where id=r.id;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
 values(r.requested_by,'payment.refund_succeeded','payment_refund',r.id,
  jsonb_build_object('payment_reference',r.payment_reference,'amount_minor',r.amount_minor,'currency',r.currency,'provider',r.provider,'provider_refund_id',coalesce(p_provider_refund_id,r.provider_refund_id),'reason',r.reason));
 return jsonb_build_object('success',true,'refund_id',r.id,'payment_reference',r.payment_reference,'amount_minor',r.amount_minor,'currency',r.currency);
end;
$$;
revoke all on function public.complete_payment_refund(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_payment_refund(uuid,text) to service_role;
commit;