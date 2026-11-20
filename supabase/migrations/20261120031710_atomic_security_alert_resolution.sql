create or replace function public.resolve_platform_security_alert(p_alert_id uuid,p_actor_id uuid,p_resolution_note text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_alert public.platform_security_alerts%rowtype;
begin
 if p_actor_id is null or not exists(select 1 from public.user_roles where user_id=p_actor_id and role='super_admin') then raise exception 'super_admin_required' using errcode='42501';end if;
 if p_resolution_note is null or length(btrim(p_resolution_note))<5 then raise exception 'security_alert_resolution_note_required' using errcode='22023';end if;
 select * into v_alert from public.platform_security_alerts where id=p_alert_id for update;
 if not found then raise exception 'security_alert_not_found' using errcode='P0002';end if;
 if v_alert.resolved_at is not null then raise exception 'security_alert_already_resolved' using errcode='40001';end if;
 update public.platform_security_alerts set resolved_at=now(),resolved_by=p_actor_id,resolution_note=btrim(p_resolution_note) where id=p_alert_id returning * into v_alert;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data) values(p_actor_id,'security_alert.resolved','platform_security_alert',p_alert_id,
  jsonb_build_object('severity',v_alert.severity,'event_key',v_alert.event_key,'resolution_note',v_alert.resolution_note));
 return to_jsonb(v_alert);
end $$;
revoke all on function public.resolve_platform_security_alert(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_platform_security_alert(uuid,uuid,text) to service_role;
comment on function public.resolve_platform_security_alert(uuid,uuid,text) is 'Atomic audited super-admin resolution of high-risk platform security alerts.';
