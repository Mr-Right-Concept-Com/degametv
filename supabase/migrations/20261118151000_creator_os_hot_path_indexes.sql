-- Index the Creator OS ownership, provider reconciliation and entitlement hot paths.
-- Provider references are unique within a provider namespace, which makes webhook
-- stream resolution deterministic and prevents ambiguous cross-tenant matches.
CREATE UNIQUE INDEX IF NOT EXISTS uq_live_streams_provider_reference
  ON public.live_streams ((metadata->>'provider'), (metadata->>'provider_reference'))
  WHERE nullif(metadata->>'provider','') IS NOT NULL
    AND nullif(metadata->>'provider_reference','') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_live_streams_creator_created
  ON public.live_streams (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_streams_tenant_created
  ON public.live_streams (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_provider_event_logs_stream
  ON public.stream_provider_event_logs (stream_id);

CREATE INDEX IF NOT EXISTS idx_content_creator_created
  ON public.content (creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_stream_user_type_active
  ON public.tickets (stream_id, user_id, ticket_type)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_user_created
  ON public.tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_content
  ON public.tickets (content_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant
  ON public.tickets (tenant_id);

CREATE INDEX IF NOT EXISTS idx_live_payment_orders_screening_created
  ON public.live_payment_orders (screening_id, created_at DESC);
