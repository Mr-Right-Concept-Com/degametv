ALTER TABLE public.screenings
  ADD COLUMN IF NOT EXISTS base_price numeric,
  ADD COLUMN IF NOT EXISTS base_currency text,
  ADD COLUMN IF NOT EXISTS replay_base_price numeric;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.screenings'::regclass AND conname='screenings_base_price_nonnegative') THEN
  ALTER TABLE public.screenings ADD CONSTRAINT screenings_base_price_nonnegative CHECK(base_price IS NULL OR base_price>=0);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.screenings'::regclass AND conname='screenings_replay_base_price_nonnegative') THEN
  ALTER TABLE public.screenings ADD CONSTRAINT screenings_replay_base_price_nonnegative CHECK(replay_base_price IS NULL OR replay_base_price>=0);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.screenings'::regclass AND conname='screenings_base_currency_iso') THEN
  ALTER TABLE public.screenings ADD CONSTRAINT screenings_base_currency_iso CHECK(base_currency IS NULL OR base_currency ~ '^[A-Z]{3}$');
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_screening_access_model()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $function$
BEGIN
 NEW.access_model := CASE
  WHEN NEW.base_price IS NOT NULL THEN CASE WHEN NEW.base_price=0 THEN 'FREE' ELSE 'TICKETED' END
  WHEN coalesce(NEW.live_price_ngn,0)=0 AND coalesce(NEW.live_price_usd,0)=0 THEN 'FREE'
  ELSE 'TICKETED' END;
 RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS screenings_access_model_from_price ON public.screenings;
CREATE TRIGGER screenings_access_model_from_price
 BEFORE INSERT OR UPDATE OF live_price_ngn,live_price_usd,base_price
 ON public.screenings FOR EACH ROW EXECUTE FUNCTION public.set_screening_access_model();

CREATE OR REPLACE FUNCTION public.create_creator_screening(
 p_content_id uuid,p_screening_date timestamptz,p_location_pricing jsonb,p_event_type text,p_slug text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
DECLARE
 v_user uuid:=auth.uid();
 v_content public.content%rowtype;
 v_slug text;
 v_screening uuid;
 v_ngn numeric;
 v_usd numeric;
 v_base numeric;
 v_currency text;
 v_platform_base text;
 v_publication jsonb;
BEGIN
 IF v_user IS NULL OR NOT public.is_approved_creator(v_user) THEN RAISE EXCEPTION 'approved_creator_required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_content FROM public.content WHERE id=p_content_id AND creator_id=v_user AND status IN ('draft','published') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'creator_owned_content_required'; END IF;
 IF p_event_type NOT IN ('film','series','live') OR (p_event_type='film' AND v_content.type::text NOT IN ('movie','film')) OR (p_event_type='series' AND v_content.type<>'series') OR (p_event_type='live' AND v_content.type<>'live') THEN RAISE EXCEPTION 'content_event_type_mismatch'; END IF;
 IF p_screening_date IS NOT NULL AND p_screening_date<now()+interval '15 minutes' THEN RAISE EXCEPTION 'screening_date_too_soon'; END IF;
 IF jsonb_typeof(p_location_pricing)<>'object' THEN RAISE EXCEPTION 'valid_pricing_required'; END IF;
 v_base:=nullif(p_location_pricing->>'base','')::numeric;
 v_currency:=upper(coalesce(nullif(p_location_pricing->>'currency',''),''));
 IF v_base IS NOT NULL THEN
  SELECT upper(coalesce(setting_value#>>'{}','')) INTO v_platform_base FROM public.platform_settings WHERE setting_key='base_currency';
  IF v_base<0 OR v_currency !~ '^[A-Z]{3}$' OR v_currency IS DISTINCT FROM v_platform_base THEN
   RAISE EXCEPTION 'creator_price_must_use_current_platform_base_currency' USING ERRCODE='22023';
  END IF;
 ELSE
  v_ngn:=nullif(p_location_pricing->>'nigeria','')::numeric;
  v_usd:=nullif(p_location_pricing->>'international','')::numeric;
  IF v_ngn IS NULL OR v_ngn<0 OR v_usd IS NULL OR v_usd<0 THEN RAISE EXCEPTION 'valid_location_pricing_required'; END IF;
 END IF;
 v_slug:=trim(both '-' from lower(regexp_replace(trim(p_slug),'[^a-zA-Z0-9-]+','-','g')));
 IF length(v_slug)<3 OR length(v_slug)>100 THEN RAISE EXCEPTION 'invalid_slug'; END IF;
 IF EXISTS(SELECT 1 FROM public.screenings WHERE slug=v_slug) THEN v_slug:=left(v_slug,80)||'-'||substr(gen_random_uuid()::text,1,8); END IF;
 INSERT INTO public.screenings(
  tenant_id,content_id,title,description,slug,poster_url,trailer_url,release_date,screening_date,duration,
  location_pricing,status,lifecycle,event_type,live_price_ngn,live_price_usd,base_price,base_currency
 ) VALUES(
  v_content.tenant_id,v_content.id,v_content.title,v_content.description,v_slug,v_content.poster_url,v_content.trailer_url,
  p_screening_date,p_screening_date,v_content.duration,p_location_pricing,'published','upcoming',p_event_type,
  v_ngn,v_usd,v_base,v_currency
 ) RETURNING id INTO v_screening;
 IF v_content.status='draft' THEN
  v_publication:=public.publish_creator_content(v_content.id);
  IF v_publication->>'status'<>'published' THEN RAISE EXCEPTION 'live_content_publication_failed'; END IF;
 END IF;
 INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,new_data)
 VALUES(v_user,'creator.screening.created','screening',v_screening,
  jsonb_build_object('content_id',v_content.id,'event_type',p_event_type,'slug',v_slug,'base_price',v_base,'base_currency',v_currency,'legacy_live_price_ngn',v_ngn,'legacy_live_price_usd',v_usd));
 RETURN jsonb_build_object('screening_id',v_screening,'slug',v_slug,'status','published','content_status','published','base_price',v_base,'base_currency',v_currency);
END;
$function$;
REVOKE ALL ON FUNCTION public.create_creator_screening(uuid,timestamptz,jsonb,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_creator_screening(uuid,timestamptz,jsonb,text,text) TO authenticated;