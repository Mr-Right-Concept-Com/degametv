DO $$
DECLARE d text;
BEGIN
 SELECT pg_get_functiondef('public.create_creator_submission(jsonb)'::regprocedure) INTO d;
 IF d IS NULL OR position('v_project_type not in' in lower(d))=0 THEN RAISE EXCEPTION 'creator submission type guard missing'; END IF;
 d:=regexp_replace(d, 'v_project_type not in \(''movie'',''series''\)', 'v_project_type not in (''movie'',''series'',''live'',''vod'')', 'i');
 IF position('v_project_type not in (''movie'',''series'',''live'',''vod'')' in lower(d))=0 THEN RAISE EXCEPTION 'creator submission type guard replacement failed'; END IF;
 EXECUTE d;
END $$;
