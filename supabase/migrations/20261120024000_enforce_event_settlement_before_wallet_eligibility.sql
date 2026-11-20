begin;

create or replace function public.complete_live_payment_order(
  p_reference text,
  p_transaction_id text,
  p_amount_minor bigint,
  p_currency text,
  p_claim_token_hash text default null
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  o public.live_payment_orders%rowtype;
  s public.screenings%rowtype;
  l public.live_streams%rowtype;
  t public.tickets%rowtype;
  v_until timestamptz;
  v_from timestamptz;
  v_amount_major numeric;
  v_fee numeric;
  v_creator uuid;
  v_hold_id uuid;
  v_release_at timestamptz;
  v_scale bigint;
  v_hold_hours integer;
begin
  if current_setting('request.jwt.claim.role',true)<>'service_role' then
    raise exception 'forbidden' using errcode='42501';
  end if;
  select * into o from public.live_payment_orders where provider_reference=p_reference for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.amount_minor<>p_amount_minor or o.currency<>p_currency then raise exception 'payment_mismatch'; end if;
  if o.user_id is null and (p_claim_token_hash is null or length(p_claim_token_hash)<>64) then
    raise exception 'guest_claim_token_required';
  end if;
  if o.status='paid' then
    select * into t from public.tickets where metadata->>'payment_reference'=p_reference order by created_at desc limit 1 for update;
    if t.id is null then raise exception 'paid_ticket_not_found'; end if;
    if o.user_id is null then
      update public.tickets set claim_token_hash=p_claim_token_hash where id=t.id;
      t.claim_token_hash:=p_claim_token_hash;
    end if;
    return jsonb_build_object('already_paid',true,'ticket_id',t.id,'screening_id',o.screening_id,'stream_id',o.stream_id,'ticket_type',o.ticket_type,'valid_until',t.valid_until,'email',o.email,'title',(select title from public.screenings where id=o.screening_id),'ticket_code',t.ticket_code,'price',t.price,'currency',t.currency);
  end if;
  if o.status<>'pending' then raise exception 'order_not_pending'; end if;

  select * into s from public.screenings where id=o.screening_id and tenant_id=o.tenant_id for share;
  select * into l from public.live_streams where id=o.stream_id and tenant_id=o.tenant_id for share;
  if s.id is null or l.id is null then raise exception 'event_unavailable'; end if;

  v_from:=case when o.ticket_type='replay' then coalesce(s.live_replay_ready_at,now()) else now() end;
  v_until:=case when o.ticket_type='live' then greatest(coalesce(s.screening_date,now())+interval '24 hours',now()+interval '1 hour') else coalesce(s.live_replay_ready_at,now())+make_interval(hours=>s.replay_access_hours) end;
  v_amount_major:=coalesce(o.amount_major,o.amount_minor::numeric/100);
  v_fee:=least(v_amount_major,greatest(0,coalesce(o.platform_fee_major,0)));
  v_scale:=case
    when o.currency in ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') then 1
    when o.currency in ('BHD','IQD','JOD','KWD','LYD','OMR','TND') then 1000
    else 100 end;

  insert into public.tickets(user_id,tenant_id,content_id,stream_id,ticket_type,ticket_code,price,currency,valid_from,valid_until,guest_email,claim_token_hash,metadata)
  values(o.user_id,o.tenant_id,s.content_id,o.stream_id,o.ticket_type,upper(substr(encode(extensions.gen_random_bytes(12),'hex'),1,16)),v_amount_major,o.currency,v_from,v_until,case when o.user_id is null then lower(o.email) else null end,p_claim_token_hash,
    jsonb_build_object('payment_reference',p_reference,'provider',o.provider,'transaction_id',p_transaction_id,'screening_id',s.id,'guest',o.user_id is null,'early_bird_reserved',coalesce((o.metadata->>'early_bird_reserved')::boolean,false)))
  returning * into t;

  select c.creator_id into v_creator from public.content c where c.id=s.content_id;
  if v_creator is not null then
    insert into public.event_settlement_holds(
      tenant_id,creator_id,screening_id,source_type,source_id,currency,
      gross_amount_minor,net_amount_minor,hold_status,hold_hours
    ) values(
      o.tenant_id,v_creator,s.id,'ticket',t.id,o.currency,o.amount_minor,
      greatest(0,o.amount_minor-round(v_fee*v_scale)::bigint),'held',
      coalesce(s.settlement_hold_hours,48)
    ) returning id,release_at into v_hold_id,v_release_at;

    insert into public.wallet_ledger(user_id,ticket_id,screening_id,gross,fee,net,currency,kind,settles_at)
    values(v_creator,t.id,s.id,v_amount_major,v_fee,v_amount_major-v_fee,o.currency,'sale',coalesce(v_release_at,'infinity'::timestamptz))
    on conflict(ticket_id,kind) where ticket_id is not null and kind in ('sale','refund') do nothing;
  end if;

  update public.live_payment_orders set status='paid',provider_transaction_id=p_transaction_id,paid_at=now(),updated_at=now() where id=o.id;
  return jsonb_build_object('already_paid',false,'ticket_id',t.id,'screening_id',s.id,'stream_id',l.id,'ticket_type',o.ticket_type,'valid_until',v_until,'email',o.email,'title',s.title,'ticket_code',t.ticket_code,'price',t.price,'currency',t.currency);
end;
$$;

create or replace function public.refresh_event_settlement_holds(p_limit integer default 500)
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_count integer:=0; r record;
begin
  if auth.role()<>'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_limit<1 or p_limit>5000 then raise exception 'invalid_batch_limit' using errcode='22023'; end if;
  for r in
    select id,source_type,source_id,release_at
    from public.event_settlement_holds
    where hold_status='held'
    order by created_at
    limit p_limit
    for update skip locked
  loop
    update public.event_settlement_holds
       set event_ended_at=event_ended_at,delivery_confirmed_at=delivery_confirmed_at,updated_at=now()
     where id=r.id;
    update public.event_settlement_holds
       set hold_status='eligible',updated_at=now()
     where id=r.id and hold_status='held' and release_at is not null and release_at<=now();
    if found then
      v_count:=v_count+1;
      if r.source_type='ticket' then
        update public.wallet_ledger set settles_at=r.release_at
         where ticket_id=r.source_id and kind='sale';
      end if;
    end if;
  end loop;
  return v_count;
end;
$$;

-- Backfill historical ticket sales into the hold system. The guard trigger
-- recomputes the event end, delivery proof and configured 24-72 hour hold.
do $$
declare r record; v_scale bigint;
begin
  for r in
    select w.*,c.creator_id,s.tenant_id,s.id as event_id
    from public.wallet_ledger w
    join public.screenings s on s.id=w.screening_id
    join public.content c on c.id=s.content_id
    where w.kind='sale' and w.ticket_id is not null
  loop
    v_scale:=case
      when r.currency in ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') then 1
      when r.currency in ('BHD','IQD','JOD','KWD','LYD','OMR','TND') then 1000
      else 100 end;
    insert into public.event_settlement_holds(
      tenant_id,creator_id,screening_id,source_type,source_id,currency,
      gross_amount_minor,net_amount_minor,hold_status,hold_hours
    ) values(
      r.tenant_id,r.creator_id,r.event_id,'ticket',r.ticket_id,r.currency,
      greatest(0,round(r.gross*v_scale)::bigint),greatest(0,round(r.net*v_scale)::bigint),
      'held',48
    ) on conflict(source_type,source_id) do nothing;
  end loop;
end $$;

update public.wallet_ledger w
set settles_at=coalesce(h.release_at,'infinity'::timestamptz)
from public.event_settlement_holds h
where h.source_type='ticket' and h.source_id=w.ticket_id and w.kind='sale';

revoke all on function public.complete_live_payment_order(text,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.complete_live_payment_order(text,text,bigint,text,text) to service_role;
revoke all on function public.refresh_event_settlement_holds(integer) from public,anon,authenticated;
grant execute on function public.refresh_event_settlement_holds(integer) to service_role;

commit;