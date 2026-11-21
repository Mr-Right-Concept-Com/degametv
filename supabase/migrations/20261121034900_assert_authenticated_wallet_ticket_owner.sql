CREATE OR REPLACE FUNCTION public.assert_personal_wallet_ticket_owner(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  SELECT auth.uid() IS NOT NULL AND auth.uid() = p_user_id
$function$;

REVOKE ALL ON FUNCTION public.assert_personal_wallet_ticket_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_personal_wallet_ticket_owner(uuid) TO authenticated;
