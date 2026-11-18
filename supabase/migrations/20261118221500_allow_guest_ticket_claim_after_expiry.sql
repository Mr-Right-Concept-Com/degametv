create or replace function public.claim_live_guest_ticket(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
 v_user uuid:=auth.uid();
 v_email text;
 v_confirmed timestamptz;
 v_count integer;
begin
 if v_user is null then raise exception 'authentication_required'; end if;
 if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_claim_token'; end if;
 select lower(email),email_confirmed_at into v_email,v_confirmed from auth.users where id=v_user;
 if v_email is null or v_confirmed is null then raise exception 'verified_account_email_required'; end if;
 update public.tickets set user_id=v_user,claimed_at=now(),claim_token_hash=null,guest_email=null
 where claim_token_hash=p_token_hash and user_id is null and lower(guest_email)=v_email and revoked_at is null;
 get diagnostics v_count=row_count;
 if v_count<>1 then raise exception 'ticket_claim_failed'; end if;
 return jsonb_build_object('claimed',true);
end
$function$;
revoke all on function public.claim_live_guest_ticket(text) from public,anon;
grant execute on function public.claim_live_guest_ticket(text) to authenticated;