-- Revoke public API execution from identity/security-definer helpers.
-- RLS policies continue to call these functions as authenticated users.
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_filmmaker(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_kyc_verified(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_studio_member(uuid) FROM PUBLIC, anon;

-- Trigger-only function: never callable through the exposed PostgREST RPC surface.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Invitation acceptance is authenticated-only and must never be publicly executable.
REVOKE EXECUTE ON FUNCTION public.accept_studio_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_studio_invites() TO authenticated;

-- Preserve authenticated access for helpers referenced by existing RLS policies.
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_filmmaker(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_kyc_verified(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_studio_member(uuid) TO authenticated;
