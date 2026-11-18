-- No hardcoded release-domain fallback; existing platform subdomains follow runtime root changes.
create or replace function public.register_release_domain(p_content_id uuid,p_subdomain text,p_custom_hostname text default null,p_branding jsonb default '{}'::jsonb)
returns public.release_domains language plpgsql security definer set search_path=public,pg_temp as $$
declare v_content public.content%rowtype; v_slug text; v_root text; v_host text; v_row public.release_domains%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into v_content from public.content where id=p_content_id and creator_id=auth.uid();
 if not found then raise exception 'Content not found or not owned by this creator'; end if;
 if v_content.status not in ('draft','published') then raise exception 'Only draft or published titles can have a release domain'; end if;
 v_slug:=trim(both '-' from lower(regexp_replace(coalesce(nullif(p_subdomain,''),v_content.slug,v_content.title),'[^a-z0-9]+','-','g')));
 if length(v_slug)<2 or length(v_slug)>63 then raise exception 'Release subdomain must be 2-63 characters'; end if;
 if v_slug in ('www','api','admin','app','auth','mail','ftp','cdn','assets','support','help','status','checkout','billing','studio','cinema') then raise exception 'This subdomain is reserved'; end if;
 select setting_value->>'releaseDomain' into v_root from public.platform_settings where setting_key='domain_settings';
 v_root:=lower(nullif(btrim(v_root),''));
 if v_root is null or v_root !~ '^[a-z0-9.-]+$' or position('..' in v_root)>0 then raise exception 'A valid release domain must be configured by an administrator'; end if;
 v_host:=case when p_custom_hostname is null or btrim(p_custom_hostname)='' then v_slug||'.'||v_root else lower(btrim(p_custom_hostname)) end;
 if v_host !~ '^[a-z0-9.-]+$' or position('..' in v_host)>0 then raise exception 'Invalid hostname'; end if;
 insert into public.release_domains(tenant_id,content_id,subdomain,hostname,domain_kind,status,branding)
 values(v_content.tenant_id,v_content.id,v_slug,v_host,case when p_custom_hostname is null or btrim(p_custom_hostname)='' then 'platform_subdomain' else 'custom_domain' end,case when p_custom_hostname is null or btrim(p_custom_hostname)='' then 'active' else 'pending_dns' end,coalesce(p_branding,'{}'::jsonb))
 on conflict(content_id) do update set subdomain=excluded.subdomain,hostname=excluded.hostname,domain_kind=excluded.domain_kind,status=case when excluded.domain_kind='platform_subdomain' then 'active' else public.release_domains.status end,branding=excluded.branding,updated_at=now()
 returning * into v_row;
 return v_row;
end $$;
create or replace function public.sync_release_domain_root()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_root text;
begin
 if new.setting_key='domain_settings' and (tg_op='INSERT' or old.setting_value is distinct from new.setting_value) then
  v_root:=lower(nullif(btrim(new.setting_value->>'releaseDomain'),''));
  if v_root is not null and v_root ~ '^[a-z0-9.-]+$' and position('..' in v_root)=0 then
   update public.release_domains set hostname=subdomain||'.'||v_root,status='active',updated_at=now() where domain_kind='platform_subdomain' and hostname is distinct from subdomain||'.'||v_root;
  end if;
 end if;
 return new;
end $$;
drop trigger if exists sync_release_domain_root on public.platform_settings;
create trigger sync_release_domain_root after insert or update of setting_value on public.platform_settings for each row when (new.setting_key='domain_settings') execute function public.sync_release_domain_root();
