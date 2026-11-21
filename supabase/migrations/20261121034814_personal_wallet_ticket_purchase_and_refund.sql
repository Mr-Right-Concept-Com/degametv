CREATE OR REPLACE FUNCTION public.purchase_personal_wallet_screening_ticket(p_user_id uuid, p_screening_id uuid, p_email text, p_amount_minor bigint, p_amount_major numeric, p_platform_fee_major numeric, p_currency text, p_location text, p_ticket_code text, p_watch_code text, p_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_screening public.screenings%rowtype;
  v_ticket public.screening_tickets%rowtype;
  v_order public.guest_payment_orders%rowtype;
  v_creator uuid;
  v_balance bigint;
  v_fee_minor bigint;
  v_scale bigint;
  v_release_at timestamptz;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501';
  END IF;
  IF p_user_id IS NULL OR p_screening_id IS NULL OR p_amount_minor <= 0 OR p_amount_major <= 0
     OR p_platform_fee_major < 0 OR p_platform_fee_major > p_amount_major
     OR p_currency !~ '^[A-Z]{3}$' OR p_location NOT IN ('nigeria','international')
     OR p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$'
     OR p_ticket_code !~ '^[A-F0-9]{8,64}$' OR p_watch_code !~ '^[a-f0-9]{40}$'
     OR p_reference !~ '^DTVW_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_wallet_ticket_order' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_order FROM public.guest_payment_orders
  WHERE provider_reference=p_reference FOR UPDATE;
  IF FOUND THEN
    IF v_order.provider_mode <> 'wallet' OR v_order.status <> 'paid' THEN
      RAISE EXCEPTION 'wallet_order_reference_conflict';
    END IF;
    SELECT * INTO v_ticket FROM public.screening_tickets WHERE id=v_order.ticket_id;
    RETURN jsonb_build_object('success',true,'already_paid',true,'ticket_id',v_ticket.id,
      'ticket_code',v_ticket.ticket_code,'watch_code',v_ticket.watch_code,
      'balance_minor',(SELECT balance_minor FROM public.personal_wallet_accounts WHERE user_id=p_user_id AND currency=p_currency));
  END IF;

  SELECT * INTO v_screening FROM public.screenings
  WHERE id=p_screening_id AND status='published' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'screening_unavailable'; END IF;

  INSERT INTO public.personal_wallet_accounts(user_id,currency,balance_minor)
  VALUES(p_user_id,p_currency,0) ON CONFLICT(user_id,currency) DO NOTHING;
  SELECT balance_minor INTO v_balance FROM public.personal_wallet_accounts
  WHERE user_id=p_user_id AND currency=p_currency FOR UPDATE;
  IF v_balance < p_amount_minor THEN
    RAISE EXCEPTION 'insufficient_personal_wallet_funds' USING ERRCODE='22023';
  END IF;
  UPDATE public.personal_wallet_accounts SET balance_minor=balance_minor-p_amount_minor,updated_at=now()
  WHERE user_id=p_user_id AND currency=p_currency RETURNING balance_minor INTO v_balance;

  INSERT INTO public.screening_tickets(
    tenant_id,screening_id,user_id,email,ticket_code,location,price,currency,addons,
    payment_status,payment_method,payment_reference,watch_code,ticket_kind
  ) VALUES (
    v_screening.tenant_id,v_screening.id,p_user_id,lower(trim(p_email)),p_ticket_code,p_location,
    p_amount_major,p_currency,'[]'::jsonb,'completed','personal_wallet',p_reference,p_watch_code,
    CASE WHEN v_screening.lifecycle='replay' THEN 'replay' ELSE 'live' END
  ) RETURNING * INTO v_ticket;

  INSERT INTO public.guest_payment_orders(
    ticket_id,provider,provider_reference,email,amount_minor,currency,status,provider_mode,
    platform_fee_major,provider_transaction_id,paid_at
  ) VALUES (
    v_ticket.id,'personal_wallet',p_reference,lower(trim(p_email)),p_amount_minor,p_currency,
    'paid','wallet',p_platform_fee_major,'personal-wallet:'||p_reference,now()
  );

  INSERT INTO public.personal_wallet_ledger(
    user_id,currency,entry_type,amount_minor,balance_after_minor,idempotency_key,reference,metadata
  ) VALUES (
    p_user_id,p_currency,'ticket_debit',p_amount_minor,v_balance,'ticket:'||p_reference,
    p_reference,jsonb_build_object('ticket_source','screening','ticket_id',v_ticket.id)
  );

  SELECT c.creator_id INTO v_creator FROM public.content c WHERE c.id=v_screening.content_id;
  IF v_creator IS NOT NULL THEN
    v_scale:=CASE
      WHEN p_currency IN ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') THEN 1
      WHEN p_currency IN ('BHD','IQD','JOD','KWD','LYD','OMR','TND') THEN 1000 ELSE 100 END;
    v_fee_minor:=round(least(p_amount_major,p_platform_fee_major)*v_scale)::bigint;
    INSERT INTO public.event_settlement_holds(
      tenant_id,creator_id,screening_id,source_type,source_id,currency,
      gross_amount_minor,net_amount_minor,hold_status,hold_hours
    ) VALUES (
      v_screening.tenant_id,v_creator,v_screening.id,'ticket',v_ticket.id,p_currency,
      p_amount_minor,greatest(0,p_amount_minor-v_fee_minor),'held',
      coalesce(v_screening.settlement_hold_hours,48)
    ) ON CONFLICT(source_type,source_id) DO NOTHING;
    SELECT release_at INTO v_release_at FROM public.event_settlement_holds
    WHERE source_type='ticket' AND source_id=v_ticket.id;
    INSERT INTO public.wallet_ledger(
      user_id,ticket_id,screening_id,gross,fee,net,currency,kind,settles_at
    ) VALUES (
      v_creator,v_ticket.id,v_screening.id,p_amount_major,
      least(p_amount_major,p_platform_fee_major),p_amount_major-least(p_amount_major,p_platform_fee_major),
      p_currency,'sale',coalesce(v_release_at,'infinity'::timestamptz)
    ) ON CONFLICT(ticket_id,kind)
      WHERE ticket_id IS NOT NULL AND kind IN ('sale','refund') DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success',true,'already_paid',false,'ticket_id',v_ticket.id,
    'ticket_code',v_ticket.ticket_code,'watch_code',v_ticket.watch_code,'balance_minor',v_balance);
