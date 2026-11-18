-- Identity verification and configurable creator activation policy.
-- Never persist raw biometric templates or bank account numbers in application tables.
create table if not exists public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country_code char(2) not null,
  document_type text not null,
  document_object_path text not null,
  selfie_video_object_path text not null,
  liveness_provider text,
  liveness_reference text,
  identity_provider text,
  identity_reference text,
  legal_name text not null,
  date_of_birth date,
  address_line text,
  address_city text,
  address_region text,
  address_postal_code text,
  status text not null default 'pending' check(status in ('pending','processing','verified','rejected','needs_review')),
  verification_mode text not null default 'manual' check(verification_mode in ('manual','automatic','hybrid')),
  provider_result jsonb not null default '{}'::jsonb,
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_document_path_owner check(document_object_path like user_id::text||'/%'),
  constraint identity_selfie_path_owner check(selfie_video_object_path like user_id::text||'/%')
);
create index if not exists identity_verifications_user_status_idx on public.identity_verifications(user_id,status,submitted_at desc);
create index if not exists identity_verifications_status_idx on public.identity_verifications(status,submitted_at);

create table if not exists public.business_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  identity_verification_id uuid references public.identity_verifications(id),
  legal_business_name text not null,
  registration_country char(2) not null,
  registration_number text not null,
  registration_document_path text not null,
  business_address text not null,
  business_city text not null,
  business_region text,
  business_postal_code text,
  tax_identifier_ref uuid,
  bank_account_secret_ref uuid,
  bank_account_name text,
  bank_name text,
  bank_country char(2),
  verification_provider text,
  verification_reference text,
  status text not null default 'pending' check(status in ('pending','processing','verified','rejected','needs_review')),
  verification_mode text not null default 'manual' check(verification_mode in ('manual','automatic','hybrid')),
  provider_result jsonb not null default '{}'::jsonb,
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_document_path_owner check(registration_document_path like user_id::text||'/%')
);
create index if not exists business_verifications_user_status_idx on public.business_verifications(user_id,status,submitted_at desc);

alter table public.identity_verifications enable row level security;
alter table public.business_verifications enable row level security;
revoke all on public.identity_verifications,public.business_verifications from anon,authenticated;
grant select,insert on public.identity_verifications to authenticated;
grant select,insert on public.business_verifications to authenticated;
create policy identity_verifications_owner_select on public.identity_verifications
 for select to authenticated using(user_id=(select auth.uid()));
create policy identity_verifications_owner_insert on public.identity_verifications
 for insert to authenticated with check(user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null);
create policy business_verifications_owner_select on public.business_verifications
 for select to authenticated using(user_id=(select auth.uid()));
create policy business_verifications_owner_insert on public.business_verifications
 for insert to authenticated with check(user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null);

insert into public.platform_settings(setting_key,setting_value,description,is_public)
values
 ('creator_approval_mode','"manual"'::jsonb,'Creator activation policy: manual, automatic, or hybrid based on verified identity and business checks',false),
 ('kyc_verification_mode','"manual"'::jsonb,'Identity verification policy: manual, automatic, or hybrid',false),
 ('kyb_verification_mode','"manual"'::jsonb,'Business verification policy: manual, automatic, or hybrid',false)
on conflict(setting_key) do nothing;

update storage.buckets
set allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm','video/quicktime'],
    file_size_limit=104857600
where id='identity-documents';

drop policy if exists identity_documents_owner_insert on storage.objects;
create policy identity_documents_owner_insert on storage.objects
 for insert to authenticated
 with check(bucket_id='identity-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists identity_documents_owner_select on storage.objects;
create policy identity_documents_owner_select on storage.objects
 for select to authenticated
 using(bucket_id='identity-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists identity_documents_owner_update on storage.objects;
create policy identity_documents_owner_update on storage.objects
 for update to authenticated
 using(bucket_id='identity-documents' and (storage.foldername(name))[1]=(select auth.uid())::text)
 with check(bucket_id='identity-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);

