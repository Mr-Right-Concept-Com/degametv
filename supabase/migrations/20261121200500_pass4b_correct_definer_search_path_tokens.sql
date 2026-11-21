-- Correct the quoted-list form produced by the initial Pass 4B path hardening.
-- PostgreSQL search_path is a comma-separated identifier list, not one quoted name.
ALTER FUNCTION public.accept_studio_invites() SET search_path TO public, pg_temp;
ALTER FUNCTION public.admin_upsert_country_currency_rule(text,text,text,text,text,boolean,text) SET search_path TO public, auth, pg_temp;
ALTER FUNCTION public.admin_upsert_feature_control(text,boolean,integer,text,jsonb,text) SET search_path TO public, auth, pg_temp;
ALTER FUNCTION public.get_my_studio_account() SET search_path TO public, pg_temp;
ALTER FUNCTION public.get_user_tenant_id(uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.grant_creator_on_tier_approval() SET search_path TO public, pg_temp;
ALTER FUNCTION public.guard_promo_banner() SET search_path TO public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path TO public, pg_temp;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path TO public, pg_temp;
ALTER FUNCTION public.is_filmmaker(uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.is_kyc_verified(uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.is_studio_member(uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.is_super_admin(uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.submit_my_studio_account(text) SET search_path TO public, pg_temp;
ALTER FUNCTION public.validate_studio_member() SET search_path TO public, pg_temp;
