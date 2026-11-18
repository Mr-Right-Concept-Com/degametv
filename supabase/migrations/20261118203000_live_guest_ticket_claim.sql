alter table public.live_payment_orders alter column user_id drop not null;
alter table public.live_payment_orders add column if not exists guest_checkout boolean not null default false;
alter table public.tickets alter column user_id drop not null;
alter table public.tickets add column if not exists guest_email text;
alter table public.tickets add column if not exists claim_token_hash text;
alter table public.tickets add column if not exists claimed_at timestamptz;
create unique index if not exists tickets_claim_token_hash_uidx on public.tickets(claim_token_hash) where claim_token_hash is not null;
create index if not exists tickets_guest_email_idx on public.tickets(lower(guest_email)) where user_id is null;

create or replace function public.complete_live_payment_order(
 p_reference text,p_transaction_id text,p_amount_minor bigint,p_currency text,p_claim_token_hash text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.live_payment_orders%rowtype; s public.screenings%rowtype; l public.live_streams%rowtype; v_ticket uuid; v_until timestamptz; v_from timestamptz;
begin
 if current_setting('request.jwt.claim.role',true) <> 'service_role' then raise exception 'forbidden'; end if;
 select * into o from public.live_payment_orders where provider_reference=p_reference for update;
 if not found then raise exception 'order_not_found'; end if;
 if o.amount_minor<>p_amount_minor or o.currency<>p_currency then raise exception 'payment_mismatch'; end if;
 if o.status='paid' then select id into v_ticket from public.tickets where metadata->>'payment_reference'=p_reference limit 1; return jsonb_build_object('already_paid',true,'ticket_id',v_ticket); end if;
 if o.status<>'pending' then raise exception 'order_not_pending'; end if;
 if o.user_id is null and (p_claim_token_hash is null or length(p_claim_token_hash)<>64) then raise exception 'guest_claim_token_required'; end if;
 select * into s from public.screenings where id=o.screening_id and tenant_id=o.tenant_id for share;
 select * into l from public.live_streams where id=o.stream_id and tenant_id=o.tenant_id for share;
 if s.id is null or l.id is null then raise exception 'event_unavailable'; end if;
 v_from:=case when o.ticket_type='replay' then coalesce(s.live_replay_ready_at,now()) else now() end;
 v_until:=case when o.ticket_type='live' then coalesce(s.live_ended_at,now()+interval '24 hours') else coalesce(s.live_replay_ready_at,now())+make_interval(hours=>s.replay_access_hours) end;
 insert into public.tickets(user_id,tenant_id,content_id,stream_id,ticket_type,ticket_code,price,currency,valid_from,valid_until,guest_email,claim_token_hash,metadata)
 values(o.user_id,o.tenant_id,s.content_id,o.stream_id,o.ticket_type,upper(substr(encode(gen_random_bytes(12),'hex'),1,16)),o.amount_minor::numeric/100,o.currency,v_from,v_until,
 case when o.user_id is null then lower(o.email) else null end,p_claim_token_hash,
 jsonb_build_object('payment_reference',p_reference,'provider',o.provider,'transaction_id',p_transaction_id,'screening_id',s.id,'guest',o.user_id is null))
 returning id into v_ticket;
 update public.live_payment_orders set status='paid',provider_transaction_id=p_transaction_id,paid_at=now(),updated_at=now() where id=o.id;
 return jsonb_build_object('already_paid',false,'ticket_id',v_ticket,'screening_id',s.id,'stream_id',l.id,'ticket_type',o.ticket_type,'valid_until',v_until,'email',o.email,'title',s.title,'ticket_code',(select ticket_code from public.tickets where id=v_ticket),'price',o.amount_minor::numeric/100,'currency',o.currency);
end $$;
revoke all on function public.complete_live_payment_order(text,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.complete_live_payment_order(text,text,bigint,text,text) to service_role;

create or replace function public.claim_live_guest_ticket(p_token_hash text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_email text; v_count integer;
begin
 if v_user is null then raise exception 'authentication_required'; end if;
 if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_claim_token'; end if;
 select lower(email) into v_email from auth.users where id=v_user;
 if v_email is null then raise exception 'verified_account_email_required'; end if;
 update public.tickets set user_id=v_user,claimed_at=now(),claim_token_hash=null,guest_email=null
 where claim_token_hash=p_token_hash and user_id is null and lower(guest_email)=v_email and valid_until>now() and revoked_at is null;
 get diagnostics v_count=row_count;
 if v_count<>1 then raise exception 'ticket_claim_failed'; end if;
 return jsonb_build_object('claimed',true);
end $$;
revoke all on function public.claim_live_guest_ticket(text) from public,anon;
grant execute on function public.claim_live_guest_ticket(text) to authenticated;
