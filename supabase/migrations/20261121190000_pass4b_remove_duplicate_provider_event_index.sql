-- Remove the manually-created duplicate unique index. The table-level UNIQUE
-- constraint already owns an equivalent index and remains authoritative.
DROP INDEX IF EXISTS public.stream_provider_event_logs_provider_event_uidx;
