ALTER TABLE public.live_payment_orders
  ADD COLUMN IF NOT EXISTS amount_major numeric,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.complete_live_payment_order(
 p_reference text,p_transaction_id text,p_amount_minor bigint,p_currency text,p_claim_token_hash text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
DECLARE
 o public.live_payment_orders%rowtype;
 s public.screenings%rowtype;
 l public.live_streams%rowtype;
 t public.tickets%rowtype;
 v_ticket uuid;
 v_until timestamptz;
 v_from timestamptz;
 v_amount_major numeric;
BEGIN
 IF current_setting('request.jwt.claim.role',true)<>'service_role' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM public.live_payment_orders WHERE provider_reference=p_reference FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
 IF o.amount_minor<>p_amount_minor OR o.currency<>p_currency THEN RAISE EXCEPTION 'payment_mismatch'; END IF;
 IF o.user_id IS NULL AND (p_claim_token_hash IS NULL OR length(p_claim_token_hash)<>64) THEN
   RAISE EXCEPTION 'guest_claim_token_required';
 END IF;
 IF o.status='paid' THEN
   SELECT * INTO t FROM public.tickets WHERE metadata->>'payment_reference'=p_reference ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
   IF t.id IS NULL THEN RAISE EXCEPTION 'paid_ticket_not_found'; END IF;
   IF o.user_id IS NULL THEN
     UPDATE public.tickets SET claim_token_hash=p_claim_token_hash WHERE id=t.id;
     t.claim_token_hash:=p_claim_token_hash;
   END IF;
   RETURN jsonb_build_object('already_paid',true,'ticket_id',t.id,'screening_id',o.screening_id,'stream_id',o.stream_id,
     'ticket_type',o.ticket_type,'valid_until',t.valid_until,'email',o.email,'title',(SELECT title FROM public.screenings WHERE id=o.screening_id),
     'ticket_code',t.ticket_code,'price',t.price,'currency',t.currency);
 END IF;
 IF o.status<>'pending' THEN RAISE EXCEPTION 'order_not_pending'; END IF;
 SELECT * INTO s FROM public.screenings WHERE id=o.screening_id AND tenant_id=o.tenant_id FOR SHARE;
 SELECT * INTO l FROM public.live_streams WHERE id=o.stream_id AND tenant_id=o.tenant_id FOR SHARE;
 IF s.id IS NULL OR l.id IS NULL THEN RAISE EXCEPTION 'event_unavailable'; END IF;
 v_from:=CASE WHEN o.ticket_type='replay' THEN coalesce(s.live_replay_ready_at,now()) ELSE now() END;
 v_until:=CASE WHEN o.ticket_type='live' THEN greatest(coalesce(s.screening_date,now())+interval '24 hours',now()+interval '1 hour')
   ELSE coalesce(s.live_replay_ready_at,now())+make_interval(hours=>s.replay_access_hours) END;
 v_amount_major:=coalesce(o.amount_major,o.amount_minor::numeric/100);
 INSERT INTO public.tickets(user_id,tenant_id,content_id,stream_id,ticket_type,ticket_code,price,currency,valid_from,valid_until,guest_email,claim_token_hash,metadata)
 VALUES(o.user_id,o.tenant_id,s.content_id,o.stream_id,o.ticket_type,
   upper(substr(encode(extensions.gen_random_bytes(12),'hex'),1,16)),v_amount_major,o.currency,v_from,v_until,
   CASE WHEN o.user_id IS NULL THEN lower(o.email) ELSE NULL END,p_claim_token_hash,
   jsonb_build_object('payment_reference',p_reference,'provider',o.provider,'transaction_id',p_transaction_id,'screening_id',s.id,'guest',o.user_id IS NULL))
 RETURNING * INTO t;
 UPDATE public.live_payment_orders SET status='paid',provider_transaction_id=p_transaction_id,paid_at=now(),updated_at=now() WHERE id=o.id;
 RETURN jsonb_build_object('already_paid',false,'ticket_id',t.id,'screening_id',s.id,'stream_id',l.id,'ticket_type',o.ticket_type,
   'valid_until',v_until,'email',o.email,'title',s.title,'ticket_code',t.ticket_code,'price',t.price,'currency',t.currency);
END;
$function$;
REVOKE ALL ON FUNCTION public.complete_live_payment_order(text,text,bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_live_payment_order(text,text,bigint,text,text) TO service_role;