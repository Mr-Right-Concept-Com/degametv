create or replace function public.get_my_event_contributions()
returns table(
 id uuid,
 contribution_type text,
 amount_minor bigint,
 amount_major numeric,
 currency text,
 contributor_name text,
 message text,
 is_anonymous boolean,
 status text,
 paid_at timestamptz,
 event_title text
)
language sql
stable
security definer
set search_path=public,auth,pg_temp
as $$
 select c.id,c.contribution_type,c.amount_minor,c.amount_major,c.currency,
  case when c.is_anonymous then 'Anonymous' else coalesce(nullif(c.contributor_name,''),'Viewer') end,
  c.message,c.is_anonymous,c.status,c.paid_at,
  coalesce(s.title,l.title,'Event')
 from public.event_contributions c
 left join public.screenings s on s.id=c.screening_id
 left join public.live_streams l on l.id=c.live_stream_id
 where auth.uid() is not null and c.creator_id=auth.uid()
 order by c.created_at desc
 limit 100;
$$;
revoke all on function public.get_my_event_contributions() from public,anon;
grant execute on function public.get_my_event_contributions() to authenticated;