do $block$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='degame-media-transcoder-callback-token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'degame-media-transcoder-callback-token','Private callback authentication token for the configured DeGameTV transcoder provider',null);
  end if;
end
$block$;
create or replace function public.get_media_transcoder_callback_secret()
returns text
language sql
security definer
set search_path=public,vault,pg_temp
as $function$
  select decrypted_secret from vault.decrypted_secrets where name='degame-media-transcoder-callback-token' limit 1
$function$;
revoke all on function public.get_media_transcoder_callback_secret() from public,anon,authenticated;
grant execute on function public.get_media_transcoder_callback_secret() to service_role;