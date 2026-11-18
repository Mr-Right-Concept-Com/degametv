-- Enable database change broadcasts for the published screening catalogue consumed by Flutter clients.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'screenings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.screenings;
  END IF;
END
$$;
