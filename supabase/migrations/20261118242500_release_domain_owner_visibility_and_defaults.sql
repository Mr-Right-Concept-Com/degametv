-- Owner visibility for pending custom-domain verification and canonical Spixie domain defaults.
drop policy if exists "Creators can view own release domains" on public.release_domains;
create policy "Creators can view own release domains" on public.release_domains for select to authenticated using (exists(select 1 from public.content c where c.id=content_id and c.creator_id=auth.uid()));
insert into public.platform_settings(setting_key,setting_value,is_public,description) values ('domain_settings','{"controlDomain":"spixie.co","releaseDomain":"spixie.net"}'::jsonb,true,'Canonical control and release domain routing') on conflict(setting_key) do nothing;
