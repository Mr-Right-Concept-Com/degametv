CREATE OR REPLACE FUNCTION public.ensure_screening_live_stream(p_screening_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
 v_screening public.screenings%ROWTYPE;
 v_creator uuid;
 v_stream_id uuid;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_screening FROM public.screenings WHERE id=p_screening_id AND status='published' FOR UPDATE;
 IF NOT FOUND OR v_screening.event_type<>'live' THEN RAISE EXCEPTION 'published_live_screening_required'; END IF;
 SELECT creator_id INTO v_creator FROM public.content WHERE id=v_screening.content_id AND tenant_id=v_screening.tenant_id;
 IF v_creator IS NULL THEN RAISE EXCEPTION 'screening_creator_unavailable'; END IF;

 SELECT id INTO v_stream_id FROM public.live_streams
 WHERE tenant_id=v_screening.tenant_id AND metadata->>'screening_id'=v_screening.id::text
 ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

 IF v_stream_id IS NULL THEN
  INSERT INTO public.live_streams(
   tenant_id,creator_id,title,description,thumbnail_url,status,lifecycle_status,monetization,is_ticketed,
   scheduled_start,recording_enabled,chat_enabled,ticket_price,currency,metadata,
   sales_open_at,sales_close_at,early_bird_price,early_bird_currency,early_bird_ends_at,
   early_bird_capacity,event_visibility,invite_only,ticket_capacity,settlement_hold_hours,
   settlement_delivery_required,event_timezone,presale_enabled
  ) VALUES (
   v_screening.tenant_id,v_creator,v_screening.title,v_screening.description,v_screening.poster_url,
   'scheduled','SCHEDULED',
   CASE WHEN upper(coalesce(v_screening.access_model,''))='FREE' THEN 'free'::public.monetization_type ELSE 'ticket'::public.monetization_type END,
   upper(coalesce(v_screening.access_model,''))<>'FREE',
   v_screening.screening_date,true,true,v_screening.base_price,v_screening.base_currency,
   jsonb_build_object('screening_id',v_screening.id,'content_id',v_screening.content_id,'source','creator_screening'),
   v_screening.sales_open_at,v_screening.sales_close_at,v_screening.early_bird_price,v_screening.early_bird_currency,
   v_screening.early_bird_ends_at,v_screening.early_bird_capacity,v_screening.event_visibility,
   v_screening.invite_only,v_screening.ticket_capacity,v_screening.settlement_hold_hours,
   v_screening.settlement_delivery_required,v_screening.event_timezone,v_screening.presale_enabled
  ) RETURNING id INTO v_stream_id;
 ELSE
  UPDATE public.live_streams SET
   title=v_screening.title,description=v_screening.description,
   lifecycle_status=CASE WHEN status='scheduled' THEN 'SCHEDULED'::public.broadcast_lifecycle_status ELSE lifecycle_status END,
   thumbnail_url=coalesce(v_screening.poster_url,thumbnail_url),
   scheduled_start=CASE WHEN status='scheduled' THEN v_screening.screening_date ELSE scheduled_start END,
   monetization=CASE WHEN upper(coalesce(v_screening.access_model,''))='FREE' THEN 'free'::public.monetization_type ELSE 'ticket'::public.monetization_type END,
   is_ticketed=upper(coalesce(v_screening.access_model,''))<>'FREE',
   ticket_price=v_screening.base_price,currency=v_screening.base_currency,
   metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('screening_id',v_screening.id,'content_id',v_screening.content_id),
   sales_open_at=v_screening.sales_open_at,sales_close_at=v_screening.sales_close_at,
   early_bird_price=v_screening.early_bird_price,early_bird_currency=v_screening.early_bird_currency,
   early_bird_ends_at=v_screening.early_bird_ends_at,early_bird_capacity=v_screening.early_bird_capacity,
   event_visibility=v_screening.event_visibility,invite_only=v_screening.invite_only,
   ticket_capacity=v_screening.ticket_capacity,settlement_hold_hours=v_screening.settlement_hold_hours,
   settlement_delivery_required=v_screening.settlement_delivery_required,event_timezone=v_screening.event_timezone,
   presale_enabled=v_screening.presale_enabled,updated_at=now()
  WHERE id=v_stream_id;
 END IF;
 RETURN v_stream_id;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_screening_live_stream(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_screening_live_stream(uuid) TO service_role;
