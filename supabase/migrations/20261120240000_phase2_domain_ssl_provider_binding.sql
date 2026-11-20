-- Bind each production domain's SSL lifecycle to the exact provider that issued provisioning.
begin;
alter table public.release_domains
  add column if not exists ssl_provider_key text;
comment on column public.release_domains.ssl_provider_key is
  'Provider binding responsible for this domain certificate lifecycle; callback identity must match before state transitions.';
commit;
