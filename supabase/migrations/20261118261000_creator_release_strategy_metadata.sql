-- Persist the creator's distribution choice in canonical content metadata.
DO $$
DECLARE
  v_definition text;
  v_updated text;
BEGIN
  SELECT pg_get_functiondef('public.create_creator_submission(jsonb)'::regprocedure)
    INTO v_definition;
  IF v_definition IS NULL THEN RAISE EXCEPTION 'create_creator_submission(jsonb) is missing'; END IF;
  v_updated := replace(
    v_definition,
    '''content_context'',v_type',
    '''content_context'',v_type,''release_strategy'',coalesce(nullif(_application->>''release_strategy'',''''),''on_demand'')'
  );
  IF v_updated = v_definition AND position('release_strategy' in v_definition) = 0 THEN
    RAISE EXCEPTION 'creator release strategy metadata contract could not be safely extended';
  END IF;
  EXECUTE v_updated;
END $$;
