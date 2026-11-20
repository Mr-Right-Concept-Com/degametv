create or replace function public.get_my_event_contributions()
returns table(id uuid,contribution_type text,amount_minor bigint,amount_major numeric,currency text,contributor_name text,message text,is_anonymous boolean,status text,paid_at timestamptz,event_title text)
language sql stable security definer set search_path to 'public','auth','pg_temp' as $function$
 select c.id,c.contribution_type,c.amount_minor,c.amount_major,c.currency,
  case when c.is_anonymous then 'Anonymous' else coalesce(nullif(c.contributor_name,''),'Viewer') end,
  c.message,c.is_anonymous,c.status,c.paid_at,coalesce(s.title,l.title,ct.title,'Content support')
 from public.event_contributions c left join public.screenings s on s.id=c.screening_id
 left join public.live_streams l on l.id=c.live_stream_id left join public.content ct on ct.id=c.content_id
 where auth.uid() is not null and c.creator_id=auth.uid() order by c.created_at desc limit 100;
$function$;
create or replace function public.get_content_support_feed(p_content_id uuid)
returns table(id uuid,contribution_type text,gift_catalog_key text,amount_major numeric,currency text,contributor_name text,message text,created_at timestamptz)
language plpgsql stable security definer set search_path to 'public','auth','pg_temp' as $function$
begin
 if not exists(select 1 from public.content c where c.id=p_content_id and c.status='published') then raise exception 'content_unavailable' using errcode='P0002';end if;
 return query select c.id,c.contribution_type,c.gift_catalog_key,coalesce(c.amount_major,c.amount_minor::numeric/100),c.currency,
  case when c.is_anonymous then 'Anonymous' else coalesce(nullif(c.contributor_name,''),'Viewer') end,c.message,c.paid_at
 from public.event_contributions c where c.content_id=p_content_id and c.target_kind='content' and c.status='paid'
 order by c.paid_at desc nulls last limit 30;
end;$function$;
revoke all on function public.get_content_support_feed(uuid) from public;
grant execute on function public.get_content_support_feed(uuid) to anon,authenticated;
