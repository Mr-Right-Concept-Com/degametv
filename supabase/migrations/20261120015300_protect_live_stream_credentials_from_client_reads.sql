drop policy if exists "Public can view non-private scheduled/live streams" on public.live_streams;
drop policy if exists "Creators can manage their streams" on public.live_streams;
drop policy if exists "Super admins can manage all streams" on public.live_streams;

create policy "Creators manage own streams" on public.live_streams
for all to authenticated using (creator_id = (select auth.uid()))
with check (creator_id = (select auth.uid()));

create policy "Super admins manage all streams" on public.live_streams
for all to authenticated using (public.is_super_admin((select auth.uid())))
with check (public.is_super_admin((select auth.uid())));

revoke all on public.live_streams from anon, authenticated;

create or replace function public.get_my_live_stream_lifecycle(p_screening_id uuid)
returns table(lifecycle_status text,reconnect_grace_expires_at timestamptz,actual_started_at timestamptz,actual_ended_at timestamptz)
language plpgsql stable security definer set search_path=public,auth,pg_temp
as $function$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
 return query select ls.lifecycle_status::text,ls.reconnect_grace_expires_at,ls.actual_started_at,ls.actual_ended_at
 from public.live_streams ls where ls.creator_id=v_user and ls.metadata->>'screening_id'=p_screening_id::text
 order by ls.created_at desc limit 1;
end;
$function$;

revoke all on function public.get_my_live_stream_lifecycle(uuid) from public,anon;
grant execute on function public.get_my_live_stream_lifecycle(uuid) to authenticated;
