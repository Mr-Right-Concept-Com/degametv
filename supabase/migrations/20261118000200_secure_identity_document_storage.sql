-- Private identity evidence storage and least-privilege access.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('identity-documents', 'identity-documents', false, 10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']::text[])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Identity applicants upload own evidence" on storage.objects;
create policy "Identity applicants upload own evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'identity-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'kyc'
);

drop policy if exists "Identity applicants read own evidence" on storage.objects;
create policy "Identity applicants read own evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'identity-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_super_admin(auth.uid())
    or public.has_role(auth.uid(), 'platform_admin'::public.app_role)
  )
);

drop policy if exists "Identity applicants delete own unsubmitted evidence" on storage.objects;
create policy "Identity applicants delete own unsubmitted evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'identity-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Anonymous clients do not need any direct access to profile rows.
revoke all privileges on table public.profiles from anon;

-- Prevent a user-scoped update policy from accepting a changed ownership key.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
