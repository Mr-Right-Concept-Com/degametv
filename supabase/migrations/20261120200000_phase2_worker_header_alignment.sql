do $block$
declare v_job_id bigint;
begin
  for v_job_id in select jobid from cron.job where jobname='degame-media-ingest-worker'
  loop perform cron.unschedule(v_job_id); end loop;
  perform cron.schedule(
    'degame-media-ingest-worker',
    '* * * * *',
    $command$
      select net.http_post(
        url := (select setting_value->>'url' from public.platform_settings where setting_key='media_ingest_worker_endpoint'),
        body := jsonb_build_object('limit',1),
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'x-media-worker-secret',(select decrypted_secret from vault.decrypted_secrets where name='degame-media-worker-token' limit 1)
        ),
        timeout_milliseconds := 55000
      );
    $command$
  );
end
$block$;