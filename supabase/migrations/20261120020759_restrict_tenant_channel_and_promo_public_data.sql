drop policy if exists "Anyone can view active tenants" on public.tenants;
revoke select on public.tenants from public,anon,authenticated;

create or replace function public.get_my_tenant_config()
returns table(id uuid,name text,slug text,custom_domain text,logo_url text,favicon_url text,primary_color text,secondary_color text,is_active boolean,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,auth,pg_temp
as $function$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
 return query select t.id,t.name,t.slug,t.custom_domain,t.logo_url,t.favicon_url,t.primary_color,t.secondary_color,t.is_active,t.created_at,t.updated_at
 from public.tenants t join public.user_roles r on r.tenant_id=t.id where r.user_id=v_user and r.tenant_id is not null order by t.created_at desc limit 1;
end;
$function$;
revoke all on function public.get_my_tenant_config() from public,anon;
grant execute on function public.get_my_tenant_config() to authenticated;

drop policy if exists "Anyone can view active channels" on public.channels;
create policy "Anyone can view active free channels" on public.channels for select to anon,authenticated using (is_active=true and monetization='free');
revoke select on public.channels from public,anon,authenticated;
grant select (id,name,slug,description,logo_url,banner_url,stream_url,epg_url,is_live,category,monetization,is_active,sort_order,created_at,updated_at) on public.channels to anon,authenticated;

drop policy if exists "Anyone can read active promo codes for validation" on public.promo_codes;
revoke all on public.promo_codes from anon;
revoke all on public.live_reactions from anon;
