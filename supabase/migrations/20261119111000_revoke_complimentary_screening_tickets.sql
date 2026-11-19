ALTER TABLE public.screening_tickets
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revocation_reason text;
CREATE INDEX IF NOT EXISTS screening_tickets_active_invite_idx
  ON public.screening_tickets(id,revoked_at) WHERE revoked_at IS NULL;
