DROP POLICY IF EXISTS event_settlement_holds_admin_read ON public.event_settlement_holds;
CREATE POLICY event_settlement_holds_admin_read ON public.event_settlement_holds
 FOR SELECT TO authenticated
 USING (public.is_super_admin((SELECT auth.uid())));
