create or replace function public.enforce_business_identity_name_match()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_legal_name text;
begin
 if new.identity_verification_id is not null then
  select legal_name into v_legal_name from public.identity_verifications where id=new.identity_verification_id and user_id=new.user_id and status='verified';
 end if;
 if v_legal_name is null then select kyc_full_name into v_legal_name from public.profiles where user_id=new.user_id and kyc_status='verified'; end if;
 if v_legal_name is null then raise exception 'verified_identity_required' using errcode='42501'; end if;
 if lower(regexp_replace(trim(new.bank_account_name),'\s+',' ','g')) <> lower(regexp_replace(trim(v_legal_name),'\s+',' ','g')) then
  raise exception 'bank_account_name_must_match_verified_identity' using errcode='22023'; end if;
 return new;
end $$;
create or replace function public.submit_business_verification(
 p_legal_business_name text,p_registration_country text,p_registration_number text,p_registration_document_path text,
 p_business_address text,p_business_city text,p_business_region text,p_business_postal_code text,
 p_bank_name text,p_bank_account_number text,p_bank_account_name text,p_bank_country text,p_tax_identifier text
) returns jsonb language plpgsql security definer
set search_path to 'public','auth','storage','vault','pg_temp' as $$
declare v_user uuid:=auth.uid(); v_identity uuid; v_legal_name text; v_mode text:='manual'; v_secret uuid; v_tax uuid; v_id uuid;
begin
 if v_user is null then raise exception 'authentication_required' using errcode='28000'; end if;
 if length(trim(p_legal_business_name)) not between 2 and 180 or p_registration_country !~ '^[A-Z]{2}$'
 or length(trim(p_registration_number)) not between 3 and 80 or length(trim(p_business_address)) not between 5 and 240
 or length(trim(p_business_city)) not between 2 and 120 or length(trim(p_bank_name)) not between 2 and 100
 or length(trim(p_bank_account_name)) not between 2 and 150 or p_bank_country !~ '^[A-Z]{2}$'
 or p_bank_account_number !~ '^[0-9]{6,34}$' or length(trim(p_tax_identifier)) not between 4 and 40 then raise exception 'invalid_business_details' using errcode='22023'; end if;
 select id,legal_name into v_identity,v_legal_name from public.identity_verifications where user_id=v_user and status='verified' order by submitted_at desc limit 1;
 if v_legal_name is null then select kyc_full_name into v_legal_name from public.profiles where user_id=v_user and kyc_status='verified'; end if;
 if v_legal_name is null then raise exception 'verified_identity_required' using errcode='42501'; end if;
 if lower(regexp_replace(trim(p_bank_account_name),'\s+',' ','g')) <> lower(regexp_replace(trim(v_legal_name),'\s+',' ','g')) then raise exception 'bank_account_name_must_match_verified_identity' using errcode='22023'; end if;
 if p_registration_document_path not like v_user::text||'/%' or position('..' in p_registration_document_path)>0 then raise exception 'invalid_registration_document'; end if;
 if not exists(select 1 from storage.objects where bucket_id='kyb-docs' and name=p_registration_document_path and owner=v_user and archived_at is null and coalesce(is_delete_marker,false)=false) then raise exception 'registration_document_missing'; end if;
 select coalesce(setting_value #>> '{}','manual') into v_mode from public.platform_settings where setting_key='kyb_verification_mode';
 v_mode:=coalesce(v_mode,'manual'); if v_mode not in ('manual','automatic','hybrid') then v_mode:='manual'; end if;
 if exists(select 1 from public.business_verifications where user_id=v_user and status in ('pending','processing','verified')) then raise exception 'business_verification_already_active'; end if;
 v_secret:=vault.create_secret(p_bank_account_number,'degame-business-bank-'||v_user::text,'Business payout account number; owner='||v_user::text);
 v_tax:=vault.create_secret(p_tax_identifier,'degame-business-tax-'||v_user::text,'Business tax identifier; owner='||v_user::text);
 insert into public.business_verifications(user_id,identity_verification_id,legal_business_name,registration_country,registration_number,registration_document_path,business_address,business_city,business_region,business_postal_code,tax_identifier_ref,bank_account_secret_ref,bank_account_name,bank_name,bank_country,status,verification_mode,provider_result)
 values(v_user,v_identity,trim(p_legal_business_name),p_registration_country,trim(p_registration_number),p_registration_document_path,trim(p_business_address),trim(p_business_city),nullif(trim(p_business_region),''),nullif(trim(p_business_postal_code),''),v_tax,v_secret,trim(p_bank_account_name),trim(p_bank_name),p_bank_country,'pending',v_mode,jsonb_build_object('provider_state','not_configured','bank_name_match','unverified','requires_review',true)) returning id into v_id;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data) values(v_user,'business.verification.submitted','business_verification',v_id,jsonb_build_object('country',p_registration_country,'mode',v_mode));
 return jsonb_build_object('success',true,'verification_id',v_id,'status','pending','mode',v_mode);
end $$;
revoke all on function public.submit_business_verification(text,text,text,text,text,text,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.submit_business_verification(text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;