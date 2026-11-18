-- Keep the Studio submission RPC aligned with the production types and publication gate.
-- The canonical submission RPC is retained; only its type allow-list and metadata contract are extended.
DO $$
DECLARE
  v_definition text;
  v_updated text;
BEGIN
  SELECT pg_get_functiondef('public.create_creator_submission(jsonb)'::regprocedure)
    INTO v_definition;

  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'create_creator_submission(jsonb) is missing';
  END IF;

  v_updated := replace(
    v_definition,
    'v_project_type NOT IN (''movie'',''series'',''live'',''vod'')',
    'v_project_type NOT IN (''movie'',''series'',''live'',''vod'',''episode'',''short'',''trailer'')'
  );

  IF v_updated = v_definition THEN
    IF position(''episode'' in v_definition) = 0
       OR position(''short'' in v_definition) = 0
       OR position(''trailer'' in v_definition) = 0 THEN
      RAISE EXCEPTION 'creator submission type guard could not be safely extended';
    END IF;
  END IF;

  v_definition := v_updated;
  v_updated := replace(
    v_definition,
    'jsonb_build_object(''submission_source'',''creator_studio'')',
    'jsonb_build_object(''submission_source'',''creator_studio'',''rights_declaration'',nullif(_application->>''distribution_rights'',''''),''rights_territories'',coalesce(_application->''rights_territories'',''[]''::jsonb),''budget_range'',nullif(_application->>''budget_range'',''''),''release_strategy'',coalesce(nullif(_application->>''release_strategy'',''''),''on_demand''))'
  );

  IF v_updated = v_definition THEN
    IF position(''rights_declaration'' in v_definition) = 0 THEN
      RAISE EXCEPTION 'creator content rights metadata contract could not be safely extended';
    END IF;
  END IF;

  EXECUTE v_updated;
END $$;
