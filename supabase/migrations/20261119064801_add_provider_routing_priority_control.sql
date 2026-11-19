CREATE OR REPLACE FUNCTION public.admin_configure_service_provider_modes_with_priority(
 p_capability text,p_provider_key text,p_enabled boolean,p_is_live boolean,
 p_base_url text,p_endpoints jsonb,p_settings jsonb,
 p_test_credential text,p_live_credential text,p_test_webhook_secret text,p_live_webhook_secret text,
 p_priority integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,vault,pg_temp AS $function$
DECLARE v_actor uuid:=auth.uid();v_result jsonb;v_id uuid;
BEGIN
 IF v_actor IS NULL OR NOT public.has_role(v_actor,'super_admin'::public.app_role) THEN
   RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
 END IF;
 IF p_priority NOT BETWEEN 0 AND 10000 THEN
   RAISE EXCEPTION 'provider priority must be between 0 and 10000' USING ERRCODE='22023';
 END IF;
 v_result:=public.admin_configure_service_provider_modes(
   p_capability,p_provider_key,p_enabled,p_is_live,p_base_url,p_endpoints,p_settings,
   p_test_credential,p_live_credential,p_test_webhook_secret,p_live_webhook_secret,false
 );
 v_id:=(v_result->>'id')::uuid;
 UPDATE public.service_provider_bindings SET priority=p_priority,updated_at=now(),updated_by=v_actor WHERE id=v_id;
 INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,new_data)
 VALUES(v_actor,'provider.priority_updated','service_provider',v_id,
   jsonb_build_object('capability',p_capability,'provider',p_provider_key,'priority',p_priority));
 RETURN v_result||jsonb_build_object('priority',p_priority);
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_configure_service_provider_modes_with_priority(text,text,boolean,boolean,text,jsonb,jsonb,text,text,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_configure_service_provider_modes_with_priority(text,text,boolean,boolean,text,jsonb,jsonb,text,text,text,text,integer) TO authenticated;