END;
$function$


CREATE OR REPLACE FUNCTION public.purchase_personal_wallet_live_ticket(p_user_id uuid, p_screening_id uuid, p_stream_id uuid, p_ticket_type text, p_email text, p_amount_minor bigint, p_amount_major numeric, p_platform_fee_major numeric, p_currency text, p_reference text, p_early_bird_reserved boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_screening public.screenings%rowtype; v_stream public.live_streams%rowtype;
  v_order public.live_payment_orders%rowtype; v_ticket public.tickets%rowtype;
  v_creator uuid; v_balance bigint; v_fee_minor bigint; v_scale bigint; v_release_at timestamptz;
  v_from timestamptz; v_until timestamptz;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501';
  END IF;
  IF p_user_id IS NULL OR p_ticket_type NOT IN ('live','replay','combo') OR p_amount_minor<=0
     OR p_amount_major<=0 OR p_platform_fee_major<0 OR p_platform_fee_major>p_amount_major
     OR p_currency !~ '^[A-Z]{3}$' OR p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$'
     OR p_reference !~ '^DTVLW_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_wallet_live_ticket_order' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_order FROM public.live_payment_orders WHERE provider_reference=p_reference FOR UPDATE;
  IF FOUND THEN
    IF v_order.provider_mode<>'wallet' OR v_order.status<>'paid' THEN RAISE EXCEPTION 'wallet_order_reference_conflict'; END IF;
    SELECT * INTO v_ticket FROM public.tickets WHERE metadata->>'payment_reference'=p_reference ORDER BY created_at DESC LIMIT 1;
    RETURN jsonb_build_object('success',true,'already_paid',true,'ticket_id',v_ticket.id,'ticket_code',v_ticket.ticket_code,
      'balance_minor',(SELECT balance_minor FROM public.personal_wallet_accounts WHERE user_id=p_user_id AND currency=p_currency));
  END IF;
  SELECT * INTO v_screening FROM public.screenings WHERE id=p_screening_id AND status='published' FOR SHARE;
  SELECT * INTO v_stream FROM public.live_streams WHERE id=p_stream_id AND tenant_id=v_screening.tenant_id
    AND metadata @> jsonb_build_object('screening_id',p_screening_id::text) FOR SHARE;
  IF v_screening.id IS NULL OR v_stream.id IS NULL THEN RAISE EXCEPTION 'event_unavailable'; END IF;

  INSERT INTO public.personal_wallet_accounts(user_id,currency,balance_minor) VALUES(p_user_id,p_currency,0)
    ON CONFLICT(user_id,currency) DO NOTHING;
  SELECT balance_minor INTO v_balance FROM public.personal_wallet_accounts WHERE user_id=p_user_id AND currency=p_currency FOR UPDATE;
  IF v_balance<p_amount_minor THEN RAISE EXCEPTION 'insufficient_personal_wallet_funds' USING ERRCODE='22023'; END IF;
  UPDATE public.personal_wallet_accounts SET balance_minor=balance_minor-p_amount_minor,updated_at=now()
    WHERE user_id=p_user_id AND currency=p_currency RETURNING balance_minor INTO v_balance;

  v_from:=CASE WHEN p_ticket_type='replay' THEN coalesce(v_screening.live_replay_ready_at,now()) ELSE now() END;
  v_until:=CASE WHEN p_ticket_type='live' THEN greatest(coalesce(v_screening.screening_date,now())+interval '24 hours',now()+interval '1 hour')
    ELSE coalesce(v_screening.live_replay_ready_at,now())+make_interval(hours=>v_screening.replay_access_hours) END;

  INSERT INTO public.live_payment_orders(
    tenant_id,user_id,guest_checkout,screening_id,stream_id,ticket_type,provider,provider_reference,email,
    amount_minor,amount_major,platform_fee_major,currency,status,provider_mode,provider_transaction_id,paid_at,metadata
  ) VALUES (
    v_screening.tenant_id,p_user_id,false,v_screening.id,v_stream.id,p_ticket_type::public.ticket_type,
    'personal_wallet',p_reference,lower(trim(p_email)),p_amount_minor,p_amount_major,p_platform_fee_major,p_currency,
    'paid','wallet','personal-wallet:'||p_reference,now(),
    jsonb_build_object('created_from','viewer_checkout','guest_checkout',false,'provider_mode','wallet','early_bird_reserved',p_early_bird_reserved)
  );
  INSERT INTO public.tickets(user_id,tenant_id,content_id,stream_id,ticket_type,ticket_code,price,currency,valid_from,valid_until,guest_email,metadata)
  VALUES(p_user_id,v_screening.tenant_id,v_screening.content_id,v_stream.id,p_ticket_type::public.ticket_type,
    upper(substr(encode(extensions.gen_random_bytes(12),'hex'),1,16)),p_amount_major,p_currency,v_from,v_until,NULL,
    jsonb_build_object('payment_reference',p_reference,'provider','personal_wallet','transaction_id','personal-wallet:'||p_reference,
      'screening_id',v_screening.id,'guest',false,'early_bird_reserved',p_early_bird_reserved))
  RETURNING * INTO v_ticket;
  INSERT INTO public.personal_wallet_ledger(user_id,currency,entry_type,amount_minor,balance_after_minor,idempotency_key,reference,metadata)
  VALUES(p_user_id,p_currency,'ticket_debit',p_amount_minor,v_balance,'ticket:'||p_reference,p_reference,
    jsonb_build_object('ticket_source','live','ticket_id',v_ticket.id));

  SELECT c.creator_id INTO v_creator FROM public.content c WHERE c.id=v_screening.content_id;
  IF v_creator IS NOT NULL THEN
    v_scale:=CASE WHEN p_currency IN ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') THEN 1
      WHEN p_currency IN ('BHD','IQD','JOD','KWD','LYD','OMR','TND') THEN 1000 ELSE 100 END;
    v_fee_minor:=round(least(p_amount_major,p_platform_fee_major)*v_scale)::bigint;
    INSERT INTO public.event_settlement_holds(tenant_id,creator_id,screening_id,live_stream_id,source_type,source_id,currency,
      gross_amount_minor,net_amount_minor,hold_status,hold_hours,content_id)
    VALUES(v_screening.tenant_id,v_creator,v_screening.id,v_stream.id,'ticket',v_ticket.id,p_currency,p_amount_minor,
      greatest(0,p_amount_minor-v_fee_minor),'held',coalesce(v_screening.settlement_hold_hours,48),v_screening.content_id)
    ON CONFLICT(source_type,source_id) DO NOTHING;
    SELECT release_at INTO v_release_at FROM public.event_settlement_holds WHERE source_type='ticket' AND source_id=v_ticket.id;
    INSERT INTO public.wallet_ledger(user_id,ticket_id,screening_id,gross,fee,net,currency,kind,settles_at)
    VALUES(v_creator,v_ticket.id,v_screening.id,p_amount_major,least(p_amount_major,p_platform_fee_major),
      p_amount_major-least(p_amount_major,p_platform_fee_major),p_currency,'sale',coalesce(v_release_at,'infinity'::timestamptz))
    ON CONFLICT(ticket_id,kind) WHERE ticket_id IS NOT NULL AND kind IN ('sale','refund') DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success',true,'already_paid',false,'ticket_id',v_ticket.id,'ticket_code',v_ticket.ticket_code,'balance_minor',v_balance);
END;
$function$


CREATE OR REPLACE FUNCTION public.refund_personal_wallet_ticket(p_ticket_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_screening public.screening_tickets%rowtype;
  v_live public.tickets%rowtype;
  v_order public.guest_payment_orders%rowtype;
  v_live_order public.live_payment_orders%rowtype;
  v_user uuid;
  v_currency text;
  v_amount bigint;
  v_balance bigint;
  v_reference text;
  v_is_live boolean := false;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501';
  END IF;
  IF p_ticket_id IS NULL OR length(trim(coalesce(p_reason,'')))<3 THEN
    RAISE EXCEPTION 'invalid_refund_request' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_screening FROM public.screening_tickets WHERE id=p_ticket_id FOR UPDATE;
  IF FOUND THEN
    SELECT * INTO v_order FROM public.guest_payment_orders WHERE ticket_id=p_ticket_id FOR UPDATE;
    IF NOT FOUND OR v_order.provider_mode<>'wallet' THEN RAISE EXCEPTION 'not_a_wallet_ticket'; END IF;
    v_user:=v_screening.user_id; v_currency:=v_order.currency; v_amount:=v_order.amount_minor; v_reference:=v_order.provider_reference;
    IF v_screening.refunded_at IS NOT NULL OR v_order.status='refunded' THEN
      SELECT balance_minor INTO v_balance FROM public.personal_wallet_accounts WHERE user_id=v_user AND currency=v_currency;
      RETURN jsonb_build_object('success',true,'already_refunded',true,'balance_minor',v_balance);
    END IF;
    IF v_order.status<>'paid' OR v_screening.payment_status<>'completed' OR v_user IS NULL THEN
      RAISE EXCEPTION 'wallet_ticket_not_paid';
    END IF;
    UPDATE public.screening_tickets SET payment_status='refunded',refunded_at=now(),refund_reason=p_reason WHERE id=p_ticket_id;
    UPDATE public.guest_payment_orders SET status='refunded',updated_at=now() WHERE id=v_order.id;
  ELSE
    SELECT * INTO v_live FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ticket_not_found'; END IF;
    v_reference:=v_live.metadata->>'payment_reference';
    SELECT * INTO v_live_order FROM public.live_payment_orders WHERE provider_reference=v_reference FOR UPDATE;
    IF NOT FOUND OR v_live_order.provider_mode<>'wallet' THEN RAISE EXCEPTION 'not_a_wallet_ticket'; END IF;
    v_is_live:=true; v_user:=v_live.user_id; v_currency:=v_live_order.currency; v_amount:=v_live_order.amount_minor;
    IF v_live.revoked_at IS NOT NULL OR v_live_order.status='refunded' THEN
      SELECT balance_minor INTO v_balance FROM public.personal_wallet_accounts WHERE user_id=v_user AND currency=v_currency;
      RETURN jsonb_build_object('success',true,'already_refunded',true,'balance_minor',v_balance);
    END IF;
    IF v_live_order.status<>'paid' OR v_user IS NULL THEN RAISE EXCEPTION 'wallet_ticket_not_paid'; END IF;
    UPDATE public.tickets SET revoked_at=now(),revocation_reason=p_reason WHERE id=p_ticket_id;
    UPDATE public.live_payment_orders SET status='refunded',updated_at=now() WHERE id=v_live_order.id;
  END IF;

  INSERT INTO public.personal_wallet_accounts(user_id,currency,balance_minor)
  VALUES(v_user,v_currency,0) ON CONFLICT(user_id,currency) DO NOTHING;
  UPDATE public.personal_wallet_accounts SET balance_minor=balance_minor+v_amount,updated_at=now()
  WHERE user_id=v_user AND currency=v_currency RETURNING balance_minor INTO v_balance;
  INSERT INTO public.personal_wallet_ledger(
    user_id,currency,entry_type,amount_minor,balance_after_minor,idempotency_key,reference,metadata
  ) VALUES (
    v_user,v_currency,'refund_credit',v_amount,v_balance,'ticket-refund:'||p_ticket_id::text,
    v_reference,jsonb_build_object('ticket_id',p_ticket_id,'reason',p_reason)
  ) ON CONFLICT(idempotency_key) DO NOTHING;

  INSERT INTO public.wallet_ledger(user_id,ticket_id,screening_id,gross,fee,net,currency,kind,settles_at)
  SELECT user_id,ticket_id,screening_id,-gross,-fee,-net,currency,'refund',now()
  FROM public.wallet_ledger WHERE ticket_id=p_ticket_id AND kind='sale'
  ON CONFLICT(ticket_id,kind) WHERE ticket_id IS NOT NULL AND kind IN ('sale','refund') DO NOTHING;
  UPDATE public.event_settlement_holds SET hold_status='refunded',updated_at=now()
  WHERE source_type='ticket' AND source_id=p_ticket_id AND hold_status IN ('held','eligible','blocked');

  RETURN jsonb_build_object('success',true,'already_refunded',false,'balance_minor',v_balance,'live_ticket',v_is_live);
END;
$function$



REVOKE ALL ON FUNCTION public.purchase_personal_wallet_screening_ticket(uuid,uuid,text,bigint,numeric,numeric,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purchase_personal_wallet_live_ticket(uuid,uuid,uuid,text,text,bigint,numeric,numeric,text,text,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_personal_wallet_ticket(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_personal_wallet_screening_ticket(uuid,uuid,text,bigint,numeric,numeric,text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.purchase_personal_wallet_live_ticket(uuid,uuid,uuid,text,text,bigint,numeric,numeric,text,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_personal_wallet_ticket(uuid,text) TO service_role;
