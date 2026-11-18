do $migration$
declare
  definition text;
  old_metadata text := $old$'content_context',v_type,'live_event_format',nullif(_application->>'live_event_format',''),'release_strategy',coalesce(nullif(_application->>'release_strategy',''),'on_demand')$old$;
  new_metadata text := $new$'content_context',v_type,'live_event_format',nullif(_application->>'live_event_format',''),'release_strategy',coalesce(nullif(_application->>'release_strategy',''),'on_demand'),
    'industry_metadata',jsonb_build_object(
      'original_language',nullif(_application->>'original_language',''),
      'production_country',nullif(_application->>'production_country',''),
      'content_rating',nullif(_application->>'content_rating',''),
      'aspect_ratio',nullif(_application->>'aspect_ratio',''),
      'season_number',nullif(_application->>'season_number','')::integer,
      'episode_number',nullif(_application->>'episode_number','')::integer
    )$new$;
begin
  definition := pg_get_functiondef('public.create_creator_submission(jsonb)'::regprocedure);
  if position(old_metadata in definition) = 0 then
    raise exception 'create_creator_submission metadata contract changed; refusing unsafe replacement';
  end if;
  definition := replace(definition, old_metadata, new_metadata);
  execute definition;
end
$migration$;
