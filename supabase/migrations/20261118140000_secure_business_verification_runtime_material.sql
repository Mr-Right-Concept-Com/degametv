create or replace function public.get_business_verification_material(p_verification_id uuid)
returns table(id uuid,user_id uuid,identity_verification_id uuid,legal_business_name text,registration_country text,registration_number text,registration_document_path text,business_address text,business_city text,bank_name text,bank_country text,bank_account_name text,bank_account_number text,tax_identifier text,verification_mode text,identity_legal_name text)
language sql security definer set search_path='public','vault','pg_temp'
as $$
 select b.id,b.user_id,b.identity_verification_id,b.legal_business_name,b.registration_country,b.registration_number,
 b.registration_document_path,b.business_address,b.business_city,b.bank_name,b.bank_country,b.bank_account_name,
 bank.decrypted_secret,tax.decrypted_secret,b.verification_mode,
 coalesce(i.legal_name,p.kyc_full_name)
 from public.business_verifications b
 left join vault.decrypted_secrets bank on bank.id=b.bank_account_secret_ref
 left join vault.decrypted_secrets tax on tax.id=b.tax_identifier_ref
 left join public.identity_verifications i on i.id=b.identity_verification_id and i.status='verified'
 left join public.profiles p on p.user_id=b.user_id and p.kyc_status='verified'
 where b.id=p_verification_id
$$;
revoke all on function public.get_business_verification_material(uuid) from public,anon,authenticated;
grant execute on function public.get_business_verification_material(uuid) to service_role;