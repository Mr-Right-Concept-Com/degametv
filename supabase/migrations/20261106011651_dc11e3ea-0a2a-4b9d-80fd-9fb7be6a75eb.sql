ALTER TABLE public.filmmaker_submissions
  ADD COLUMN IF NOT EXISTS premiere_date date,
  ADD COLUMN IF NOT EXISTS cast_crew jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rights_territories text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS prior_screenings text;

REVOKE EXECUTE ON FUNCTION public.accept_studio_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_studio_invites() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_studio_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_studio_member(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.validate_studio_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_promo_banner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_creator_on_tier_approval() FROM PUBLIC, anon, authenticated;
