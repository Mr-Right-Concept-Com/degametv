GRANT SELECT ON TABLE public.support_sla_escalation_events TO authenticated;
DROP POLICY IF EXISTS support_sla_escalation_admin_read ON public.support_sla_escalation_events;
CREATE POLICY support_sla_escalation_admin_read ON public.support_sla_escalation_events
FOR SELECT TO authenticated
USING (
  public.is_super_admin((select auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.support_tickets t
    JOIN public.support_agents a ON a.user_id = (select auth.uid()) AND a.is_active = true
    WHERE t.id = support_sla_escalation_events.ticket_id
      AND t.assigned_agent_id = (select auth.uid())
  )
);