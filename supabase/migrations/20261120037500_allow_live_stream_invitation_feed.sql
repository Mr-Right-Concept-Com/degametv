create or replace function public.get_event_contribution_feed(
 p_screening_id uuid default null,p_live_stream_id uuid default null
) returns table(id uuid,contribution_type text,amount_major numeric,currency text,contributor_name text,message text,created_at timestamptz)
language plpgsql stable security definer
set search_path=public,auth,pg_temp
as $$
declare v_screening_id uuid;v_visibility text;v_invite_only boolean;v_status text;
begin
 if (p_screening_id is not null)::int+(p_live_stream_id is not null)::int<>1 then raise exception 'exactly_one_event_required' using errcode='22023';end if;
 if p_screening_id is not null then
  select id,event_visibility,invite_only,status into v_screening_id,v_visibility,v_invite_only,v_status from public.screenings where id=p_screening_id;
 else
  select (l.metadata->>'screening_id')::uuid into v_screening_id from public.live_streams l where l.id=p_live_stream_id;
  if v_screening_id is not null then
   select id,event_visibility,invite_only,status into v_screening_id,v_visibility,v_invite_only,v_status from public.screenings where id=v_screening_id;
  else
   select l.id,'private'::text,true,l.status into v_screening_id,v_visibility,v_invite_only,v_status from public.live_streams l where l.id=p_live_stream_id;
  end if;
 end if;
 if v_screening_id is null or v_status not in ('published','scheduled','live','starting') then raise exception 'event_unavailable' using errcode='P0002';end if;
 if coalesce(v_visibility,'public') not in ('public','unlisted') or coalesce(v_invite_only,false) then
  if auth.uid() is null or not exists(
   select 1 from public.event_access_invites i
   where i.status='accepted' and (i.expires_at is null or i.expires_at>now())
    and ((p_screening_id is not null and i.screening_id=p_screening_id)
      or (p_live_stream_id is not null and (i.live_stream_id=p_live_stream_id or i.screening_id=v_screening_id)))
    and (i.invited_user_id=auth.uid())
  ) then raise exception 'event_invitation_required' using errcode='42501';end if;
 end if;
 return query
 select c.id,c.contribution_type,coalesce(c.amount_major,c.amount_minor::numeric/100),c.currency,
  case when c.is_anonymous then 'Anonymous' else coalesce(nullif(c.contributor_name,''),'Viewer') end,
  c.message,c.paid_at
 from public.event_contributions c
 where c.status='paid' and ((p_screening_id is not null and c.screening_id=p_screening_id) or (p_live_stream_id is not null and c.live_stream_id=p_live_stream_id))
 order by c.paid_at desc nulls last limit 30;
end;
$$;
revoke all on function public.get_event_contribution_feed(uuid,uuid) from public;
grant execute on function public.get_event_contribution_feed(uuid,uuid) to anon,authenticated;