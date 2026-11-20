-- Atomic, database-serialized release lifecycle transitions.
create or replace function public.transition_platform_release(
  p_release_key text,p_expected_state text,p_transition text,p_actor_id uuid,p_reason text,p_traffic_percentage integer default null
)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_rollout public.platform_release_rollouts%rowtype;v_samples integer;v_latency_samples integer;v_error_rate numeric;v_p95 numeric;v_action text;
begin
 if p_actor_id is null or not exists(select 1 from public.user_roles where user_id=p_actor_id and role='super_admin') then
  raise exception 'super_admin_required' using errcode='42501';
 end if;
 if p_release_key is null or p_release_key !~ '^[a-z][a-z0-9_.-]{1,100}$' or p_reason is null or length(btrim(p_reason))<3 then
  raise exception 'invalid_release_transition_request' using errcode='22023';
 end if;
 select * into v_rollout from public.platform_release_rollouts where release_key=p_release_key for update;
 if not found then raise exception 'release_not_found' using errcode='P0002'; end if;
 if v_rollout.state is distinct from p_expected_state then raise exception 'release_state_conflict' using errcode='40001'; end if;
 if p_transition='validate' then
  if v_rollout.state<>'draft' or coalesce(v_rollout.config->>'artifact_digest','') !~ '^sha256:[a-f0-9]{64}$'
   or coalesce(v_rollout.config->>'health_check_url','') !~ '^https://[^/@[:space:]]+([/:?#]|$)' then raise exception 'release_artifact_or_health_endpoint_invalid' using errcode='22023'; end if;
  update public.platform_release_rollouts set state='validated',traffic_percentage=0,updated_at=now() where id=v_rollout.id returning * into v_rollout;
  v_action:='validated';
 elsif p_transition='start_canary' then
  if v_rollout.state<>'validated' or p_traffic_percentage is null or p_traffic_percentage not between 1 and 99 then raise exception 'invalid_canary_start' using errcode='22023'; end if;
  update public.platform_release_rollouts set state='canary',traffic_percentage=p_traffic_percentage,updated_at=now() where id=v_rollout.id returning * into v_rollout;
  v_action:='canary_started';
 elsif p_transition='set_traffic' then
  if v_rollout.state<>'canary' or p_traffic_percentage is null or p_traffic_percentage not between 1 and 99 then raise exception 'invalid_canary_traffic' using errcode='22023'; end if;
  update public.platform_release_rollouts set traffic_percentage=p_traffic_percentage,updated_at=now() where id=v_rollout.id returning * into v_rollout;
  v_action:='traffic_changed';
 elsif p_transition='approve' then
  if v_rollout.state<>'canary' then raise exception 'release_not_in_canary' using errcode='55000'; end if;
  select count(*),count(latency_ms),coalesce(count(*) filter(where not success)::numeric/nullif(count(*),0),1),
    percentile_cont(0.95) within group(order by latency_ms)
  into v_samples,v_latency_samples,v_error_rate,v_p95
  from public.platform_release_observations where release_key=p_release_key
   and observed_at>=now()-make_interval(secs=>v_rollout.health_window_seconds);
  if v_samples<v_rollout.minimum_samples or v_latency_samples<v_rollout.minimum_samples then
   raise exception 'canary_insufficient_verified_samples' using errcode='55000',
    detail=format('required=%s observed=%s latency_samples=%s',v_rollout.minimum_samples,v_samples,v_latency_samples);
  end if;
  if v_error_rate>v_rollout.error_rate_threshold or v_p95>v_rollout.latency_p95_threshold_ms then
   raise exception 'canary_health_thresholds_failed' using errcode='55000',detail=format('samples=%s error_rate=%s p95_ms=%s',v_samples,v_error_rate,v_p95);
  end if;
  update public.platform_release_rollouts set state='approved',traffic_percentage=100,approved_by=p_actor_id,approved_at=now(),updated_at=now()
   where id=v_rollout.id returning * into v_rollout;
  v_action:='approved';
 elsif p_transition='pause' then
  if v_rollout.state not in ('validated','canary') then raise exception 'release_cannot_be_paused' using errcode='55000'; end if;
  update public.platform_release_rollouts set state='paused',traffic_percentage=0,updated_at=now() where id=v_rollout.id returning * into v_rollout;
  v_action:='paused';
 elsif p_transition='rollback' then
  if v_rollout.state not in ('validated','canary','paused') then raise exception 'release_cannot_be_rolled_back' using errcode='55000'; end if;
  update public.platform_release_rollouts set state='rolled_back',traffic_percentage=0,rolled_back_by=p_actor_id,rolled_back_at=now(),updated_at=now()
   where id=v_rollout.id returning * into v_rollout;
  v_action:='rolled_back';
 else raise exception 'unsupported_release_transition' using errcode='22023';
 end if;
 insert into public.platform_release_audit(rollout_id,actor_id,action,details)
 values(v_rollout.id,p_actor_id,v_action,jsonb_build_object('reason',btrim(p_reason),'previous_state',p_expected_state,
  'new_state',v_rollout.state,'traffic_percentage',v_rollout.traffic_percentage,
  'health_samples',case when p_transition='approve' then v_samples else null end,
  'error_rate',case when p_transition='approve' then v_error_rate else null end,
  'p95_latency_ms',case when p_transition='approve' then v_p95 else null end));
 insert into public.audit_logs(user_id,action,entity_type,entity_id,old_data,new_data)
 values(p_actor_id,'release.'||v_action,'platform_release',v_rollout.id,jsonb_build_object('state',p_expected_state),
  jsonb_build_object('state',v_rollout.state,'traffic_percentage',v_rollout.traffic_percentage,'reason',btrim(p_reason)));
 return to_jsonb(v_rollout);
end;
$$;
revoke all on function public.transition_platform_release(text,text,text,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.transition_platform_release(text,text,text,uuid,text,integer) to service_role;
comment on function public.transition_platform_release(text,text,text,uuid,text,integer) is
'Atomic God Mode release lifecycle transition. Locks the rollout row, verifies a super-admin actor and expected state, and enforces server-measured canary sample/error/p95 thresholds before approval.';
