create or replace function public.claim_free_live_ticket(p_screening_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
 v_user uuid:=auth.uid();
 v_screening public.screenings%rowtype;
 v_stream public.live_streams%rowtype;
 v_ticket public.tickets%rowtype;
 v_expiry timestamptz;
begin
 if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into v_screening from public.screenings where id=p_screening_id and status='published' for share;
 if not found then raise exception 'screening_unavailable'; end if;
 if v_screening.access_model<>'FREE' or coalesce(v_screening.live_price_ngn,0)<>0 or coalesce(v_screening.live_price_usd,0)<>0 then
  raise exception 'free_admission_not_enabled';
 end if;
 if v_screening.event_visibility='private' or v_screening.invite_only then
  if not exists(select 1 from public.event_access_invites i where i.screening_id=v_screening.id and i.invited_user_id=v_user and i.status='accepted' and (i.expires_at is null or i.expires_at>now())) then
   raise exception 'accepted_event_invitation_required' using errcode='42501';
  end if;
 end if;
 if v_screening.sales_open_at is not null and now()<v_screening.sales_open_at then raise exception 'ticket_sales_not_open'; end if;
 if v_screening.sales_close_at is not null and now()>=v_screening.sales_close_at then raise exception 'ticket_sales_closed'; end if;
 select * into v_stream from public.live_streams
  where tenant_id=v_screening.tenant_id and metadata->>'screening_id'=v_screening.id::text
    and status in ('scheduled','live','starting')
  order by created_at desc limit 1 for share;
 if not found then raise exception 'stream_not_provisioned'; end if;
 if v_screening.presale_enabled=false and v_stream.status='scheduled'
    and (v_screening.screening_date is null or v_screening.screening_date>now()) then
  raise exception 'advance_ticket_sales_disabled';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text||':'||v_stream.id::text,0));
 select * into v_ticket from public.tickets
  where stream_id=v_stream.id and user_id=v_user and ticket_type in ('live','combo')
    and revoked_at is null and valid_until>now()
  order by created_at desc limit 1;
 if found then
  return jsonb_build_object('claimed',true,'already_claimed',true,'ticket_id',v_ticket.id,'ticket_code',v_ticket.ticket_code,'stream_id',v_stream.id);
 end if;
 v_expiry:=coalesce(v_screening.screening_date,now())+interval '24 hours';
 if v_expiry<=now() then raise exception 'free_live_admission_expired'; end if;
 insert into public.tickets(user_id,tenant_id,content_id,stream_id,ticket_type,ticket_code,price,currency,valid_from,valid_until,metadata)
 values(v_user,v_screening.tenant_id,v_screening.content_id,v_stream.id,'live',
  upper(substr(encode(extensions.gen_random_bytes(12),'hex'),1,16)),0,coalesce(v_screening.base_currency,'NGN'),
  now(),v_expiry,jsonb_build_object('screening_id',v_screening.id,'admission_model','FREE','source','free_live_claim'))
 returning * into v_ticket;
 return jsonb_build_object('claimed',true,'already_claimed',false,'ticket_id',v_ticket.id,'ticket_code',v_ticket.ticket_code,'stream_id',v_stream.id,'valid_until',v_ticket.valid_until);
end;
$$;
revoke all on function public.claim_free_live_ticket(uuid) from public,anon;
grant execute on function public.claim_free_live_ticket(uuid) to authenticated;