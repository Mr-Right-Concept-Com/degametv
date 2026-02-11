
-- Fix: Make ticket insertion policy more restrictive
-- Only allow inserting if screening is published and email is provided
DROP POLICY "Anyone can purchase a ticket" ON public.screening_tickets;

CREATE POLICY "Anyone can purchase published screening tickets"
  ON public.screening_tickets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.screenings
      WHERE id = screening_id AND status = 'published'
    )
    AND email IS NOT NULL
  );
