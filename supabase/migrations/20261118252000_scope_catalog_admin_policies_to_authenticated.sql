-- Security-definer admin predicates are authenticated-only. A PUBLIC-scoped
-- ALL policy makes Postgres evaluate is_super_admin() for anon catalog reads;
-- the helper is intentionally not executable by anon.
DROP POLICY IF EXISTS "Super admins can manage all content" ON public.content;
CREATE POLICY "Super admins can manage all content"
  ON public.content FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage all screenings" ON public.screenings;
CREATE POLICY "Super admins can manage all screenings"
  ON public.screenings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));