drop policy if exists "platform admins can review studio accounts" on public.studio_accounts;
create policy "platform admins can review studio accounts"
on public.studio_accounts for select to authenticated
using (public.has_role(auth.uid(),'super_admin'::public.app_role) or public.has_role(auth.uid(),'platform_admin'::public.app_role));