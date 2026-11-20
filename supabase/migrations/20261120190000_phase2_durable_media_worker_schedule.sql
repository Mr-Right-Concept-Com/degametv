insert into public.platform_settings(setting_key,setting_value,description,is_public)
values('media_ingest_worker_endpoint',jsonb_build_object('url','https://dxijsbbdtwtbwdaajiyn.supabase.co/functions/v1/media-ingest-worker'),'Internal media worker endpoint used by the durable pg_cron dispatcher.',false)
on conflict(setting_key) do update set setting_value=excluded.setting_value,description=excluded.description,is_public=false,updated_at=now();

do $block$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='degame-media-worker-token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'degame-media-worker-token','Private authentication token for the DeGameTV media worker and transcoder callback',null);
  end if;
end
$block$;

create or replace function public.get_media_worker_secret()
returns text
language sql
security definer
set search_path=public,vault,pg_temp
as $function$
  select decrypted_secret from vault.decrypted_secrets where name='degame-media-worker-token' limit 1
$function$;
revoke all on function public.get_media_worker_secret() from public,anon,authenticated;
grant execute on function public.get_media_worker_secret() to service_role;

do $block$
declare v_job_id bigint;
begin
  for v_job_id in select jobid from cron.job where jobname='degame-media-ingest-worker'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
  perform cron.schedule(
    'degame-media-ingest-worker',
    '* * * * *',
    $command$
      select net.http_post(
        url := (select setting_value->>'url' from public.platform_settings where setting_key='media_ingest_worker_endpoint'),
        body := jsonb_build_object('limit',1),
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'x-worker-secret',(select decrypted_secret from vault.decrypted_secrets where name='degame-media-worker-token' limit 1)
        ),
        timeout_milliseconds := 55000
      );
    $command$
  );
end
$block$;