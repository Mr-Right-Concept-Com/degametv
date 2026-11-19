DO $$
DECLARE
  fk record;
  v_index_name text;
  v_columns text;
BEGIN
  FOR fk IN
    SELECT c.conrelid AS relid,
           c.conname,
           c.conkey,
           n.nspname AS schema_name,
           t.relname AS table_name,
           string_agg(quote_ident(a.attname), ', ' ORDER BY k.ordinality) AS column_sql,
           string_agg(a.attname, '_' ORDER BY k.ordinality) AS column_slug
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality) ON true
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f' AND n.nspname = 'public'
    GROUP BY c.conrelid,c.conname,c.conkey,n.nspname,t.relname
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_index i
      WHERE i.indrelid = fk.relid
        AND i.indisvalid
        AND (
          SELECT array_agg(key_col.attnum::smallint ORDER BY key_col.ordinality)
          FROM unnest(i.indkey) WITH ORDINALITY AS key_col(attnum, ordinality)
          WHERE key_col.ordinality <= cardinality(fk.conkey)
        ) = fk.conkey
    ) THEN
      v_index_name := left('idx_' || fk.table_name || '_' || fk.column_slug || '_fk', 63);
      v_columns := fk.column_sql;
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I (%s)', v_index_name, fk.schema_name, fk.table_name, v_columns);
    END IF;
  END LOOP;
END $$;