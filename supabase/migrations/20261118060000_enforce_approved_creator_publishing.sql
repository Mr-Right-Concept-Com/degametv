-- Restrict creator publishing and media writes to fully approved studio accounts.
-- KYC verification alone does not grant publishing privileges.
create or replace function public.is_approved_creator(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and p_user_id = auth.uid()
    and exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'creator'::public.app_role
    )
    and exists (
      select 1 from public.studio_accounts s
      where s.user_id = auth.uid() and s.status = 'approved'
    );
$$;

revoke all on function public.is_approved_creator(uuid) from public, anon;
grant execute on function public.is_approved_creator(uuid) to authenticated, service_role;

drop policy if exists "Creators can insert their content" on public.content;
drop policy if exists "Creators can manage their content" on public.content;

create policy "Approved creators can insert their content"
on public.content for insert to authenticated
with check (creator_id = auth.uid() and public.is_approved_creator(auth.uid()));

create policy "Approved creators can update their content"
on public.content for update to authenticated
using (creator_id = auth.uid() and public.is_approved_creator(auth.uid()))
with check (creator_id = auth.uid() and public.is_approved_creator(auth.uid()));

create policy "Approved creators can delete their content"
on public.content for delete to authenticated
using (creator_id = auth.uid() and public.is_approved_creator(auth.uid()));

drop policy if exists "Creator uploads own master media" on storage.objects;
create policy "Approved creators upload own master media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'creator-masters'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_approved_creator(auth.uid())
);

drop policy if exists "Creator updates own master media" on storage.objects;
create policy "Approved creators update own master media"
on storage.objects for update to authenticated
using (
  bucket_id = 'creator-masters'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_approved_creator(auth.uid())
)
with check (
  bucket_id = 'creator-masters'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_approved_creator(auth.uid())
);

drop policy if exists "Creator deletes own master media" on storage.objects;
create policy "Approved creators delete own master media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'creator-masters'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_approved_creator(auth.uid())
);

drop policy if exists "Authenticated users can upload content" on storage.objects;
create policy "Approved creators upload public assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'content-uploads'
  and public.is_approved_creator(auth.uid())
);

drop policy if exists "Creators can delete their uploads" on storage.objects;
create policy "Approved creators delete their public assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'content-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_approved_creator(auth.uid())
);
