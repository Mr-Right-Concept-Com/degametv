-- Permit both the canonical DeGameTV subdomain and one custom hostname per production.
-- Hostname remains globally unique; content/domain-kind pairs remain unique.
begin;
alter table public.release_domains drop constraint if exists release_domains_content_id_key;
create unique index if not exists release_domains_content_kind_unique
  on public.release_domains(content_id,domain_kind);
comment on index public.release_domains_content_kind_unique is
  'One canonical platform subdomain and one custom hostname per production; each hostname is globally unique.';
commit;
