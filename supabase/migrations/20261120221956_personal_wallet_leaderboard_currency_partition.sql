CREATE OR REPLACE FUNCTION public.get_event_contribution_leaderboard(p_target_kind text, p_target_id uuid, p_currency text DEFAULT NULL::text)
 RETURNS TABLE(rank_position bigint, contributor_name text, total_amount_major numeric, currency text, contribution_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
 if p_target_id is null or p_target_kind not in ('content','screening','live_stream') then raise exception 'invalid_contribution_target' using errcode='22023';end if;
 if p_target_kind='content' and not exists(select 1 from public.content where id=p_target_id and status='published') then return;end if;
 if p_target_kind='screening' and not exists(select 1 from public.screenings where id=p_target_id and status='published' and coalesce(event_visibility,'public')='public' and not coalesce(invite_only,false)) then return;end if;
 if p_target_kind='live_stream' and not exists(select 1 from public.live_streams where id=p_target_id and status in ('live','ended') and coalesce(metadata->>'event_visibility','public')='public' and coalesce(metadata->>'invite_only','false')<>'true') then return;end if;
 return query select row_number() over(partition by ec.currency order by sum(ec.amount_minor) desc),
  case when bool_or(ec.is_anonymous) then 'Anonymous' else coalesce(max(nullif(ec.contributor_name,'')),'Viewer') end,
  sum(coalesce(ec.amount_major,ec.amount_minor::numeric/100)),ec.currency,count(*)::bigint
 from public.event_contributions ec where ec.status='paid' and (p_currency is null or ec.currency=upper(p_currency))
 and case p_target_kind when 'content' then ec.content_id=p_target_id when 'screening' then ec.screening_id=p_target_id else ec.live_stream_id=p_target_id end
 group by ec.currency,coalesce(ec.contributor_user_id::text,ec.contributor_name,ec.id::text)
 order by ec.currency,sum(ec.amount_minor) desc limit 100;
end;
$function$
;
REVOKE ALL ON FUNCTION public.get_event_contribution_leaderboard(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_contribution_leaderboard(text,uuid,text) TO anon,authenticated;
REVOKE ALL ON FUNCTION public.get_event_contribution_totals(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_contribution_totals(text,uuid) TO anon,authenticated;
