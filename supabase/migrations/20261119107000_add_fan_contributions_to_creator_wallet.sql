ALTER TABLE public.wallet_ledger
  ADD COLUMN IF NOT EXISTS contribution_id uuid REFERENCES public.event_contributions(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_contribution_unique
  ON public.wallet_ledger(contribution_id) WHERE contribution_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_event_settlement_to_wallet_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_settles_at timestamptz;
BEGIN
  IF NEW.hold_status IN ('refunded','paid') THEN
    v_settles_at := now();
  ELSIF NEW.hold_status IN ('disputed','blocked') OR NEW.release_at IS NULL THEN
    v_settles_at := 'infinity'::timestamptz;
  ELSE
    v_settles_at := NEW.release_at;
  END IF;
  IF NEW.source_type='ticket' THEN
    UPDATE public.wallet_ledger SET settles_at=v_settles_at WHERE ticket_id=NEW.source_id AND kind='sale';
  ELSIF NEW.source_type IN ('tip','gift') THEN
    UPDATE public.wallet_ledger SET settles_at=v_settles_at WHERE contribution_id=NEW.source_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_event_contribution_settlement_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_creator uuid; v_tenant uuid; v_fee_rate numeric:=0; v_fee_minor bigint:=0;
  v_hold_hours integer:=48; v_release_at timestamptz; v_fee_major numeric:=0;
BEGIN
 IF NEW.status IS DISTINCT FROM 'paid' OR (TG_OP='UPDATE' AND OLD.status='paid') THEN RETURN NEW; END IF;
 IF NEW.screening_id IS NOT NULL THEN
  SELECT c.creator_id,s.tenant_id,s.settlement_hold_hours INTO v_creator,v_tenant,v_hold_hours
   FROM public.screenings s JOIN public.content c ON c.id=s.content_id WHERE s.id=NEW.screening_id;
 ELSIF NEW.live_stream_id IS NOT NULL THEN
  SELECT l.creator_id,l.tenant_id,l.settlement_hold_hours INTO v_creator,v_tenant,v_hold_hours
   FROM public.live_streams l WHERE l.id=NEW.live_stream_id;
 ELSE
  SELECT creator_id,tenant_id INTO v_creator,v_tenant FROM public.content WHERE id=NEW.content_id AND status='published';
 END IF;
 IF v_creator IS NULL OR v_creator<>NEW.creator_id OR v_tenant<>NEW.tenant_id THEN
  RAISE EXCEPTION 'contribution_event_owner_mismatch' USING ERRCODE='42501';
 END IF;
 SELECT coalesce((setting_value->>'creator')::numeric,0)
  INTO v_fee_rate FROM public.platform_settings WHERE setting_key='commission_rates';
 IF v_fee_rate<0 OR v_fee_rate>0.5 THEN RAISE EXCEPTION 'creator_commission_policy_invalid'; END IF;
 v_fee_major:=coalesce(NEW.platform_fee_major,round(coalesce(NEW.amount_major,0)*v_fee_rate,6));
 IF NEW.amount_major IS NOT NULL AND NEW.amount_major>0 THEN
  v_fee_minor:=round(NEW.amount_minor*v_fee_major/NEW.amount_major);
 ELSE
  v_fee_minor:=round(NEW.amount_minor*v_fee_rate);
 END IF;
 INSERT INTO public.event_settlement_holds(
  tenant_id,creator_id,screening_id,live_stream_id,content_id,source_type,source_id,
  currency,gross_amount_minor,net_amount_minor,hold_hours
 ) VALUES (
  NEW.tenant_id,NEW.creator_id,NEW.screening_id,NEW.live_stream_id,NEW.content_id,
  NEW.contribution_type,NEW.id,NEW.currency,NEW.amount_minor,
  greatest(0,NEW.amount_minor-v_fee_minor),coalesce(v_hold_hours,48)
 ) ON CONFLICT(source_type,source_id) DO NOTHING;

 SELECT release_at INTO v_release_at FROM public.event_settlement_holds
  WHERE source_type=NEW.contribution_type AND source_id=NEW.id;
 IF NEW.amount_major IS NOT NULL THEN
  INSERT INTO public.wallet_ledger(
   user_id,ticket_id,contribution_id,screening_id,gross,fee,net,currency,kind,settles_at
  ) VALUES (
   NEW.creator_id,NULL,NEW.id,NEW.screening_id,NEW.amount_major,v_fee_major,
   greatest(0,NEW.amount_major-v_fee_major),NEW.currency,NEW.contribution_type,
   coalesce(v_release_at,'infinity'::timestamptz)
  ) ON CONFLICT(contribution_id) WHERE contribution_id IS NOT NULL DO NOTHING;
 END IF;
 RETURN NEW;
END;
$$;
