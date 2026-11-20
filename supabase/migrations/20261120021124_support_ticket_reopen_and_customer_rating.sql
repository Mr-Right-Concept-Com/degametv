create or replace function public.rate_support_ticket(p_ticket_id uuid,p_rating smallint)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $function$
declare v_ticket public.support_tickets%rowtype;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_ticket_id is null or p_rating is null or p_rating<1 or p_rating>5 then raise exception 'invalid_rating' using errcode='22023'; end if;
 select * into v_ticket from public.support_tickets where id=p_ticket_id and user_id=auth.uid() for update;
 if not found or v_ticket.status not in ('resolved','closed') then raise exception 'ticket_not_rateable' using errcode='42501'; end if;
 if v_ticket.satisfaction_rating is not null then raise exception 'ticket_already_rated' using errcode='22023'; end if;
 update public.support_tickets set satisfaction_rating=p_rating,updated_at=now() where id=p_ticket_id;
 return jsonb_build_object('ticket_id',p_ticket_id,'rating',p_rating);
end;$function$;
revoke all on function public.rate_support_ticket(uuid,smallint) from public,anon;
grant execute on function public.rate_support_ticket(uuid,smallint) to authenticated;
revoke all on function public.reopen_support_ticket(uuid) from public,anon;
grant execute on function public.reopen_support_ticket(uuid) to authenticated;
