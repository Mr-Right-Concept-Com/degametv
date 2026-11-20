-- Private and invite-only events must never leak through public catalogue SELECT policies.
DROP POLICY IF EXISTS "Anyone can view published screenings" ON public.screenings;
CREATE POLICY "Public can view published non-private screenings"
ON public.screenings FOR SELECT TO anon, authenticated
USING (
  status = 'published'
  AND coalesce(event_visibility, 'public') IN ('public', 'unlisted')
  AND coalesce(invite_only, false) = false
);

DROP POLICY IF EXISTS "Creators can view their own screenings" ON public.screenings;
CREATE POLICY "Creators can view their own screenings"
ON public.screenings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.content c
    WHERE c.id = screenings.content_id
      AND c.creator_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Anyone can view scheduled/live streams" ON public.live_streams;
CREATE POLICY "Public can view non-private scheduled/live streams"
ON public.live_streams FOR SELECT TO anon, authenticated
USING (
  status IN ('scheduled', 'live')
  AND coalesce(event_visibility, 'public') IN ('public', 'unlisted')
  AND coalesce(invite_only, false) = false
);
