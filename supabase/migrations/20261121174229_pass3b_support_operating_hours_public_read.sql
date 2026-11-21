GRANT SELECT ON TABLE public.support_operating_hours TO anon, authenticated;
DROP POLICY IF EXISTS support_operating_hours_public_read ON public.support_operating_hours;
CREATE POLICY support_operating_hours_public_read ON public.support_operating_hours
FOR SELECT TO anon, authenticated USING (true);