update storage.buckets set allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp'],file_size_limit=10485760 where id='kyb-docs';
create or replace function public.enforce_business_identity_name_match()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_legal_name text;
begin
 select legal_name into v_legal_name from public.identity_verifications where id=new.identity_verification_id and user_id=new.user_id and status='verified';
 if v_legal_name is null then raise exception 'verified_identity_required' using errcode='42501'; end if;
 if lower(regexp_replace(trim(new.bank_account_name),'\s+',' ','g')) <> lower(regexp_replace(trim(v_legal_name),'\s+',' ','g')) then
 raise exception 'bank_account_name_must_match_verified_identity' using errcode='22023'; end if;
 return new;
end $$;
drop trigger if exists business_identity_name_match on public.business_verifications;
create trigger business_identity_name_match before insert or update of identity_verification_id,bank_account_name on public.business_verifications for each row execute function public.enforce_business_identity_name_match();