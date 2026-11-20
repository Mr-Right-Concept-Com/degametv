-- Allow the central Vault-backed provider registry to persist AI adapters as first-class capabilities.
do $$
declare
  v_definition text;
  v_old text := 'if p_capability not in (''payments'',''identity'',''bank_verification'',''video_delivery'',''email'',''live_streaming'',''fx_rates'') then';
  v_new text := 'if p_capability not in (''payments'',''identity'',''bank_verification'',''video_delivery'',''email'',''live_streaming'',''fx_rates'',''ai_text'',''ai_moderation'',''ai_embeddings'') then';
begin
  select pg_get_functiondef('public.admin_configure_service_provider_modes(text,text,boolean,boolean,text,jsonb,jsonb,text,text,text,text,boolean)'::regprocedure)
  into v_definition;
  if position(v_old in v_definition)=0 then
    raise exception 'provider_capability_guard_definition_drifted';
  end if;
  execute replace(v_definition,v_old,v_new);
end $$;
