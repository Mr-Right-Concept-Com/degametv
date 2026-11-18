create or replace function public.submit_identity_verification(
  p_country_code text,p_document_type text,p_full_name text,p_document_path text,p_selfie_video_path text,
  p_date_of_birth date default null,p_address_line text default null,p_address_city text default null,
  p_address_region text default null,p_address_postal_code text default null
) returns jsonb language plpgsql security definer
set search_path to 'public','storage','pg_temp' as $$
declare v_user uuid:=auth.uid(); v_mode text:='manual'; v_doc_mime text; v_doc_size bigint;
v_video_mime text; v_video_size bigint; v_id uuid;
begin
 if v_user is null then raise exception 'authentication_required' using errcode='28000'; end if;
 if p_country_code !~ '^[A-Z]{2}$' or length(trim(p_full_name)) not between 3 and 120 then raise exception 'invalid_identity_details' using errcode='22023'; end if;
 if p_document_type not in ('national_id','nin','passport','drivers_license','voters_card','residence_permit') then raise exception 'unsupported_document_type' using errcode='22023'; end if;
 if p_document_path not like v_user::text||'/kyc/%' or p_selfie_video_path not like v_user::text||'/kyc/%'
 or p_document_path=p_selfie_video_path or position('..' in p_document_path)>0 or position('..' in p_selfie_video_path)>0 then raise exception 'invalid_evidence_path' using errcode='22023'; end if;
 select metadata->>'mimetype',case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 0 end into v_doc_mime,v_doc_size
 from storage.objects where bucket_id='identity-documents' and name=p_document_path and owner=v_user and archived_at is null and coalesce(is_delete_marker,false)=false;
 if not found or v_doc_mime not in ('image/jpeg','image/png','image/webp','application/pdf') or v_doc_size<1 or v_doc_size>10485760 then raise exception 'invalid_identity_document'; end if;
 select metadata->>'mimetype',case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 0 end into v_video_mime,v_video_size
 from storage.objects where bucket_id='identity-documents' and name=p_selfie_video_path and owner=v_user and archived_at is null and coalesce(is_delete_marker,false)=false;
 if not found or v_video_mime not in ('video/mp4','video/webm','video/quicktime') or v_video_size<1 or v_video_size>104857600 then raise exception 'invalid_liveness_video'; end if;
 select coalesce(setting_value #>> '{}','manual') into v_mode from public.platform_settings where setting_key='kyc_verification_mode';
 v_mode:=coalesce(v_mode,'manual'); if v_mode not in ('manual','automatic','hybrid') then v_mode:='manual'; end if;
 if exists(select 1 from public.identity_verifications where user_id=v_user and status in ('pending','processing','verified')) then raise exception 'verification_already_active' using errcode='23505'; end if;
 insert into public.identity_verifications(user_id,country_code,document_type,document_object_path,selfie_video_object_path,legal_name,date_of_birth,address_line,address_city,address_region,address_postal_code,status,verification_mode,provider_result)
 values(v_user,p_country_code,p_document_type,p_document_path,p_selfie_video_path,trim(p_full_name),p_date_of_birth,nullif(trim(p_address_line),''),nullif(trim(p_address_city),''),nullif(trim(p_address_region),''),nullif(trim(p_address_postal_code),''),'pending',v_mode,jsonb_build_object('provider_state','not_configured','requires_review',true)) returning id into v_id;
 update public.profiles set kyc_full_name=trim(p_full_name),kyc_id_type=p_document_type,kyc_id_url=p_document_path,kyc_selfie_url=p_selfie_video_path,kyc_status='pending',kyc_submitted_at=now(),updated_at=now() where user_id=v_user;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data) values(v_user,'identity.verification.submitted','identity_verification',v_id,jsonb_build_object('country_code',p_country_code,'document_type',p_document_type,'mode',v_mode));
 return jsonb_build_object('success',true,'verification_id',v_id,'status','pending','mode',v_mode);
end $$;
revoke all on function public.submit_identity_verification(text,text,text,text,text,date,text,text,text,text) from public,anon;
grant execute on function public.submit_identity_verification(text,text,text,text,text,date,text,text,text,text) to authenticated;