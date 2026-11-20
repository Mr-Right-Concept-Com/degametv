begin;

alter table public.event_contributions
  add column if not exists amount_major numeric,
  add column if not exists platform_fee_major numeric not null default 0,
  add column if not exists provider_mode text not null default 'live',
  add column if not exists provider_checkout_id text;

alter table public.wallet_ledger
  add column if not exists event_contribution_id uuid references public.event_contributions(id) on delete restrict;

create unique index if not exists wallet_ledger_event_contribution_unique
  on public.wallet_ledger(event_contribution_id) where event_contribution_id is not null;

create or replace function public.complete_event_contribution(
 p_reference text,p_transaction_id text,p_amount_minor bigint,p_currency text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
 c public.event_contributions%rowtype;
 v_fee numeric;
 v_scale bigint;
 v_release_at timestamptz;
begin
 if current_setting('request.jwt.claim.role',true)<>'service_role' then
  raise exception 'forbidden' using errcode='42501';
 end if;
 select * into c from public.event_contributions where provider_reference=p_reference for update;
 if not found then raise exception 'contribution_not_found'; end if;
 if c.amount_minor<>p_amount_minor or c.currency<>p_currency then raise exception 'contribution_payment_mismatch'; end if;
 if c.status='paid' then
  return jsonb_build_object('success',true,'already_paid',true,'contribution_id',c.id,'contribution_type',c.contribution_type);
 end if;
 if c.status<>'pending' then raise exception 'contribution_not_pending'; end if;
 v_fee:=least(coalesce(c.amount_major,c.amount_minor::numeric/100),greatest(0,coalesce(c.platform_fee_major,0)));
 v_scale:=case
  when c.currency in ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') then 1
  when c.currency in ('BHD','IQD','JOD','KWD','LYD','OMR','TND') then 1000
  else 100 end;
 update public.event_contributions
  set status='paid',provider_transaction_id=p_transaction_id,paid_at=now()
  where id=c.id;

 insert into public.event_settlement_holds(
  tenant_id,creator_id,screening_id,live_stream_id,source_type,source_id,currency,
  gross_amount_minor,net_amount_minor,hold_status,hold_hours
 ) values(
  c.tenant_id,c.creator_id,c.screening_id,c.live_stream_id,c.contribution_type,c.id,c.currency,
  c.amount_minor,greatest(0,c.amount_minor-round(v_fee*v_scale)::bigint),'held',
  case when c.screening_id is not null then coalesce((select settlement_hold_hours from public.screenings where id=c.screening_id),48)
       else coalesce((select settlement_hold_hours from public.live_streams where id=c.live_stream_id),48) end
 ) on conflict(source_type,source_id) do nothing;

 select release_at into v_release_at from public.event_settlement_holds
  where source_type=c.contribution_type and source_id=c.id;

 insert into public.wallet_ledger(
  user_id,screening_id,event_contribution_id,gross,fee,net,currency,kind,settles_at
 ) values(
  c.creator_id,c.screening_id,c.id,coalesce(c.amount_major,c.amount_minor::numeric/100),v_fee,
  coalesce(c.amount_major,c.amount_minor::numeric/100)-v_fee,c.currency,c.contribution_type,
  coalesce(v_release_at,'infinity'::timestamptz)
 ) on conflict(event_contribution_id) where event_contribution_id is not null do nothing;

 return jsonb_build_object('success',true,'already_paid',false,'contribution_id',c.id,'contribution_type',c.contribution_type);
end;
$$;

revoke all on function public.complete_event_contribution(text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.complete_event_contribution(text,text,bigint,text) to service_role;

commit;