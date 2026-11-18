-- Users may edit only ordinary profile fields. Verification and identity fields
-- are service-managed and must never be self-assigned through PostgREST.
revoke update on table public.profiles from authenticated;
grant update (full_name, display_name, avatar_url, bio, country, timezone, language)
on table public.profiles to authenticated;
