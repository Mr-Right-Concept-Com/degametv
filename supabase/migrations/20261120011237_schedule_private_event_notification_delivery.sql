begin;

insert into public.platform_settings(setting_key,setting_value,description,is_public)
values('supabase_project_url',to_jsonb('https://dxijsbbdtwtbwdaajiyn.supabase.co'::text),'Internal Supabase project URL used by database-managed worker dispatch.',false)
on conflict(setting_key) do nothing;

do $$
begin
 if not exists(select 1 from vault.decrypted_secrets where name='degame-event-notification-worker-token') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'degame-event-notification-worker-token','Internal authorization token for the DeGameTV event notification worker.',null);
 end if;
end $$;

create or replace function public.get_event_notification_worker_secret()
returns text
language sql
stable
security definer
set search_path=public,vault,pg_temp
as $$
 select decrypted_secret from vault.decrypted_secrets where name='degame-event-notification-worker-token' limit 1;
$$;
revoke all on function public.get_event_notification_worker_secret() from public,anon,authenticated;
grant execute on function public.get_event_notification_worker_secret() to service_role;

do $$
begin
 if exists(select 1 from pg_namespace where nspname='cron') and exists(select 1 from pg_namespace where nspname='net') then
  perform cron.unschedule(jobid) from cron.job where jobname='degame-event-notification-dispatch';
  perform cron.schedule(
   'degame-event-notification-dispatch',
   '*/5 * * * *',
   $job$
    select net.http_post(
     url := (select (setting_value #>> '{}') || '/functions/v1/dispatch-event-notifications' from public.platform_settings where setting_key='supabase_project_url'),
     headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-internal-worker-token',(select decrypted_secret from vault.decrypted_secrets where name='degame-event-notification-worker-token')
     ),
     body := '{"limit":100}'::jsonb
    );
   $job$
  );
 end if;
end $$;

commit;