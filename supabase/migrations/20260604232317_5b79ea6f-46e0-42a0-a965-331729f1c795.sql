
ALTER TABLE public.watch_history
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN content_id DROP NOT NULL;
