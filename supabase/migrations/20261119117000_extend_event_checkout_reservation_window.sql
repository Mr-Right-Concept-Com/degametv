-- Keep inventory reservations aligned with realistic hosted checkout completion windows.
ALTER TABLE public.event_ticket_reservations
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '60 minutes');
