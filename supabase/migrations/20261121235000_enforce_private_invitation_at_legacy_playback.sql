CREATE OR REPLACE FUNCTION public.authorize_legacy_screening_ticket_playback(
 p_watch_code text,
 p_email text,
 p_session_token_hash text,
 p_country_code text,
 p_provider_expires_at timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
 v_ticket public.screening_tickets%rowtype;
 v_screening public.screenings%rowtype;
 v_now timestamptz:=now();
 v_country text:=upper(left(coalesce(p_country_code,''),2));
 v_same_session boolean;
 v_max_streams integer;
 v_active_sessions integer:=0;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'forbidden' using errcode='42501'; end if;
 if coalesce(p_watch_code,'')='' or coalesce(p_email,'')='' or p_session_token_hash !~ '^[a-f0-9]{64}$' or p_provider_expires_at is null then raise exception 'invalid_playback_request' using errcode='22023'; end if;
 select st.* into v_ticket from public.screening_tickets st where st.watch_code=p_watch_code and lower(st.email)=lower(trim(p_email)) for update;
 if not found then raise exception 'ticket_not_found' using errcode='P0002'; end if;
 if v_ticket.payment_status<>'completed' then raise exception 'payment_not_confirmed' using errcode='42501'; end if;
 if v_ticket.refunded_at is not null then raise exception 'ticket_refunded' using errcode='42501'; end if;
 if v_ticket.expires_at is null or v_ticket.expires_at<=v_now then raise exception 'ticket_expired' using errcode='42501'; end if;
 select s.* into v_screening from public.screenings s where s.id=v_ticket.screening_id for update;
 if not found or v_screening.status<>'published' or v_screening.lifecycle in ('cancelled','archived') then raise exception 'screening_unavailable' using errcode='42501'; end if;
 if coalesce(v_screening.event_visibility,'public')='private' or coalesce(v_screening.invite_only,false) then
  if not exists(
   select 1 from public.event_access_invites i
   where i.screening_id=v_ticket.screening_id
    and lower(i.invited_email)=lower(trim(v_ticket.email))
    and i.status='accepted'
    and i.accepted_at is not null
    and (i.expires_at is null or i.expires_at>v_now)
    and (i.invited_user_id is null or i.invited_user_id=v_ticket.user_id)
  ) then
   raise exception 'private_screening_invitation_required' using errcode='42501';
  end if;
 end if;
 if cardinality(coalesce(v_screening.blocked_countries,'{}'::text[]))>0 and v_country=any(v_screening.blocked_countries) then raise exception 'territory_not_permitted' using errcode='42501'; end if;
 if cardinality(coalesce(v_screening.allowed_countries,'{}'::text[]))>0 and (v_country='' or not (v_country=any(v_screening.allowed_countries))) then raise exception 'territory_not_permitted' using errcode='42501'; end if;
 if v_ticket.first_played_at is not null and v_ticket.access_hours is not null and v_now>v_ticket.first_played_at+make_interval(hours=>v_ticket.access_hours) then raise exception 'viewing_window_expired' using errcode='42501'; end if;
 if p_provider_expires_at<=v_now or p_provider_expires_at>least(v_ticket.expires_at,v_now+interval '4 hours') then raise exception 'invalid_provider_grant_expiry' using errcode='22023'; end if;
 v_same_session:=v_ticket.active_session_token=p_session_token_hash;
 if v_ticket.active_session_token is not null and v_ticket.active_session_expires_at is not null and v_ticket.active_session_expires_at>v_now and not v_same_session then raise exception 'ticket_already_streaming' using errcode='42501'; end if;
 v_max_streams:=coalesce(v_screening.max_streams_per_ticket,5);
 if not v_same_session and v_max_streams>0 and coalesce(v_ticket.stream_count,0)>=v_max_streams then raise exception 'ticket_stream_limit_reached' using errcode='42501'; end if;
 if not v_same_session then
  select
   (select count(*) from public.screening_playback_sessions ps where ps.screening_id=v_ticket.screening_id and ps.revoked_at is null and ps.expires_at>v_now)
   +
   (select count(*) from public.screening_tickets st where st.screening_id=v_ticket.screening_id and st.id<>v_ticket.id and st.active_session_token is not null and st.active_session_expires_at>v_now)
  into v_active_sessions;
  if coalesce(v_screening.max_concurrent_streams,0)>0 and v_active_sessions>=v_screening.max_concurrent_streams then raise exception 'screening_concurrency_limit_reached' using errcode='42501'; end if;
 end if;
 update public.screening_tickets set first_played_at=coalesce(first_played_at,v_now),
  stream_count=case when v_same_session then coalesce(stream_count,0) when v_max_streams>0 then coalesce(stream_count,0)+1 else coalesce(stream_count,0) end,
  active_session_token=p_session_token_hash,active_session_started_at=v_now,active_session_expires_at=p_provider_expires_at,last_country=nullif(v_country,'')
 where id=v_ticket.id;
 return jsonb_build_object('ticket_id',v_ticket.id,'screening_id',v_ticket.screening_id,'content_id',v_screening.content_id,
  'session_expires_at',p_provider_expires_at,'streams_remaining',case when v_max_streams>0 then greatest(0,v_max_streams-(case when v_same_session then coalesce(v_ticket.stream_count,0) else coalesce(v_ticket.stream_count,0)+1 end)) else null end,
  'max_streams',case when v_max_streams>0 then v_max_streams else null end,'max_concurrent',coalesce(v_screening.max_concurrent_streams,1));
end;
$function$;

REVOKE ALL ON FUNCTION public.authorize_legacy_screening_ticket_playback(text,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_legacy_screening_ticket_playback(text,text,text,text,timestamptz) TO service_role;
