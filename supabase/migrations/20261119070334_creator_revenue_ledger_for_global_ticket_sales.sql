ALTER TABLE public.guest_payment_orders ADD COLUMN IF NOT EXISTS platform_fee_major numeric NOT NULL DEFAULT 0;
ALTER TABLE public.live_payment_orders ADD COLUMN IF NOT EXISTS platform_fee_major numeric NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_ticket_kind_unique
 ON public.wallet_ledger(ticket_id,kind)
 WHERE ticket_id IS NOT NULL AND kind IN ('sale','refund');

CREATE OR REPLACE FUNCTION public.create_guest_payment_order_v3(
 p_provider text,p_reference text,p_screening_id uuid,p_tenant_id uuid,p_email text,
 p_amount_minor bigint,p_amount_major numeric,p_platform_fee_major numeric,p_currency text,
 p_location text,p_ticket_code text,p_watch_code text,p_app_origin text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
DECLARE v_ticket uuid;v_lifecycle text;v_origin text;
BEGIN
 IF current_setting('request.jwt.claim.role',true)<>'service_role' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_provider !~ '^[a-z][a-z0-9_-]{1,63}$' OR p_reference !~ '^DTV_[A-Za-z0-9]+$'
   OR p_amount_minor<=0 OR p_amount_major<=0 OR p_platform_fee_major<0 OR p_platform_fee_major>p_amount_major
   OR p_currency !~ '^[A-Z]{3}$' OR p_location NOT IN ('nigeria','international')
   OR p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$'
   OR p_ticket_code !~ '^[A-F0-9]{8,64}$' OR p_watch_code !~ '^[a-f0-9]{40}$' THEN
  RAISE EXCEPTION 'invalid_order' USING ERRCODE='22023';
 END IF;
 v_origin:=p_app_origin;
 IF v_origin !~ '^https://[^/]+$' THEN RAISE EXCEPTION 'invalid_app_origin' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.service_provider_bindings b WHERE b.capability='payments' AND b.provider_key=p_provider
  AND b.enabled=true AND b.is_live=true AND b.removed_at IS NULL AND coalesce(b.settings->'supported_currencies','[]'::jsonb)?p_currency) THEN
  RAISE EXCEPTION 'payment_provider_unavailable_for_currency' USING ERRCODE='22023';
 END IF;
 SELECT lifecycle INTO v_lifecycle FROM public.screenings WHERE id=p_screening_id AND tenant_id=p_tenant_id AND status='published';
 IF NOT FOUND THEN RAISE EXCEPTION 'screening_unavailable' USING ERRCODE='22023'; END IF;
 INSERT INTO public.screening_tickets(tenant_id,screening_id,user_id,email,ticket_code,location,price,currency,addons,payment_status,payment_method,payment_reference,watch_code,ticket_kind)
 VALUES(p_tenant_id,p_screening_id,NULL,lower(trim(p_email)),p_ticket_code,p_location,p_amount_major,p_currency,'[]'::jsonb,'pending',p_provider,p_reference,p_watch_code,CASE WHEN v_lifecycle='replay' THEN 'replay' ELSE 'live' END)
 RETURNING id INTO v_ticket;
 INSERT INTO public.guest_payment_orders(ticket_id,provider,provider_reference,email,amount_minor,currency,provider_mode,app_origin,platform_fee_major)
 VALUES(v_ticket,p_provider,p_reference,lower(trim(p_email)),p_amount_minor,p_currency,'live',v_origin,p_platform_fee_major);
 RETURN v_ticket;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_guest_payment_order_v3(text,text,uuid,uuid,text,bigint,numeric,numeric,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_guest_payment_order_v3(text,text,uuid,uuid,text,bigint,numeric,numeric,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_guest_payment_order(p_reference text,p_transaction_id text,p_amount_minor bigint,p_currency text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
DECLARE v_role text:=current_setting('request.jwt.claim.role',true);v_order public.guest_payment_orders%rowtype;v_ticket public.screening_tickets%rowtype;
 v_creator uuid;v_hold_days integer:=7;v_fee numeric:=0;
BEGIN
 IF v_role<>'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO v_order FROM public.guest_payment_orders WHERE provider_reference=p_reference FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
 IF v_order.amount_minor<>p_amount_minor OR v_order.currency<>p_currency THEN RAISE EXCEPTION 'payment_mismatch'; END IF;
 IF v_order.status='paid' THEN RETURN jsonb_build_object('already_paid',true,'ticket_id',v_order.ticket_id); END IF;
 IF v_order.status<>'pending' THEN RAISE EXCEPTION 'order_not_pending'; END IF;
 UPDATE public.guest_payment_orders SET status='paid',provider_transaction_id=p_transaction_id,paid_at=now(),updated_at=now() WHERE id=v_order.id;
 UPDATE public.screening_tickets SET payment_status='completed',payment_reference=p_reference,payment_method=v_order.provider WHERE id=v_order.ticket_id AND payment_status='pending';
 SELECT * INTO v_ticket FROM public.screening_tickets WHERE id=v_order.ticket_id;
 SELECT c.creator_id INTO v_creator FROM public.screenings s JOIN public.content c ON c.id=s.content_id WHERE s.id=v_ticket.screening_id;
 SELECT coalesce((setting_value#>>'{}')::integer,7) INTO v_hold_days FROM public.platform_settings WHERE setting_key='escrow_hold_days';
 v_fee:=least(v_ticket.price,greatest(0,coalesce(v_order.platform_fee_major,0)));
 IF v_creator IS NOT NULL THEN
  INSERT INTO public.wallet_ledger(user_id,ticket_id,screening_id,gross,fee,net,currency,kind,settles_at)
  VALUES(v_creator,v_ticket.id,v_ticket.screening_id,v_ticket.price,v_fee,v_ticket.price-v_fee,v_order.currency,'sale',now()+make_interval(days=>greatest(0,v_hold_days)))
  ON CONFLICT(ticket_id,kind) WHERE ticket_id IS NOT NULL AND kind IN ('sale','refund') DO NOTHING;
 END IF;
 RETURN jsonb_build_object('already_paid',false,'ticket_id',v_order.ticket_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_live_payment_order(
 p_reference text,p_transaction_id text,p_amount_minor bigint,p_currency text,p_claim_token_hash text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
DECLARE o public.live_payment_orders%rowtype;s public.screenings%rowtype;l public.live_streams%rowtype;t public.tickets%rowtype;
 v_ticket uuid;v_until timestamptz;v_from timestamptz;v_amount_major numeric;v_fee numeric;v_creator uuid;v_hold_days integer:=7;
BEGIN
 IF current_setting('request.jwt.claim.role',true)<>'service_role' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM public.live_payment_orders WHERE provider_reference=p_reference FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
 IF o.amount_minor<>p_amount_minor OR o.currency<>p_currency THEN RAISE EXCEPTION 'payment_mismatch'; END IF;
 IF o.user_id IS NULL AND (p_claim_token_hash IS NULL OR length(p_claim_token_hash)<>64) THEN RAISE EXCEPTION 'guest_claim_token_required'; END IF;
 IF o.status='paid' THEN
  SELECT * INTO t FROM public.tickets WHERE metadata->>'payment_reference'=p_reference ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'paid_ticket_not_found'; END IF;
  IF o.user_id IS NULL THEN UPDATE public.tickets SET claim_token_hash=p_claim_token_hash WHERE id=t.id;t.claim_token_hash:=p_claim_token_hash; END IF;
  RETURN jsonb_build_object('already_paid',true,'ticket_id',t.id,'screening_id',o.screening_id,'stream_id',o.stream_id,'ticket_type',o.ticket_type,'valid_until',t.valid_until,'email',o.email,'title',(SELECT title FROM public.screenings WHERE id=o.screening_id),'ticket_code',t.ticket_code,'price',t.price,'currency',t.currency);
 END IF;
 IF o.status<>'pending' THEN RAISE EXCEPTION 'order_not_pending'; END IF;
 SELECT * INTO s FROM public.screenings WHERE id=o.screening_id AND tenant_id=o.tenant_id FOR SHARE;
 SELECT * INTO l FROM public.live_streams WHERE id=o.stream_id AND tenant_id=o.tenant_id FOR SHARE;
 IF s.id IS NULL OR l.id IS NULL THEN RAISE EXCEPTION 'event_unavailable'; END IF;
 v_from:=CASE WHEN o.ticket_type='replay' THEN coalesce(s.live_replay_ready_at,now()) ELSE now() END;
 v_until:=CASE WHEN o.ticket_type='live' THEN greatest(coalesce(s.screening_date,now())+interval '24 hours',now()+interval '1 hour') ELSE coalesce(s.live_replay_ready_at,now())+make_interval(hours=>s.replay_access_hours) END;
 v_amount_major:=coalesce(o.amount_major,o.amount_minor::numeric/100);v_fee:=least(v_amount_major,greatest(0,coalesce(o.platform_fee_major,0)));
 INSERT INTO public.tickets(user_id,tenant_id,content_id,stream_id,ticket_type,ticket_code,price,currency,valid_from,valid_until,guest_email,claim_token_hash,metadata)
 VALUES(o.user_id,o.tenant_id,s.content_id,o.stream_id,o.ticket_type,upper(substr(encode(extensions.gen_random_bytes(12),'hex'),1,16)),v_amount_major,o.currency,v_from,v_until,CASE WHEN o.user_id IS NULL THEN lower(o.email) ELSE NULL END,p_claim_token_hash,jsonb_build_object('payment_reference',p_reference,'provider',o.provider,'transaction_id',p_transaction_id,'screening_id',s.id,'guest',o.user_id IS NULL))
 RETURNING * INTO t;
 SELECT c.creator_id INTO v_creator FROM public.content c WHERE c.id=s.content_id;
 SELECT coalesce((setting_value#>>'{}')::integer,7) INTO v_hold_days FROM public.platform_settings WHERE setting_key='escrow_hold_days';
 IF v_creator IS NOT NULL THEN
  INSERT INTO public.wallet_ledger(user_id,ticket_id,screening_id,gross,fee,net,currency,kind,settles_at)
  VALUES(v_creator,t.id,s.id,v_amount_major,v_fee,v_amount_major-v_fee,o.currency,'sale',now()+make_interval(days=>greatest(0,v_hold_days)))
  ON CONFLICT(ticket_id,kind) WHERE ticket_id IS NOT NULL AND kind IN ('sale','refund') DO NOTHING;
 END IF;
 UPDATE public.live_payment_orders SET status='paid',provider_transaction_id=p_transaction_id,paid_at=now(),updated_at=now() WHERE id=o.id;
 RETURN jsonb_build_object('already_paid',false,'ticket_id',t.id,'screening_id',s.id,'stream_id',l.id,'ticket_type',o.ticket_type,'valid_until',v_until,'email',o.email,'title',s.title,'ticket_code',t.ticket_code,'price',t.price,'currency',t.currency);
END;
$function$;
REVOKE ALL ON FUNCTION public.complete_live_payment_order(text,text,bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_live_payment_order(text,text,bigint,text,text) TO service_role;