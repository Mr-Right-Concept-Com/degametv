CREATE OR REPLACE FUNCTION public.wallet_balance_by_currency(_user_id uuid)
RETURNS TABLE(currency text, gross numeric, fees numeric, escrow numeric, withdrawable numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    l.currency,
    coalesce(sum(l.gross), 0) AS gross,
    coalesce(sum(l.fee), 0) AS fees,
    coalesce(sum(l.net) FILTER (WHERE l.settles_at > now()), 0) AS escrow,
    coalesce(sum(l.net) FILTER (WHERE l.settles_at <= now()), 0)
      - coalesce((
        SELECT sum(w.amount)
        FROM public.withdrawal_requests w
        WHERE w.user_id = _user_id
          AND w.currency = l.currency
          AND w.status <> 'rejected'
      ), 0) AS withdrawable
  FROM public.wallet_ledger l
  WHERE l.user_id = _user_id
    AND (_user_id = (select auth.uid()) OR public.is_super_admin((select auth.uid())))
  GROUP BY l.currency
  ORDER BY l.currency;
$function$;
REVOKE ALL ON FUNCTION public.wallet_balance_by_currency(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_balance_by_currency(uuid) TO authenticated;