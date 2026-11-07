DROP POLICY IF EXISTS "Anyone can purchase published screening tickets" ON public.screening_tickets;
REVOKE INSERT, UPDATE, DELETE ON public.screening_tickets FROM anon, authenticated;

DROP POLICY IF EXISTS "Admins can grant creator role" ON public.user_roles;
CREATE POLICY "Admins can grant creator role"
ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  role = 'creator'::public.app_role
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::public.app_role)
  )
);

REVOKE EXECUTE ON FUNCTION public.is_studio_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_studio_member(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_studio_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_studio_invites() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_studio_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_promo_banner() FROM PUBLIC, anon, authenticated;