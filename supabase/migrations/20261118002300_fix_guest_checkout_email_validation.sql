create or replace function public.create_guest_payment_order(
 p_provider text,p_reference text,p_screening_id uuid,p_tenant_id uuid,p_email text,
 p_amount_minor bigint,p_currency text,p_location text,p_ticket_code text,p_watch_code text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_ticket uuid; v_role text:=current_setting('request.jwt.claim.role',true);
begin
 if v_role<>'service_role' then raise exception 'forbidden'; end if;
 if p_provider not in ('paystack','flutterwave','stripe') or p_amount_minor<=0 or p_currency not in ('NGN','USD') then raise exception 'invalid_order'; end if;
 if p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$' then raise exception 'invalid_email'; end if;
 if not exists(select 1 from public.screenings s where s.id=p_screening_id and s.tenant_id=p_tenant_id and s.status='published') then raise exception 'screening_unavailable'; end if;
 insert into public.screening_tickets(tenant_id,screening_id,user_id,email,ticket_code,location,price,currency,addons,payment_status,payment_method,payment_reference,watch_code,ticket_kind)
 values(p_tenant_id,p_screening_id,null,lower(trim(p_email)),p_ticket_code,p_location,p_amount_minor::numeric/100,p_currency,'[]'::jsonb,'pending',p_provider,p_reference,p_watch_code,'live')
 returning id into v_ticket;
 insert into public.guest_payment_orders(ticket_id,provider,provider_reference,email,amount_minor,currency)
 values(v_ticket,p_provider,p_reference,lower(trim(p_email)),p_amount_minor,p_currency);
 return v_ticket;
end; $$;