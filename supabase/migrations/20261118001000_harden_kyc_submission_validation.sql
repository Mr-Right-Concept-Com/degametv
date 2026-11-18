-- Close NULL-validation and oversized-path edge cases in the atomic KYC submission boundary.
CREATE OR REPLACE FUNCTION public.submit_kyc_application(
  p_full_name text,
  p_id_type text,
  p_id_path text,
  p_selfie_path text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_status text;
  v_id_mime text;
  v_selfie_mime text;
  v_id_size bigint;
  v_selfie_size bigint;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_full_name IS NULL OR length(btrim(p_full_name)) < 3 OR length(btrim(p_full_name)) > 120
     OR p_id_type IS NULL OR p_id_type NOT IN ('nin', 'passport', 'drivers_license', 'voters_card') THEN
    RAISE EXCEPTION 'invalid_application';
  END IF;
  IF p_id_path IS NULL OR p_selfie_path IS NULL
     OR length(p_id_path) > 512 OR length(p_selfie_path) > 512
     OR p_id_path = p_selfie_path
     OR p_id_path NOT LIKE v_user_id::text || '/kyc/%'
     OR p_selfie_path NOT LIKE v_user_id::text || '/kyc/%'
     OR position('..' in p_id_path) > 0 OR position('..' in p_selfie_path) > 0
     OR position(chr(92) in p_id_path) > 0 OR position(chr(92) in p_selfie_path) > 0 THEN
    RAISE EXCEPTION 'invalid_evidence_path';
  END IF;

  SELECT metadata->>'mimetype',
         CASE WHEN metadata->>'size' ~ '^[0-9]+$' THEN (metadata->>'size')::bigint ELSE 0 END
    INTO v_id_mime, v_id_size
    FROM storage.objects
   WHERE bucket_id = 'identity-documents' AND name = p_id_path AND owner = v_user_id
     AND archived_at IS NULL AND coalesce(is_delete_marker, false) = false;
  IF NOT FOUND OR v_id_mime IS NULL OR v_id_mime NOT IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
     OR v_id_size <= 0 OR v_id_size > 10485760 THEN RAISE EXCEPTION 'invalid_identity_document'; END IF;

  SELECT metadata->>'mimetype',
         CASE WHEN metadata->>'size' ~ '^[0-9]+$' THEN (metadata->>'size')::bigint ELSE 0 END
    INTO v_selfie_mime, v_selfie_size
    FROM storage.objects
   WHERE bucket_id = 'identity-documents' AND name = p_selfie_path AND owner = v_user_id
     AND archived_at IS NULL AND coalesce(is_delete_marker, false) = false;
  IF NOT FOUND OR v_selfie_mime IS NULL OR v_selfie_mime NOT IN ('image/jpeg', 'image/png', 'image/webp')
     OR v_selfie_size <= 0 OR v_selfie_size > 10485760 THEN RAISE EXCEPTION 'invalid_selfie'; END IF;

  SELECT id, kyc_status INTO v_profile_id, v_status
    FROM public.profiles WHERE user_id = v_user_id FOR UPDATE;
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  IF v_status = 'verified' THEN RAISE EXCEPTION 'already_verified'; END IF;
  IF v_status = 'pending' THEN RAISE EXCEPTION 'already_pending'; END IF;

  UPDATE public.profiles SET kyc_full_name = btrim(p_full_name), kyc_id_type = p_id_type,
    kyc_id_url = p_id_path, kyc_selfie_url = p_selfie_path, kyc_status = 'pending',
    kyc_submitted_at = now(), updated_at = now() WHERE id = v_profile_id;
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, new_data)
  VALUES (v_user_id, 'kyc_submitted', 'profile', v_profile_id,
          jsonb_build_object('status', 'pending', 'id_type', p_id_type));
  RETURN jsonb_build_object('success', true, 'status', 'pending');
END;
$$;
REVOKE ALL ON FUNCTION public.submit_kyc_application(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_kyc_application(text, text, text, text) TO authenticated;
