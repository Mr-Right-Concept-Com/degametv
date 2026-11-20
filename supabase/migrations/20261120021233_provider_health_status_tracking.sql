alter table public.service_provider_bindings add column if not exists health_status text not null default 'unknown', add column if not exists health_checked_at timestamptz, add column if not exists health_error text;
alter table public.service_provider_bindings drop constraint if exists service_provider_bindings_health_status_check;
alter table public.service_provider_bindings add constraint service_provider_bindings_health_status_check check (health_status in ('unknown','healthy','unhealthy'));
