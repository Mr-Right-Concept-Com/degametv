-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase1_release_canary.sql
begin;
do $$
declare v_actor uuid;v_key text:='phase1.release.test.'||txid_current()::text;v_rollout jsonb;
begin
 select user_id into v_actor from public.user_roles where role='super_admin' limit 1;
 if v_actor is null then raise exception 'verified_super_admin_missing'; end if;
 insert into public.platform_release_rollouts(release_key,release_version,state,traffic_percentage,config,minimum_samples,health_window_seconds,error_rate_threshold,latency_p95_threshold_ms,created_by)
 values(v_key,'test','draft',0,'{"artifact_digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","health_check_url":"https://example.org/healthz"}',20,300,0.02,3000,v_actor);
 v_rollout:=public.transition_platform_release(v_key,'draft','validate',v_actor,'integration test');
 if v_rollout->>'state'<>'validated' then raise exception 'release_validate_failed'; end if;
 v_rollout:=public.transition_platform_release(v_key,'validated','start_canary',v_actor,'integration test',5);
 if v_rollout->>'state'<>'canary' or (v_rollout->>'traffic_percentage')::int<>5 then raise exception 'release_canary_failed'; end if;
 insert into public.platform_release_observations(rollout_id,release_key,subject_bucket,success,latency_ms)
 select (v_rollout->>'id')::uuid,v_key,generate_series,true,100 from generate_series(1,20);
 v_rollout:=public.transition_platform_release(v_key,'canary','approve',v_actor,'integration test');
 if v_rollout->>'state'<>'approved' or (v_rollout->>'traffic_percentage')::int<>100 then raise exception 'release_approval_failed'; end if;
 begin
  perform public.transition_platform_release(v_key,'canary','rollback',v_actor,'stale state test');
  raise exception 'stale_state_transition_was_not_rejected';
 exception when sqlstate '40001' then null;
 end;
end $$;
rollback;
