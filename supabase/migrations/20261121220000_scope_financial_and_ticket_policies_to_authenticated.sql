-- Restrict user/admin financial and ticket RLS policies to authenticated
-- sessions. These policies are identity-scoped and have no anonymous use case.
-- Public catalog reads remain intentionally public.
ALTER POLICY "Super admins can manage payment gateways"
  ON public.payment_gateways TO authenticated;

ALTER POLICY "Super admins can view all payments"
  ON public.payments TO authenticated;
ALTER POLICY "Users can view their payments"
  ON public.payments TO authenticated;

ALTER POLICY "Super admins can view all tickets"
  ON public.screening_tickets TO authenticated;
ALTER POLICY "Users can view their own tickets"
  ON public.screening_tickets TO authenticated;

ALTER POLICY "Super admins can manage tickets"
  ON public.tickets TO authenticated;
ALTER POLICY "Users can view their tickets"
  ON public.tickets TO authenticated;
