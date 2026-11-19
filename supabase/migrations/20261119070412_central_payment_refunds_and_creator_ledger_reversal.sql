CREATE TABLE IF NOT EXISTS public.payment_refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ticket_id uuid REFERENCES public.screening_tickets(id),
 live_ticket_id uuid REFERENCES public.tickets(id),
 payment_reference text NOT NULL,
 provider text NOT NULL,
 provider_mode text NOT NULL CHECK(provider_mode IN ('test','live')),
 provider_refund_id text,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 reason text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','succeeded','failed')),
 error_code text,
 requested_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((ticket_id IS NOT NULL)::integer + (live_ticket_id IS NOT NULL)::integer = 1)
);
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_refunds FROM anon,authenticated;
GRANT SELECT ON public.payment_refunds TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS payment_refunds_one_open_or_success_per_reference
 ON public.payment_refunds(payment_reference) WHERE status IN ('pending','succeeded');
CREATE INDEX IF NOT EXISTS payment_refunds_created_idx ON public.payment_refunds(created_at DESC);

CREATE OR REPLACE FUNCTION public.complete_payment_refund(p_refund_id uuid,p_provider_refund_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
DECLARE r public.payment_refunds%rowtype;v_order_status text;v_ticket_id uuid;v_reason text;
BEGIN
 IF current_setting('request.jwt.claim.role',true)<>'service_role' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.payment_refunds WHERE id=p_refund_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'refund_not_found'; END IF;
 IF r.status='succeeded' THEN RETURN jsonb_build_object('already_refunded',true,'refund_id',r.id); END IF;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'refund_not_pending'; END IF;
 IF r.ticket_id IS NOT NULL THEN
  SELECT status INTO v_order_status FROM public.guest_payment_orders WHERE ticket_id=r.ticket_id AND provider_reference=r.payment_reference FOR UPDATE;
  IF v_order_status<>'paid' THEN RAISE EXCEPTION 'payment_not_paid'; END IF;
  UPDATE public.guest_payment_orders SET status='refunded',updated_at=now() WHERE provider_reference=r.payment_reference;
  UPDATE public.screening_tickets SET payment_status='refunded',refunded_at=now(),refund_reason=r.reason WHERE id=r.ticket_id;
  v_ticket_id:=r.ticket_id;
 ELSE
  SELECT status INTO v_order_status FROM public.live_payment_orders WHERE provider_reference=r.payment_reference FOR UPDATE;
  IF v_order_status<>'paid' THEN RAISE EXCEPTION 'payment_not_paid'; END IF;
  UPDATE public.live_payment_orders SET status='refunded',updated_at=now() WHERE provider_reference=r.payment_reference;
  UPDATE public.tickets SET revoked_at=now(),revocation_reason=r.reason WHERE id=r.live_ticket_id;
  v_ticket_id:=r.live_ticket_id;
 END IF;
 INSERT INTO public.wallet_ledger(user_id,ticket_id,screening_id,gross,fee,net,currency,kind,settles_at)
 SELECT user_id,ticket_id,screening_id,-gross,-fee,-net,currency,'refund',now()
 FROM public.wallet_ledger WHERE ticket_id=v_ticket_id AND kind='sale'
 ON CONFLICT(ticket_id,kind) WHERE ticket_id IS NOT NULL AND kind IN ('sale','refund') DO NOTHING;
 UPDATE public.payment_refunds SET status='succeeded',provider_refund_id=p_provider_refund_id,updated_at=now(),error_code=NULL WHERE id=r.id;
 INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,new_data)
 VALUES(r.requested_by,'payment.refund_succeeded','payment_refund',r.id,
   jsonb_build_object('payment_reference',r.payment_reference,'amount_minor',r.amount_minor,'currency',r.currency,'provider',r.provider,'provider_refund_id',p_provider_refund_id,'reason',r.reason));
 RETURN jsonb_build_object('success',true,'refund_id',r.id,'payment_reference',r.payment_reference,'amount_minor',r.amount_minor,'currency',r.currency);
END;
$function$;
REVOKE ALL ON FUNCTION public.complete_payment_refund(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payment_refund(uuid,text) TO service_role;