ALTER TABLE public.live_payment_orders ADD COLUMN IF NOT EXISTS email_delivery_claimed_at timestamptz;
CREATE OR REPLACE FUNCTION public.claim_live_payment_email(p_reference text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
DECLARE v_id uuid;
BEGIN
 IF current_setting('request.jwt.claim.role',true)<>'service_role' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 UPDATE public.live_payment_orders
 SET email_delivery_claimed_at=now(),updated_at=now()
 WHERE provider_reference=p_reference AND status='paid' AND email_sent_at IS NULL
   AND (email_delivery_claimed_at IS NULL OR email_delivery_claimed_at < now()-interval '2 minutes')
 RETURNING id INTO v_id;
 RETURN v_id IS NOT NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.claim_live_payment_email(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_live_payment_email(text) TO service_role;