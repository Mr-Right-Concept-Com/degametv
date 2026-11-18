-- Native release-domain routing: each published title remains canonical content.
create table if not exists public.release_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  content_id uuid not null references public.content(id) on delete cascade,
  subdomain text not null,
  hostname text not null,
  domain_kind text not null default 'platform_subdomain' check (domain_kind in ('platform_subdomain','custom_domain')),
  status text not null default 'pending_dns' check (status in ('pending_dns','active','suspended')),
  branding jsonb not null default '{}'::jsonb,
  dns_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(content_id),
  unique(hostname),
  check (subdomain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  check (hostname = lower(hostname) and position('://' in hostname)=0)
);
create index if not exists release_domains_hostname_active_idx on public.release_domains(hostname) where status='active';
alter table public.release_domains enable row level security;
drop policy if exists "Active release domains are publicly readable" on public.release_domains;
create policy "Active release domains are publicly readable" on public.release_domains for select using (status='active');
drop policy if exists "Creators manage own release domains" on public.release_domains;
create policy "Creators manage own release domains" on public.release_domains for all to authenticated
using (exists(select 1 from public.content c where c.id=content_id and c.creator_id=auth.uid()))
with check (exists(select 1 from public.content c where c.id=content_id and c.creator_id=auth.uid()));
create or replace function public.register_release_domain(p_content_id uuid,p_subdomain text,p_custom_hostname text default null,p_branding jsonb default '{}'::jsonb)
returns public.release_domains language plpgsql security definer set search_path=public,pg_temp as $$
declare v_content public.content%rowtype; v_slug text; v_root text; v_host text; v_row public.release_domains%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into v_content from public.content where id=p_content_id and creator_id=auth.uid();
 if not found then raise exception 'Content not found or not owned by this creator'; end if;
 if v_content.status not in ('draft','published') then raise exception 'Only draft or published titles can have a release domain'; end if;
 v_slug:=lower(regexp_replace(coalesce(nullif(p_subdomain,''),v_content.slug,v_content.title),'[^a-z0-9]+','-','g'));
 v_slug:=trim(both '-' from v_slug);
 if length(v_slug)<2 or length(v_slug)>63 then raise exception 'Release subdomain must be 2-63 characters'; end if;
 if v_slug in ('www','api','admin','app','auth','mail','ftp','cdn','assets','support','help','status','checkout','billing','studio','cinema') then raise exception 'This subdomain is reserved'; end if;
 select coalesce(setting_value->>'releaseDomain','spixie.net') into v_root from public.platform_settings where setting_key='domain_settings';
 v_root:=lower(coalesce(nullif(v_root,''),'spixie.net'));
 v_host:=case when p_custom_hostname is null or btrim(p_custom_hostname)='' then v_slug||'.'||v_root else lower(btrim(p_custom_hostname)) end;
 if v_host !~ '^[a-z0-9.-]+$' or position('..' in v_host)>0 then raise exception 'Invalid hostname'; end if;
 insert into public.release_domains(tenant_id,content_id,subdomain,hostname,domain_kind,status,branding)
 values(v_content.tenant_id,v_content.id,v_slug,v_host,case when p_custom_hostname is null or btrim(p_custom_hostname)='' then 'platform_subdomain' else 'custom_domain' end,
 case when p_custom_hostname is null or btrim(p_custom_hostname)='' then 'active' else 'pending_dns' end,coalesce(p_branding,'{}'::jsonb))
 on conflict(content_id) do update set subdomain=excluded.subdomain,hostname=excluded.hostname,domain_kind=excluded.domain_kind,
 status=case when excluded.domain_kind='platform_subdomain' then 'active' else public.release_domains.status end,
 branding=excluded.branding,updated_at=now()
 returning * into v_row;
 return v_row;
end $$;
revoke all on function public.register_release_domain(uuid,text,text,jsonb) from public;
grant execute on function public.register_release_domain(uuid,text,text,jsonb) to authenticated;
create or replace function public.resolve_release_domain(p_hostname text)
returns table(content_id uuid,content_slug text,content_title text,content_type text,screening_id uuid,domain_branding jsonb)
language sql stable security definer set search_path=public,pg_temp as $$
 select c.id,c.slug,c.title,c.type::text,s.id,rd.branding
 from public.release_domains rd
 join public.content c on c.id=rd.content_id and c.status='published'
 left join lateral (select sc.id from public.screenings sc where sc.content_id=c.id and sc.status='published' order by sc.screening_date asc nulls last limit 1) s on true
 where rd.hostname=lower(split_part(coalesce(p_hostname,''),':',1)) and rd.status='active'
 limit 1
$$;
revoke all on function public.resolve_release_domain(text) from public;
grant execute on function public.resolve_release_domain(text) to anon,authenticated;
