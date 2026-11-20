create or replace function public.authorize_screening_ticket_playback(p_screening_id uuid,p_session_token_hash text,p_country_code text default null,p_mode text default 'live')
returns table(ticket_id uuid,session_expires_at timestamptz,session_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $function$
declare v_user uuid:=auth.uid(); v_screening public.screenings%rowtype; v_ticket public.tickets%rowtype; v_session uuid; v_expiry timestamptz; v_country text:=upper(left(coalesce(p_country_code,''),2)); v_now timestamptz:=now(); v_active_sessions integer:=0;
begin
 if v_user is null then raise exception 'authentication_required'; end if;
 if p_mode not in ('live','replay') or p_session_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_playback_session'; end if;
 select * into v_screening from public.screenings where id=p_screening_id and status='published' for update;
 if not found or v_screening.lifecycle in ('cancelled','archived') then raise exception 'screening_unavailable'; end if;
 if cardinality(coalesce(v_screening.allowed_countries,'{}'::text[]))>0 and (v_country='' or not (v_country=any(v_screening.allowed_countries))) then raise exception 'territory_not_permitted'; end if;
 if v_country<>'' and v_country=any(coalesce(v_screening.blocked_countries,'{}'::text[])) then raise exception 'territory_not_permitted'; end if;
 select * into v_ticket from public.tickets where stream_id in (select id from public.live_streams where metadata->>'screening_id'=p_screening_id::text) and user_id=v_user and revoked_at is null and valid_from<=v_now and valid_until>v_now and (ticket_type='combo' or ticket_type::text=p_mode) order by created_at desc limit 1 for update;
 if not found then raise exception 'valid_ticket_required'; end if;
 if v_ticket.active_session_expires_at is not null and v_ticket.active_session_expires_at>v_now then raise exception 'ticket_already_streaming'; end if;
 if coalesce(v_screening.max_streams_per_ticket,0)>0 and coalesce(v_ticket.stream_count,0)>=v_screening.max_streams_per_ticket then raise exception 'ticket_stream_limit_reached'; end if;
 select (select count(*) from public.screening_playback_sessions ps where ps.screening_id=p_screening_id and ps.revoked_at is null and ps.expires_at>v_now)+(select count(*) from public.screening_tickets st where st.screening_id=p_screening_id and st.active_session_token is not null and st.active_session_expires_at>v_now) into v_active_sessions;
 if coalesce(v_screening.max_concurrent_streams,0)>0 and v_active_sessions>=v_screening.max_concurrent_streams then raise exception 'screening_concurrency_limit_reached'; end if;
 v_expiry:=least(v_ticket.valid_until,v_now+interval '60 minutes');
 insert into public.screening_playback_sessions(tenant_id,screening_id,ticket_id,user_id,session_token_hash,country_code,expires_at) values(v_ticket.tenant_id,p_screening_id,v_ticket.id,v_user,p_session_token_hash,nullif(v_country,''),v_expiry) returning id into v_session;
 update public.tickets set stream_count=coalesce(stream_count,0)+1,active_session_token=p_session_token_hash,active_session_started_at=v_now,active_session_expires_at=v_expiry where id=v_ticket.id;
 return query select v_ticket.id,v_expiry,v_session;
end;$function$;

create or replace function public.authorize_legacy_screening_ticket_playback(p_watch_code text,p_email text,p_session_token_hash text,p_country_code text,p_provider_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $function$
declare v_ticket public.screening_tickets%rowtype; v_screening public.screenings%rowtype; v_now timestamptz:=now(); v_country text:=upper(left(coalesce(p_country_code,''),2)); v_same_session boolean; v_max_streams integer; v_active_sessions integer:=0;
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
 if cardinality(coalesce(v_screening.blocked_countries,'{}'::text[]))>0 and v_country=any(v_screening.blocked_countries) then raise exception 'territory_not_permitted' using errcode='42501'; end if;
 if cardinality(coalesce(v_screening.allowed_countries,'{}'::text[]))>0 and (v_country='' or not (v_country=any(v_screening.allowed_countries))) then raise exception 'territory_not_permitted' using errcode='42501'; end if;
 if v_ticket.first_played_at is not null and v_ticket.access_hours is not null and v_now>v_ticket.first_played_at+make_interval(hours=>v_ticket.access_hours) then raise exception 'viewing_window_expired' using errcode='42501'; end if;
 if p_provider_expires_at<=v_now or p_provider_expires_at>least(v_ticket.expires_at,v_now+interval '4 hours') then raise exception 'invalid_provider_grant_expiry' using errcode='22023'; end if;
 v_same_session:=v_ticket.active_session_token=p_session_token_hash;
 if v_ticket.active_session_token is not null and v_ticket.active_session_expires_at is not null and v_ticket.active_session_expires_at>v_now and not v_same_session then raise exception 'ticket_already_streaming' using errcode='42501'; end if;
 v_max_streams:=coalesce(v_screening.max_streams_per_ticket,5);
 if not v_same_session and v_max_streams>0 and coalesce(v_ticket.stream_count,0)>=v_max_streams then raise exception 'ticket_stream_limit_reached' using errcode='42501'; end if;
 if not v_same_session then
  select (select count(*) from public.screening_playback_sessions ps where ps.screening_id=v_ticket.screening_id and ps.revoked_at is null and ps.expires_at>v_now)+(select count(*) from public.screening_tickets st where st.screening_id=v_ticket.screening_id and st.id<>v_ticket.id and st.active_session_token is not null and st.active_session_expires_at>v_now) into v_active_sessions;
  if coalesce(v_screening.max_concurrent_streams,0)>0 and v_active_sessions>=v_screening.max_concurrent_streams then raise exception 'screening_concurrency_limit_reached' using errcode='42501'; end if;
 end if;
 update public.screening_tickets set first_played_at=coalesce(first_played_at,v_now),stream_count=case when v_same_session then coalesce(stream_count,0) when v_max_streams>0 then coalesce(stream_count,0)+1 else coalesce(stream_count,0) end,active_session_token=p_session_token_hash,active_session_started_at=v_now,active_session_expires_at=p_provider_expires_at,last_country=nullif(v_country,'') where id=v_ticket.id;
 return jsonb_build_object('ticket_id',v_ticket.id,'screening_id',v_ticket.screening_id,'content_id',v_screening.content_id,'session_expires_at',p_provider_expires_at,'streams_remaining',case when v_max_streams>0 then greatest(0,v_max_streams-(case when v_same_session then coalesce(v_ticket.stream_count,0) else coalesce(v_ticket.stream_count,0)+1 end)) else null end,'max_streams',case when v_max_streams>0 then v_max_streams else null end,'max_concurrent',coalesce(v_screening.max_concurrent_streams,1));
end;$function$;
revoke all on function public.authorize_legacy_screening_ticket_playback(text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.authorize_legacy_screening_ticket_playback(text,text,text,text,timestamptz) to service_role;
