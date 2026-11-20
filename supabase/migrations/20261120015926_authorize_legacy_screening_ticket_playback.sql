create or replace function public.authorize_legacy_screening_ticket_playback(p_watch_code text,p_email text,p_session_token_hash text,p_country_code text,p_provider_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $function$
declare v_ticket public.screening_tickets%rowtype; v_screening public.screenings%rowtype; v_now timestamptz:=now(); v_country text:=upper(left(coalesce(p_country_code,''),2)); v_same_session boolean; v_max_streams integer;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'forbidden' using errcode='42501'; end if;
 if coalesce(p_watch_code,'')='' or coalesce(p_email,'')='' or p_session_token_hash !~ '^[a-f0-9]{64}$' or p_provider_expires_at is null then raise exception 'invalid_playback_request' using errcode='22023'; end if;
 select st.* into v_ticket from public.screening_tickets st where st.watch_code=p_watch_code and lower(st.email)=lower(trim(p_email)) for update;
 if not found then raise exception 'ticket_not_found' using errcode='P0002'; end if;
 if v_ticket.payment_status<>'completed' then raise exception 'payment_not_confirmed' using errcode='42501'; end if;
 if v_ticket.refunded_at is not null then raise exception 'ticket_refunded' using errcode='42501'; end if;
 if v_ticket.expires_at is null or v_ticket.expires_at<=v_now then raise exception 'ticket_expired' using errcode='42501'; end if;
 select s.* into v_screening from public.screenings s where s.id=v_ticket.screening_id;
 if not found or v_screening.status<>'published' or v_screening.lifecycle in ('cancelled','archived') then raise exception 'screening_unavailable' using errcode='42501'; end if;
 if cardinality(coalesce(v_screening.blocked_countries,'{}'::text[]))>0 and v_country=any(v_screening.blocked_countries) then raise exception 'territory_not_permitted' using errcode='42501'; end if;
 if cardinality(coalesce(v_screening.allowed_countries,'{}'::text[]))>0 and (v_country='' or not (v_country=any(v_screening.allowed_countries))) then raise exception 'territory_not_permitted' using errcode='42501'; end if;
 if v_ticket.first_played_at is not null and v_ticket.access_hours is not null and v_now>v_ticket.first_played_at+make_interval(hours=>v_ticket.access_hours) then raise exception 'viewing_window_expired' using errcode='42501'; end if;
 if p_provider_expires_at<=v_now or p_provider_expires_at>least(v_ticket.expires_at,v_now+interval '4 hours') then raise exception 'invalid_provider_grant_expiry' using errcode='22023'; end if;
 v_same_session:=v_ticket.active_session_token=p_session_token_hash;
 if v_ticket.active_session_token is not null and v_ticket.active_session_expires_at is not null and v_ticket.active_session_expires_at>v_now and not v_same_session then raise exception 'ticket_already_streaming' using errcode='42501'; end if;
 v_max_streams:=coalesce(v_screening.max_streams_per_ticket,5);
 if not v_same_session and coalesce(v_ticket.stream_count,0)>=v_max_streams then raise exception 'ticket_stream_limit_reached' using errcode='42501'; end if;
 update public.screening_tickets set first_played_at=coalesce(first_played_at,v_now),stream_count=case when v_same_session then coalesce(stream_count,0) else coalesce(stream_count,0)+1 end,active_session_token=p_session_token_hash,active_session_started_at=v_now,active_session_expires_at=p_provider_expires_at,last_country=nullif(v_country,'') where id=v_ticket.id;
 return jsonb_build_object('ticket_id',v_ticket.id,'screening_id',v_ticket.screening_id,'content_id',v_screening.content_id,'session_expires_at',p_provider_expires_at,'streams_remaining',greatest(0,v_max_streams-(case when v_same_session then coalesce(v_ticket.stream_count,0) else coalesce(v_ticket.stream_count,0)+1 end)),'max_streams',v_max_streams,'max_concurrent',coalesce(v_screening.max_concurrent_streams,1));
end;$function$;
revoke all on function public.authorize_legacy_screening_ticket_playback(text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.authorize_legacy_screening_ticket_playback(text,text,text,text,timestamptz) to service_role;
