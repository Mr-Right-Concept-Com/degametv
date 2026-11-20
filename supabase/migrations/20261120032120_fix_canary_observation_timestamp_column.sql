create or replace function public.capture_canary_health_anomaly()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_rollout public.platform_release_rollouts%rowtype;v_total integer;v_failures integer;v_error_rate numeric;v_p95 numeric;v_window_start timestamptz;v_dedupe text;
begin
 select * into v_rollout from public.platform_release_rollouts where id=new.rollout_id;
 if not found or v_rollout.state not in ('canary','approved') then return new;end if;
 v_window_start:=now()-make_interval(secs=>v_rollout.health_window_seconds);
 select count(*)::integer,count(*) filter(where not success)::integer,coalesce(percentile_cont(0.95) within group(order by latency_ms),0)
 into v_total,v_failures,v_p95 from public.platform_release_observations where rollout_id=v_rollout.id and observed_at>=v_window_start;
 if v_total<v_rollout.minimum_samples then return new;end if;
 v_error_rate:=v_failures::numeric/nullif(v_total,0);
 if v_error_rate<=v_rollout.error_rate_threshold and v_p95<=v_rollout.latency_p95_threshold_ms then return new;end if;
 v_dedupe:='canary:'||v_rollout.id::text||':'||to_char(date_trunc('minute',now()),'YYYYMMDDHH24MI');
 insert into public.platform_security_alerts(dedupe_key,severity,event_key,entity_type,entity_id,summary,details)
 values(v_dedupe,case when v_error_rate>v_rollout.error_rate_threshold*2 or v_p95>v_rollout.latency_p95_threshold_ms*2 then 'critical' else 'high' end,
  'release.canary_health_anomaly','platform_release_rollout',v_rollout.id,'Canary health thresholds breached for release '||v_rollout.release_key,
  jsonb_build_object('release_key',v_rollout.release_key,'samples',v_total,'failures',v_failures,'error_rate',v_error_rate,'error_rate_threshold',v_rollout.error_rate_threshold,
   'p95_latency_ms',v_p95,'p95_latency_threshold_ms',v_rollout.latency_p95_threshold_ms,'health_window_seconds',v_rollout.health_window_seconds))
 on conflict(dedupe_key) do nothing;
 return new;
end $$;
revoke all on function public.capture_canary_health_anomaly() from public,anon,authenticated,service_role;
