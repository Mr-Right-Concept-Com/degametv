-- Return the canonical storefront SEO metadata and domain identity in the existing resolver projection.
create or replace function public.resolve_release_domain(p_hostname text)
returns table(
  content_id uuid,
  content_slug text,
  content_title text,
  content_type text,
  screening_id uuid,
  domain_branding jsonb
)
language sql
stable
security definer
set search_path=public,pg_temp
as $function$
  select
    c.id,
    c.slug,
    c.title,
    c.type::text,
    s.id,
    coalesce(rd.branding,'{}'::jsonb) ||
      jsonb_build_object(
        'seo',coalesce(rd.seo_metadata,'{}'::jsonb),
        'domainKind',rd.domain_kind,
        'hostname',rd.hostname
      )
  from public.release_domains rd
  join public.content c on c.id=rd.content_id and c.status='published'
  left join lateral (
    select sc.id
    from public.screenings sc
    where sc.content_id=c.id and sc.status='published'
    order by sc.screening_date asc nulls last
    limit 1
  ) s on true
  where rd.hostname=lower(split_part(coalesce(p_hostname,''),':',1))
    and rd.status='active'
    and coalesce(rd.verification_status,'ACTIVE'::public.production_domain_status)='ACTIVE'
  limit 1
$function$;
revoke all on function public.resolve_release_domain(text) from public;
grant execute on function public.resolve_release_domain(text) to anon,authenticated,service_role;