create table if not exists public.live_payment_orders (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 screening_id uuid not null references public.screenings(id) on delete restrict,
 stream_id uuid not null references public.live_streams(id) on delete restrict,
 ticket_type public.ticket_type not null check(ticket_type in ('live','replay','combo')),
 provider text not null, provider_reference text not null unique, email text not null,
 amount_minor bigint not null check(amount_minor>0), currency text not null check(currency in ('NGN','USD')),
 status text not null default 'pending' check(status in ('pending','paid','failed','cancelled','refunded')),
 checkout_url text, provider_transaction_id text, paid_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb
);
create index if not exists live_payment_orders_user_status_idx on public.live_payment_orders(user_id,status,created_at desc);
create index if not exists live_payment_orders_stream_idx on public.live_payment_orders(stream_id,status);
alter table public.live_payment_orders enable row level security;
revoke all on public.live_payment_orders from anon,authenticated;
grant all on public.live_payment_orders to service_role;
alter table public.tickets add column if not exists revoked_at timestamptz;
alter table public.tickets add column if not exists revocation_reason text;
create or replace function public.complete_live_payment_order(p_reference text,p_transaction_id text,p_amount_minor bigint,p_currency text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.live_payment_orders%rowtype; s public.screenings%rowtype; l public.live_streams%rowtype; v_ticket uuid;
begin
 if current_setting('request.jwt.claim.role',true) <> 'service_role' then raise exception 'forbidden'; end if;
 select * into o from public.live_payment_orders where provider_reference=p_reference for update;
 if not found then raise exception 'order_not_found'; end if;
 if o.amount_minor<>p_amount_minor or o.currency<>p_currency then raise exception 'payment_mismatch'; end if;
 if o.status='paid' then select id into v_ticket from public.tickets where metadata->>'payment_reference'=p_reference limit 1; return jsonb_build_object('already_paid',true,'ticket_id',v_ticket); end if;
 if o.status<>'pending' then raise exception 'order_not_pending'; end if;
 select * into s from public.screenings where id=o.screening_id and tenant_id=o.tenant_id for share;
 select * into l from public.live_streams where id=o.stream_id and tenant_id=o.tenant_id for share;
 if s.id is null or l.id is null then raise exception 'event_unavailable'; end if;
 insert into public.tickets(user_id,tenant_id,content_id,stream_id,ticket_type,ticket_code,price,currency,valid_from,valid_until,metadata)
 values(o.user_id,o.tenant_id,s.content_id,o.stream_id,o.ticket_type,upper(substr(encode(gen_random_bytes(12),'hex'),1,16)),o.amount_minor::numeric/100,o.currency,
 case when o.ticket_type='replay' then coalesce(s.live_replay_ready_at,now()) else now() end,
 case when o.ticket_type='live' then coalesce(s.live_ended_at,now()+interval '24 hours') else coalesce(s.live_replay_ready_at,now())+make_interval(hours=>s.replay_access_hours) end,
 jsonb_build_object('payment_reference',p_reference,'provider',o.provider,'transaction_id',p_transaction_id,'screening_id',s.id))
 returning id into v_ticket;
 update public.live_payment_orders set status='paid',provider_transaction_id=p_transaction_id,paid_at=now(),updated_at=now() where id=o.id;
 return jsonb_build_object('already_paid',false,'ticket_id',v_ticket);
end $$;
revoke all on function public.complete_live_payment_order(text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.complete_live_payment_order(text,text,bigint,text) to service_role;