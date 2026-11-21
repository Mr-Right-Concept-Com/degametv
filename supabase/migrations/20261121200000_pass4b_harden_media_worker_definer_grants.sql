-- Pass 4C: harden SECURITY DEFINER search paths and internal media-worker grants.
-- Keep existing trusted schemas in each path, but always place pg_temp last.
DO $$
DECLARE
  v_function record;
  v_path text;
BEGIN
  FOR v_function IN
    SELECT p.oid, p.oid::regprocedure AS signature, p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
  LOOP
    SELECT option_value INTO v_path
    FROM pg_options_to_table(v_function.proconfig)
    WHERE option_name='search_path';

    IF v_path IS NULL THEN
      v_path := 'public';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM unnest(string_to_array(replace(v_path,' ',''),',')) AS item
      WHERE item='pg_temp'
    ) THEN
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path TO %s',
        v_function.signature,
        v_path || ', pg_temp'
      );
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.get_media_worker_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_media_worker_secret() TO service_role;
REVOKE ALL ON FUNCTION public.get_media_transcoder_callback_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_media_transcoder_callback_secret() TO service_role;
REVOKE ALL ON FUNCTION public.get_service_provider_runtime_config(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_service_provider_runtime_config(text) TO service_role;
REVOKE ALL ON FUNCTION public.claim_media_processing_jobs(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_media_processing_jobs(text, integer) TO service_role;