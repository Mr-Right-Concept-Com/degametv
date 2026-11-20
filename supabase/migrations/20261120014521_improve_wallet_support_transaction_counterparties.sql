create or replace function public.get_my_support_transactions()
returns table(id uuid,direction text,contribution_type text,amount_major numeric,currency text,status text,target_title text,display_name text,message text,created_at timestamptz)
language sql stable security definer set search_path to 'public','auth','pg_temp' as $function$
 select c.id,case when c.creator_id=(select auth.uid()) then 'received' else 'sent' end,
 c.contribution_type,coalesce(c.amount_major,c.amount_minor::numeric/100),c.currency,c.status,
 coalesce(s.title,l.title,ct.title,'Creator support'),
 case when c.creator_id=(select auth.uid()) then case when c.is_anonymous then 'Anonymous' else coalesce(nullif(c.contributor_name,''),'Viewer') end
 else coalesce(nullif(p.display_name,''),nullif(p.full_name,''),'Creator') end,
 c.message,c.created_at
 from public.event_contributions c left join public.screenings s on s.id=c.screening_id
 left join public.live_streams l on l.id=c.live_stream_id left join public.content ct on ct.id=c.content_id
 left join public.profiles p on p.user_id=c.creator_id
 where c.creator_id=(select auth.uid()) or c.contributor_user_id=(select auth.uid())
 order by c.created_at desc limit 100;
$function$;
revoke all on function public.get_my_support_transactions() from public,anon;
grant execute on function public.get_my_support_transactions() to authenticated;
