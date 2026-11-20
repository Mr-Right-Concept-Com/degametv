create or replace function public.admin_list_tenants()
returns table(id uuid,name text,slug text,custom_domain text,tenant_type text,is_active boolean,created_at timestamptz,user_count bigint,content_count bigint,published_content_count bigint)
language plpgsql stable security definer set search_path=public,auth,pg_temp as $function$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or not public.is_super_admin(v_user) then raise exception 'forbidden' using errcode='42501'; end if;
 return query select t.id,t.name,t.slug,t.custom_domain,t.type::text,t.is_active,t.created_at,
  (select count(distinct ur.user_id) from public.user_roles ur where ur.tenant_id=t.id),
  (select count(*) from public.content c where c.tenant_id=t.id),
  (select count(*) from public.content c where c.tenant_id=t.id and c.status='published')
 from public.tenants t order by t.created_at desc;
end;$function$;

create or replace function public.admin_set_tenant_status(p_tenant_id uuid,p_is_active boolean)
returns boolean language plpgsql security definer set search_path=public,auth,pg_temp as $function$
declare v_user uuid:=auth.uid(); v_old boolean;
begin
 if v_user is null or not public.is_super_admin(v_user) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_tenant_id is null or p_is_active is null then raise exception 'invalid_tenant_status_request' using errcode='22023'; end if;
 select is_active into v_old from public.tenants where id=p_tenant_id for update;
 if not found then raise exception 'tenant_not_found' using errcode='P0002'; end if;
 if v_old=p_is_active then return true; end if;
 update public.tenants set is_active=p_is_active,updated_at=now() where id=p_tenant_id;
 insert into public.audit_logs(tenant_id,user_id,action,entity_type,entity_id,old_data,new_data)
 values(p_tenant_id,v_user,'tenant.status_updated','tenant',p_tenant_id,jsonb_build_object('is_active',v_old),jsonb_build_object('is_active',p_is_active));
 return true;
end;$function$;
revoke all on function public.admin_list_tenants() from public,anon;
revoke all on function public.admin_set_tenant_status(uuid,boolean) from public,anon;
grant execute on function public.admin_list_tenants() to authenticated;
grant execute on function public.admin_set_tenant_status(uuid,boolean) to authenticated;
