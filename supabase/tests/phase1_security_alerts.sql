-- Run with: supabase test db --linked
begin;
do $$
declare v_actor uuid;v_audit uuid;v_alert uuid;v_result jsonb;
begin
 select user_id into v_actor from public.user_roles where role='super_admin' limit 1;
 if v_actor is null then raise exception 'verified_super_admin_missing';end if;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
 values(v_actor,'godmode.role_set','user_role',v_actor,jsonb_build_object('role','platform_admin','grant',true))
 returning id into v_audit;
 select id into v_alert from public.platform_security_alerts where source_audit_id=v_audit;
 if v_alert is null then raise exception 'high_risk_audit_did_not_create_alert';end if;
 v_result:=public.resolve_platform_security_alert(v_alert,v_actor,'Test alert resolved after review');
 if v_result->>'resolved_at' is null then raise exception 'security_alert_resolution_not_persisted';end if;
 if not exists(select 1 from public.audit_logs where entity_type='platform_security_alert' and entity_id=v_alert and action='security_alert.resolved') then
  raise exception 'security_alert_resolution_audit_missing';
 end if;
 insert into public.platform_release_rollouts(release_key,release_version,state,traffic_percentage,config,health_window_seconds,minimum_samples,error_rate_threshold,latency_p95_threshold_ms)
 values('phase1.alert.'||txid_current()::text,'test','canary',5,'{"artifact_digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","health_check_url":"https://example.org/healthz"}',300,3,0.02,3000);
 insert into public.platform_release_observations(rollout_id,release_key,subject_bucket,success,latency_ms,error_code)
 select r.id,r.release_key,gen_random_uuid(),false,8000,'health_check_failed'
 from public.platform_release_rollouts r where r.release_key='phase1.alert.'||txid_current()::text
 cross join generate_series(1,3);
 if not exists(select 1 from public.platform_security_alerts a join public.platform_release_rollouts r on r.id=a.entity_id
   where a.event_key='release.canary_health_anomaly' and r.release_key='phase1.alert.'||txid_current()::text) then
  raise exception 'canary_health_anomaly_alert_missing';
 end if;
end $$;
rollback;
