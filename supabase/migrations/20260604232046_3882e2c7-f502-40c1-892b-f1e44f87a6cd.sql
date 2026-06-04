
ALTER TABLE public.screenings
  ADD COLUMN IF NOT EXISTS allowed_countries text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS blocked_countries text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_policy text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_streams_per_ticket integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_concurrent_streams integer NOT NULL DEFAULT 1;

ALTER TABLE public.screening_tickets
  ADD COLUMN IF NOT EXISTS stream_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_session_token text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS active_session_started_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_ip text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_country text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamptz DEFAULT NULL;

ALTER TABLE public.watch_history
  ADD COLUMN IF NOT EXISTS country text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS city text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS watch_duration_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS screening_id uuid DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_watch_history_screening ON public.watch_history(screening_id);
CREATE INDEX IF NOT EXISTS idx_screening_tickets_screening ON public.screening_tickets(screening_id);
