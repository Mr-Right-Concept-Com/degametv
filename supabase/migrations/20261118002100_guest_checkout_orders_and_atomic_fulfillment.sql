create table if not exists public.guest_payment_orders(
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null unique references public.screening_tickets(id),
 provider text not null check(provider in ('paystack','flutterwave','stripe')),
 provider_reference text not null unique,
 email text not null,
 amount_minor bigint not null check(amount_minor>0),
 currency text not null check(currency in ('NGN','USD')),
 status text not null default 'pending' check(status in ('pending','paid','failed','expired','refunded')),
 checkout_url text,
 provider_transaction_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 paid_at timestamptz
);
alter table public.guest_payment_orders enable row level security;
revoke all on public.guest_payment_orders from public,anon,authenticated;
grant select,insert,update on public.guest_payment_orders to service_role;
create or replace function public.create_guest_payment_order(
 p_provider text,p_reference text,p_screening_id uuid,p_tenant_id uuid,p_email text,
 p_amount_minor bigint,p_currency text,p_location text,p_ticket_code text,p_watch_code text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_ticket uuid; v_role text:=current_setting('request.jwt.claim.role',true);
begin
 if v_role<>'service_role' then raise exception 'forbidden'; end if;
 if p_provider not in ('paystack','flutterwave','stripe') or p_amount_minor<=0 or p_currency not in ('NGN','USD') then raise exception 'invalid_order'; end if;
 if p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$' then raise exception 'invalid_email'; end if;
 if not exists(select 1 from public.screenings s where s.id=p_screening_id and s.tenant_id=p_tenant_id and s.status='published') then raise exception 'screening_unavailable'; end if;
 insert into public.screening_tickets(tenant_id,screening_id,user_id,email,ticket_code,location,price,currency,addons,payment_status,payment_method,payment_reference,watch_code,ticket_kind)
 values(p_tenant_id,p_screening_id,null,p_email,p_ticket_code,p_location,p_amount_minor::numeric/100,p_currency,'[]'::jsonb,'pending',p_provider,p_reference,p_watch_code,'live')
 returning id into v_ticket;
 insert into public.guest_payment_orders(ticket_id,provider,provider_reference,email,amount_minor,currency)
 values(v_ticket,p_provider,p_reference,p_email,p_amount_minor,p_currency);
 return v_ticket;
end; $$;
revoke all on function public.create_guest_payment_order(text,text,uuid,uuid,text,bigint,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_guest_payment_order(text,text,uuid,uuid,text,bigint,text,text,text,text) to service_role;
create or replace function public.complete_guest_payment_order(p_reference text,p_transaction_id text,p_amount_minor bigint,p_currency text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text:=current_setting('request.jwt.claim.role',true); v_order public.guest_payment_orders%rowtype;
begin
 if v_role<>'service_role' then raise exception 'forbidden'; end if;
 select * into v_order from public.guest_payment_orders where provider_reference=p_reference for update;
 if not found then raise exception 'order_not_found'; end if;
 if v_order.amount_minor<>p_amount_minor or v_order.currency<>p_currency then raise exception 'payment_mismatch'; end if;
 if v_order.status='paid' then return jsonb_build_object('already_paid',true,'ticket_id',v_order.ticket_id); end if;
 if v_order.status<>'pending' then raise exception 'order_not_pending'; end if;
 update public.guest_payment_orders set status='paid',provider_transaction_id=p_transaction_id,paid_at=now(),updated_at=now() where id=v_order.id;
 update public.screening_tickets set payment_status='completed',payment_reference=p_reference,payment_method=v_order.provider where id=v_order.ticket_id and payment_status='pending';
 return jsonb_build_object('already_paid',false,'ticket_id',v_order.ticket_id);
end; $$;
revoke all on function public.complete_guest_payment_order(text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.complete_guest_payment_order(text,text,bigint,text) to service_role;