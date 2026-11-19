ALTER TABLE public.event_access_invites
  ADD COLUMN IF NOT EXISTS complimentary_ticket_id uuid,
  ADD COLUMN IF NOT EXISTS complimentary_ticket_type text;

ALTER TABLE public.event_access_invites DROP CONSTRAINT IF EXISTS event_access_invites_complimentary_ticket_type_check;
ALTER TABLE public.event_access_invites ADD CONSTRAINT event_access_invites_complimentary_ticket_type_check
  CHECK (complimentary_ticket_type IS NULL OR complimentary_ticket_type IN ('live_ticket','screening_ticket'));
CREATE UNIQUE INDEX IF NOT EXISTS event_access_invites_complimentary_ticket_unique
  ON public.event_access_invites(complimentary_ticket_id) WHERE complimentary_ticket_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.accept_event_invitation(p_invite_id uuid,p_user_id uuid,p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_invite public.event_access_invites%ROWTYPE;
  v_screening public.screenings%ROWTYPE;
  v_user_email text;
  v_stream_id uuid;
  v_ticket_id uuid;
  v_ticket_type text;
  v_ticket_code text;
  v_watch_code text;
  v_currency text;
  v_valid_from timestamptz;
  v_valid_until timestamptz;
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501'; END IF;
  SELECT email INTO v_user_email FROM auth.users
   WHERE id=p_user_id AND email_confirmed_at IS NOT NULL;
  IF v_user_email IS NULL OR lower(v_user_email)<>lower(trim(p_email)) THEN
    RAISE EXCEPTION 'verified_invited_email_required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_invite FROM public.event_access_invites WHERE id=p_invite_id FOR UPDATE;
  IF NOT FOUND OR v_invite.status IN ('revoked','expired') OR
     (v_invite.expires_at IS NOT NULL AND v_invite.expires_at<=now()) OR
     lower(v_invite.invited_email)<>lower(v_user_email) THEN
    RAISE EXCEPTION 'invitation_invalid_or_expired' USING ERRCODE='42501';
  END IF;
  IF v_invite.screening_id IS NULL THEN RAISE EXCEPTION 'screening_invitation_required'; END IF;
  SELECT * INTO v_screening FROM public.screenings
   WHERE id=v_invite.screening_id AND status='published' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'screening_unavailable'; END IF;

  IF v_invite.complimentary_ticket_id IS NOT NULL THEN
    UPDATE public.event_access_invites SET status='accepted',accepted_at=coalesce(accepted_at,now()),invited_user_id=p_user_id WHERE id=v_invite.id;
    RETURN jsonb_build_object('accepted',true,'ticket_issued',true,'ticket_id',v_invite.complimentary_ticket_id,'ticket_type',v_invite.complimentary_ticket_type,'already_issued',true);
  END IF;

  IF upper(coalesce(v_screening.access_model,''))='FREE' THEN
    v_ticket_code:=upper(substr(encode(gen_random_bytes(12),'hex'),1,16));
    v_watch_code:=encode(gen_random_bytes(24),'hex');
    v_currency:=upper(coalesce(nullif(v_screening.base_currency,''),'NGN'));
    IF v_currency !~ '^[A-Z]{3}$' THEN RAISE EXCEPTION 'screening_currency_invalid'; END IF;

    IF v_screening.event_type='live' THEN
      SELECT id INTO v_stream_id FROM public.live_streams
       WHERE tenant_id=v_screening.tenant_id AND metadata->>'screening_id'=v_screening.id::text
       ORDER BY created_at DESC LIMIT 1;
      IF v_stream_id IS NULL THEN RAISE EXCEPTION 'live_stream_not_provisioned'; END IF;
      IF v_screening.lifecycle='replay' THEN
        IF v_screening.live_replay_ready_at IS NULL THEN RAISE EXCEPTION 'replay_not_ready'; END IF;
        v_ticket_type:='replay'; v_valid_from:=now();
        v_valid_until:=v_screening.live_replay_ready_at+make_interval(hours=>v_screening.replay_access_hours);
      ELSE
        v_ticket_type:='live'; v_valid_from:=coalesce(v_screening.screening_date,now());
        v_valid_until:=coalesce(v_screening.live_ended_at,v_screening.screening_date+interval '24 hours',now()+interval '24 hours');
      END IF;
      INSERT INTO public.tickets(user_id,tenant_id,content_id,stream_id,ticket_type,ticket_code,price,currency,valid_from,valid_until,metadata)
      VALUES(p_user_id,v_screening.tenant_id,v_screening.content_id,v_stream_id,v_ticket_type,v_ticket_code,0,v_currency,v_valid_from,v_valid_until,
        jsonb_build_object('screening_id',v_screening.id,'invitation_id',v_invite.id,'complimentary',true,'source','private_screening_invitation'))
      RETURNING id INTO v_ticket_id;
      UPDATE public.event_access_invites SET status='accepted',accepted_at=now(),invited_user_id=p_user_id,
        complimentary_ticket_id=v_ticket_id,complimentary_ticket_type='live_ticket' WHERE id=v_invite.id;
      RETURN jsonb_build_object('accepted',true,'ticket_issued',true,'ticket_id',v_ticket_id,'ticket_type','live_ticket');
    ELSE
      IF v_screening.lifecycle='replay' AND v_screening.live_replay_ready_at IS NULL THEN RAISE EXCEPTION 'replay_not_ready'; END IF;
      v_valid_until:=CASE WHEN v_screening.lifecycle='replay'
        THEN v_screening.live_replay_ready_at+make_interval(hours=>v_screening.replay_access_hours)
        ELSE coalesce(v_screening.screening_date+interval '24 hours',now()+interval '24 hours') END;
      INSERT INTO public.screening_tickets(
        tenant_id,screening_id,user_id,email,location,price,currency,ticket_code,watch_code,
        expires_at,payment_status,ticket_kind
      ) VALUES(
        v_screening.tenant_id,v_screening.id,p_user_id,lower(v_user_email),'private-invitation',0,v_currency,
        v_ticket_code,v_watch_code,v_valid_until,'completed',CASE WHEN v_screening.lifecycle='replay' THEN 'replay' ELSE 'live' END
      ) RETURNING id INTO v_ticket_id;
      UPDATE public.event_access_invites SET status='accepted',accepted_at=now(),invited_user_id=p_user_id,
        complimentary_ticket_id=v_ticket_id,complimentary_ticket_type='screening_ticket' WHERE id=v_invite.id;
      RETURN jsonb_build_object('accepted',true,'ticket_issued',true,'ticket_id',v_ticket_id,'ticket_type','screening_ticket','watch_code',v_watch_code);
    END IF;
  END IF;

  UPDATE public.event_access_invites SET status='accepted',accepted_at=coalesce(accepted_at,now()),invited_user_id=p_user_id WHERE id=v_invite.id;
  RETURN jsonb_build_object('accepted',true,'ticket_issued',false,'ticket_required',true);
END;
$$;
REVOKE ALL ON FUNCTION public.accept_event_invitation(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accept_event_invitation(uuid,uuid,text) TO service_role;
