ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS bank_country text;

CREATE INDEX IF NOT EXISTS withdrawal_requests_user_currency_status_idx
  ON public.withdrawal_requests(user_id,currency,status);

DROP POLICY IF EXISTS "own withdrawals insert" ON public.withdrawal_requests;
REVOKE INSERT ON public.withdrawal_requests FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_wallet_withdrawal(
  p_amount numeric,
  p_currency text,
  p_bank_country text,
  p_bank_name text,
  p_account_number text,
  p_account_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_settled numeric := 0;
  v_reserved numeric := 0;
  v_available numeric := 0;
  v_request public.withdrawal_requests%rowtype;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE='42501';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0
     OR p_currency !~ '^[A-Z]{3}$'
     OR p_bank_country !~ '^[A-Z]{2}$'
     OR length(trim(coalesce(p_bank_name,''))) < 2
     OR length(trim(coalesce(p_account_name,''))) < 2
     OR trim(coalesce(p_account_number,'')) !~ '^[A-Za-z0-9 -]{4,34}$' THEN
    RAISE EXCEPTION 'Invalid payout request details.' USING ERRCODE='22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_currency, 0));

  SELECT coalesce(sum(l.net),0)
  INTO v_settled
  FROM public.wallet_ledger l
  WHERE l.user_id=v_user AND l.currency=p_currency AND l.settles_at <= now();

  SELECT coalesce(sum(w.amount),0)
  INTO v_reserved
  FROM public.withdrawal_requests w
  WHERE w.user_id=v_user AND w.currency=p_currency AND w.status <> 'rejected';

  v_available := v_settled - v_reserved;
  IF p_amount > v_available THEN
    RAISE EXCEPTION 'Insufficient settled funds for % withdrawal. Available: %.', p_currency, greatest(v_available,0)
      USING ERRCODE='22023';
  END IF;

  INSERT INTO public.withdrawal_requests(
    user_id,amount,currency,bank_country,bank_name,account_number,account_name,status
  ) VALUES (
    v_user,p_amount,p_currency,p_bank_country,trim(p_bank_name),trim(p_account_number),trim(p_account_name),'pending'
  ) RETURNING * INTO v_request;

  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,new_data)
  VALUES(v_user,'wallet.withdrawal_requested','withdrawal_request',v_request.id::text,
    jsonb_build_object('amount',p_amount,'currency',p_currency,'bank_country',p_bank_country,'status','pending'));

  RETURN jsonb_build_object(
    'id',v_request.id,'amount',v_request.amount,'currency',v_request.currency,
    'bank_country',v_request.bank_country,'status',v_request.status,'created_at',v_request.created_at,
    'available_after_request',v_available-p_amount
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.request_wallet_withdrawal(numeric,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_wallet_withdrawal(numeric,text,text,text,text,text) TO authenticated;