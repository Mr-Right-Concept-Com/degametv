-- Keep displayed creator-available balances consistent with withdrawal reservations.
-- Failed and rejected requests release their reservation; pending/approved/processing
-- requests continue to reserve funds until an explicit terminal transition.
CREATE OR REPLACE FUNCTION public.wallet_balance(_user_id uuid)
RETURNS TABLE(gross numeric, fees numeric, escrow numeric, withdrawable numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    coalesce(sum(l.gross), 0),
    coalesce(sum(l.fee), 0),
    coalesce(sum(l.net) FILTER (WHERE l.settles_at > now()), 0),
    coalesce(sum(l.net) FILTER (WHERE l.settles_at <= now()), 0)
      - coalesce((
          SELECT sum(w.amount)
          FROM public.withdrawal_requests w
          WHERE w.user_id = _user_id
            AND w.status NOT IN ('rejected', 'failed')
        ), 0)
  FROM public.wallet_ledger l
  WHERE l.user_id = _user_id
    AND (_user_id = auth.uid() OR public.is_super_admin(auth.uid()));
$function$;

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
            AND w.status NOT IN ('rejected', 'failed')
        ), 0) AS withdrawable
  FROM public.wallet_ledger l
  WHERE l.user_id = _user_id
    AND (_user_id = (SELECT auth.uid()) OR public.is_super_admin((SELECT auth.uid())))
  GROUP BY l.currency
  ORDER BY l.currency;
$function$;
