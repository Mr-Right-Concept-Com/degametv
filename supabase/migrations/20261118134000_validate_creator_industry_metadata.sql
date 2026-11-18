do $migration$
declare
  definition text;
  old_validation text := $old$v_year := nullif(_application->>'release_year','')::integer;
  if v_year is not null and (v_year < 1900 or v_year > extract(year from now())::integer + 5) then raise exception 'invalid_release_year' using errcode='22023'; end if;$old$;
  new_validation text := $new$v_year := nullif(_application->>'release_year','')::integer;
  if v_year is not null and (v_year < 1900 or v_year > extract(year from now())::integer + 5) then raise exception 'invalid_release_year' using errcode='22023'; end if;
  if nullif(_application->>'season_number','') is not null and (nullif(_application->>'season_number','') !~ '^[0-9]{1,3}$' or (_application->>'season_number')::integer not between 1 and 100) then raise exception 'invalid_season_number' using errcode='22023'; end if;
  if nullif(_application->>'episode_number','') is not null and (nullif(_application->>'episode_number','') !~ '^[0-9]{1,3}$' or (_application->>'episode_number')::integer not between 1 and 500) then raise exception 'invalid_episode_number' using errcode='22023'; end if;
  if v_type in ('series','episode') and nullif(_application->>'season_number','') is null then raise exception 'season_number_required' using errcode='22023'; end if;
  if v_type = 'episode' and nullif(_application->>'episode_number','') is null then raise exception 'episode_number_required' using errcode='22023'; end if;$new$;
begin
  definition := pg_get_functiondef('public.create_creator_submission(jsonb)'::regprocedure);
  if position(old_validation in definition) = 0 then
    raise exception 'create_creator_submission validation contract changed; refusing unsafe replacement';
  end if;
  definition := replace(definition, old_validation, new_validation);
  execute definition;
end
$migration$;
