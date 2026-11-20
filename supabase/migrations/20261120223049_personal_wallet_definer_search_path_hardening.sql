ALTER FUNCTION public.get_my_personal_wallet_balances() SET search_path = public, pg_temp;
ALTER FUNCTION public.credit_personal_wallet_topup(text,text,bigint,text) SET search_path = public, pg_temp;
ALTER FUNCTION public.spend_personal_wallet_for_contribution(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.refund_personal_wallet_contribution(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_my_wallet_activity(integer,timestamptz) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_event_contribution_leaderboard(text,uuid,text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_event_contribution_totals(text,uuid) SET search_path = public, pg_temp;
