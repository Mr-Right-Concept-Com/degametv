CREATE OR REPLACE FUNCTION public.review_kyc_application(
  p_user_id uuid,
  p_decision text,
  p_reason text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_status text;
  v_id_path text;
  v_selfie_path text;
  v_now timestamptz := now();
  v_role_granted boolean := false;
  v_identity_id uuid;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication_required' USING errcode = '28000'; END IF;
  IF v_actor = p_user_id THEN RAISE EXCEPTION 'identity_self_review_forbidden' USING errcode = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role::text IN ('super_admin','platform_admin')) THEN
    RAISE EXCEPTION 'identity_review_forbidden' USING errcode = '42501';
  END IF;
  IF p_decision NOT IN ('verified','rejected') THEN RAISE EXCEPTION 'invalid_identity_decision' USING errcode = '22023'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason))<10 OR length(trim(p_reason))>1000 THEN
    RAISE EXCEPTION 'identity_review_reason_required' USING errcode = '22023';
  END IF;

  SELECT kyc_status,kyc_id_url,kyc_selfie_url INTO v_status,v_id_path,v_selfie_path
  FROM public.profiles WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'identity_applicant_not_found' USING errcode = 'P0002'; END IF;
  IF v_status<>'pending' THEN RAISE EXCEPTION 'identity_application_not_pending' USING errcode = '55000'; END IF;
  IF v_id_path IS NULL OR v_selfie_path IS NULL THEN RAISE EXCEPTION 'identity_evidence_missing' USING errcode = '23514'; END IF;

  UPDATE public.profiles SET kyc_status=p_decision,
    kyc_verified_at=CASE WHEN p_decision='verified' THEN v_now ELSE NULL END, updated_at=v_now
  WHERE user_id=p_user_id AND kyc_status='pending';

  UPDATE public.identity_verifications
  SET status=p_decision,
      rejection_reason=CASE WHEN p_decision='rejected' THEN trim(p_reason) ELSE NULL END,
      reviewed_by=v_actor,
      reviewed_at=v_now,
      provider_result=coalesce(provider_result,'{}'::jsonb) || jsonb_build_object(
        'review_source','admin_manual_review','review_reason',trim(p_reason),
        'reviewed_by',v_actor,'reviewed_at',v_now
      ),
      updated_at=v_now
  WHERE id=(
    SELECT id FROM public.identity_verifications
    WHERE user_id=p_user_id AND status IN ('pending','processing')
    ORDER BY submitted_at DESC LIMIT 1
    FOR UPDATE
  )
  RETURNING id INTO v_identity_id;

  IF p_decision='verified' AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id=p_user_id AND role='creator'::public.app_role AND tenant_id IS NULL
  ) THEN
    INSERT INTO public.user_roles(user_id,role,tenant_id) VALUES(p_user_id,'creator'::public.app_role,NULL);
    v_role_granted:=true;
  END IF;

  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,old_data,new_data,ip_address,user_agent)
  VALUES(v_actor,CASE WHEN p_decision='verified' THEN 'identity.application.approved' ELSE 'identity.application.rejected' END,
    'profile',p_user_id,jsonb_build_object('kyc_status',v_status),
    jsonb_build_object('kyc_status',p_decision,'identity_verification_id',v_identity_id,
      'reason',trim(p_reason),'reviewed_by',v_actor,'reviewed_at',v_now,'creator_role_granted',v_role_granted),
    p_ip_address,p_user_agent);
  RETURN jsonb_build_object('success',true,'status',p_decision,'creator_role_granted',v_role_granted,
    'identity_verification_id',v_identity_id,'reviewed_at',v_now);
END
$function$;

REVOKE ALL ON FUNCTION public.review_kyc_application(uuid,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_kyc_application(uuid,text,text,text,text) TO authenticated;
