do $migration$
declare
  definition text;
  old_fragment text := $$'content_context',v_type,'release_strategy',coalesce$$;
  new_fragment text := $$'content_context',v_type,'live_event_format',nullif(_application->>'live_event_format',''),'release_strategy',coalesce$$;
begin
  definition := pg_get_functiondef('public.create_creator_submission(jsonb)'::regprocedure);
  if position(old_fragment in definition) = 0 then
    raise exception 'create_creator_submission metadata contract changed; refusing unsafe replacement';
  end if;
  definition := replace(definition, old_fragment, new_fragment);
  execute definition;
end
$migration$;
