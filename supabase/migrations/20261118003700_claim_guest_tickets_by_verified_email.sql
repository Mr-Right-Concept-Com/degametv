create or replace function public.claim_guest_tickets()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_email text:=lower(trim(coalesce(auth.jwt()->>'email',''))); v_count integer;
begin
 if v_user is null or v_email='' then raise exception 'authenticated_email_required'; end if;
 update public.screening_tickets set user_id=v_user
 where user_id is null and lower(trim(email))=v_email and payment_status='completed';
 get diagnostics v_count=row_count;
 if v_count>0 then
  insert into public.audit_logs(user_id,action,entity_type,new_data)
  values(v_user,'guest.tickets.claimed','screening_ticket',jsonb_build_object('claimed_count',v_count));
 end if;
 return v_count;
end; $$;
revoke all on function public.claim_guest_tickets() from public,anon;
grant execute on function public.claim_guest_tickets() to authenticated;