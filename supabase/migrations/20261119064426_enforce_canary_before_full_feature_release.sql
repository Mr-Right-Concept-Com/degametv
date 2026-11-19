CREATE OR REPLACE FUNCTION public.admin_upsert_feature_control(
 p_feature_key text,p_enabled boolean,p_rollout_percentage integer,p_release_state text,p_config jsonb,p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_old jsonb;v_new jsonb;v_user uuid:=auth.uid();
BEGIN
 IF v_user IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_user AND role::text='super_admin') THEN
   RAISE EXCEPTION 'platform super administrator required' USING ERRCODE='42501';
 END IF;
 IF p_feature_key !~ '^[a-z][a-z0-9_.-]{1,119}$'
    OR p_rollout_percentage NOT BETWEEN 0 AND 100
    OR p_release_state NOT IN ('draft','canary','released','paused','rolled_back')
    OR length(trim(coalesce(p_reason,'')))<3 THEN
   RAISE EXCEPTION 'invalid feature release configuration' USING ERRCODE='22023';
 END IF;
 IF p_release_state='canary' AND (p_rollout_percentage<1 OR p_rollout_percentage>99 OR NOT p_enabled) THEN
   RAISE EXCEPTION 'canary requires enabled=true and rollout between 1 and 99 percent' USING ERRCODE='22023';
 END IF;
 IF p_release_state='released' AND (p_rollout_percentage<>100 OR NOT p_enabled) THEN
   RAISE EXCEPTION 'released state requires enabled=true and 100 percent rollout' USING ERRCODE='22023';
 END IF;
 IF p_release_state IN ('draft','paused','rolled_back') AND p_enabled THEN
   RAISE EXCEPTION 'draft, paused and rolled_back states must be disabled' USING ERRCODE='22023';
 END IF;
 SELECT to_jsonb(f) INTO v_old FROM public.platform_feature_controls f WHERE feature_key=p_feature_key;
 IF p_release_state='released' AND (v_old IS NULL OR v_old->>'release_state' NOT IN ('canary','released')) THEN
   RAISE EXCEPTION 'first release must pass through canary before full release' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.platform_feature_controls(feature_key,enabled,rollout_percentage,release_state,config,change_reason,updated_by)
 VALUES(p_feature_key,p_enabled,p_rollout_percentage,p_release_state,coalesce(p_config,'{}'::jsonb),p_reason,v_user)
 ON CONFLICT(feature_key) DO UPDATE SET enabled=excluded.enabled,rollout_percentage=excluded.rollout_percentage,
   release_state=excluded.release_state,config=excluded.config,change_reason=excluded.change_reason,updated_by=v_user,updated_at=now();
 SELECT to_jsonb(f) INTO v_new FROM public.platform_feature_controls f WHERE feature_key=p_feature_key;
 INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,old_data,new_data)
 VALUES(v_user,'platform_feature_control.upsert','platform_feature_control',null,coalesce(v_old,'{}'::jsonb),v_new);
 RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.admin_upsert_feature_control(text,boolean,integer,text,jsonb,text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_feature_control(text,boolean,integer,text,jsonb,text) TO authenticated;