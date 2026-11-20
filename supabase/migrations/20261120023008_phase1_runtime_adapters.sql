-- Phase 1 runtime adapter expansion and canonical branding synchronization.
alter table public.service_provider_bindings drop constraint if exists service_provider_bindings_capability_check;
alter table public.service_provider_bindings add constraint service_provider_bindings_capability_check
check (capability = any (array[
  'payments','identity','bank_verification','video_delivery','email','live_streaming','fx_rates',
  'storage','cdn','drm','sms','push','geolocation','analytics','ai_text','ai_moderation','ai_embeddings'
]::text[]));

create table if not exists public.platform_release_observations (
  id uuid primary key default gen_random_uuid(),
  rollout_id uuid references public.platform_release_rollouts(id) on delete set null,
  release_key text not null,
  subject_bucket integer check (subject_bucket between 0 and 9999),
  success boolean not null,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error_code text,
  observed_at timestamptz not null default now()
);
create index if not exists platform_release_observations_window_idx
on public.platform_release_observations(release_key,observed_at desc);
alter table public.platform_release_observations enable row level security;
alter table public.platform_release_observations force row level security;
revoke all on public.platform_release_observations from anon,authenticated;
grant all on public.platform_release_observations to service_role;
comment on table public.platform_release_observations is 'Service-originated canary telemetry. No client Data API access.';

create or replace function public.sync_platform_branding_registry()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.setting_key = 'branding' and jsonb_typeof(new.setting_value) = 'object' then
    insert into public.platform_branding_registry(brand_key,brand_config,is_public,version,updated_at)
    values ('platform.default',new.setting_value,coalesce(new.is_public,false),1,now())
    on conflict(brand_key) do update set
      brand_config=excluded.brand_config,
      is_public=excluded.is_public,
      version=public.platform_branding_registry.version+1,
      updated_at=now();
  end if;
  return new;
end;
$$;
revoke all on function public.sync_platform_branding_registry() from public,anon,authenticated;
drop trigger if exists platform_settings_sync_branding_registry on public.platform_settings;
create trigger platform_settings_sync_branding_registry
after insert or update of setting_value,is_public on public.platform_settings
for each row when (new.setting_key='branding')
execute function public.sync_platform_branding_registry();

-- Existing branding settings are canonical source during migration; registry is the runtime read model.
insert into public.platform_branding_registry(brand_key,brand_config,is_public)
select 'platform.default',setting_value,coalesce(is_public,false)
from public.platform_settings where setting_key='branding' and jsonb_typeof(setting_value)='object'
on conflict(brand_key) do update set
  brand_config=excluded.brand_config,
  is_public=excluded.is_public,
  version=public.platform_branding_registry.version+1,
  updated_at=now();
