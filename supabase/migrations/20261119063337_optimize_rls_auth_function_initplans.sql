DO $$
DECLARE
  policy_row record;
  using_sql text;
  check_sql text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') LIKE '%auth.uid()%'
        OR coalesce(qual, '') LIKE '%auth.role()%'
        OR coalesce(qual, '') LIKE '%auth.jwt()%'
        OR coalesce(with_check, '') LIKE '%auth.uid()%'
        OR coalesce(with_check, '') LIKE '%auth.role()%'
        OR coalesce(with_check, '') LIKE '%auth.jwt()%'
      )
  LOOP
    using_sql := policy_row.qual;
    check_sql := policy_row.with_check;
    IF using_sql IS NOT NULL THEN
      using_sql := replace(replace(replace(using_sql, 'auth.uid()', '(select auth.uid())'), 'auth.role()', '(select auth.role())'), 'auth.jwt()', '(select auth.jwt())');
    END IF;
    IF check_sql IS NOT NULL THEN
      check_sql := replace(replace(replace(check_sql, 'auth.uid()', '(select auth.uid())'), 'auth.role()', '(select auth.role())'), 'auth.jwt()', '(select auth.jwt())');
    END IF;
    IF using_sql IS NOT NULL AND check_sql IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)', policy_row.policyname, policy_row.schemaname, policy_row.tablename, using_sql, check_sql);
    ELSIF using_sql IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', policy_row.policyname, policy_row.schemaname, policy_row.tablename, using_sql);
    ELSIF check_sql IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)', policy_row.policyname, policy_row.schemaname, policy_row.tablename, check_sql);
    END IF;
  END LOOP;
END $$;