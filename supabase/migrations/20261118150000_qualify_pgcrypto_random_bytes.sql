-- pgcrypto is installed in the Supabase-managed extensions schema.
-- SECURITY DEFINER routines intentionally use a restricted search_path, so
-- random-byte generation must be schema-qualified rather than relying on search_path.
DO $$
DECLARE
  v_oid oid;
  v_definition text;
  v_updated text;
BEGIN
  FOR v_oid IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.prokind='f'
      AND position('gen_random_bytes(' in pg_get_functiondef(p.oid))>0
  LOOP
    v_definition := pg_get_functiondef(v_oid);
    IF position('extensions.gen_random_bytes(' in v_definition)=0 THEN
      v_updated := replace(v_definition,'gen_random_bytes(','extensions.gen_random_bytes(');
      EXECUTE v_updated;
    END IF;
  END LOOP;
END $$;
