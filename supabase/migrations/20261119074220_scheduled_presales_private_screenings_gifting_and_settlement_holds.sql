ALTER TABLE public.screenings
 ADD COLUMN IF NOT EXISTS sales_open_at timestamptz,
 ADD COLUMN IF NOT EXISTS sales_close_at timestamptz,
 ADD COLUMN IF NOT EXISTS early_bird_price numeric,
 ADD COLUMN IF NOT EXISTS early_bird_currency text,
 ADD COLUMN IF NOT EXISTS early_bird_ends_at timestamptz,
 ADD COLUMN IF NOT EXISTS early_bird_capacity integer,
 ADD COLUMN IF NOT EXISTS event_visibility text NOT NULL DEFAULT 'public',
 ADD COLUMN IF NOT EXISTS invite_only boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS release_access_at timestamptz,
 ADD COLUMN IF NOT EXISTS settlement_hold_hours integer NOT NULL DEFAULT 48,
 ADD COLUMN IF NOT EXISTS settlement_delivery_required boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS event_timezone text NOT NULL DEFAULT 'UTC',
 ADD COLUMN IF NOT EXISTS presale_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.live_streams
 ADD COLUMN IF NOT EXISTS sales_open_at timestamptz,
 ADD COLUMN IF NOT EXISTS sales_close_at timestamptz,
 ADD COLUMN IF NOT EXISTS early_bird_price numeric,
 ADD COLUMN IF NOT EXISTS early_bird_currency text,
 ADD COLUMN IF NOT EXISTS early_bird_ends_at timestamptz,
 ADD COLUMN IF NOT EXISTS early_bird_capacity integer,
 ADD COLUMN IF NOT EXISTS event_visibility text NOT NULL DEFAULT 'public',
 ADD COLUMN IF NOT EXISTS invite_only boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS settlement_hold_hours integer NOT NULL DEFAULT 48,
 ADD COLUMN IF NOT EXISTS settlement_delivery_required boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS event_timezone text NOT NULL DEFAULT 'UTC',
 ADD COLUMN IF NOT EXISTS presale_enabled boolean NOT NULL DEFAULT true;

DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.screenings'::regclass AND conname='screenings_event_visibility_valid') THEN
  ALTER TABLE public.screenings ADD CONSTRAINT screenings_event_visibility_valid CHECK(event_visibility IN ('public','unlisted','private','invite_only'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.screenings'::regclass AND conname='screenings_early_bird_valid') THEN
  ALTER TABLE public.screenings ADD CONSTRAINT screenings_early_bird_valid CHECK((early_bird_price IS NULL OR early_bird_price>=0) AND (early_bird_capacity IS NULL OR early_bird_capacity>0) AND (early_bird_currency IS NULL OR early_bird_currency ~ '^[A-Z]{3}$') AND settlement_hold_hours BETWEEN 24 AND 72);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.live_streams'::regclass AND conname='live_streams_event_visibility_valid') THEN
  ALTER TABLE public.live_streams ADD CONSTRAINT live_streams_event_visibility_valid CHECK(event_visibility IN ('public','unlisted','private','invite_only'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.live_streams'::regclass AND conname='live_streams_early_bird_valid') THEN
  ALTER TABLE public.live_streams ADD CONSTRAINT live_streams_early_bird_valid CHECK((early_bird_price IS NULL OR early_bird_price>=0) AND (early_bird_capacity IS NULL OR early_bird_capacity>0) AND (early_bird_currency IS NULL OR early_bird_currency ~ '^[A-Z]{3}$') AND settlement_hold_hours BETWEEN 24 AND 72);
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.event_access_invites(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 screening_id uuid REFERENCES public.screenings(id) ON DELETE CASCADE,
 live_stream_id uuid REFERENCES public.live_streams(id) ON DELETE CASCADE,
 invited_email text NOT NULL,
 invited_user_id uuid,
 invite_role text NOT NULL DEFAULT 'guest' CHECK(invite_role IN ('guest','press','reviewer','vip','crew')),
 token_hash text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','accepted','revoked','expired')),
 invited_by uuid NOT NULL,
 expires_at timestamptz,
 accepted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((screening_id IS NOT NULL)::int + (live_stream_id IS NOT NULL)::int = 1)
);
CREATE INDEX IF NOT EXISTS event_access_invites_screening_idx ON public.event_access_invites(screening_id,status);
CREATE INDEX IF NOT EXISTS event_access_invites_live_idx ON public.event_access_invites(live_stream_id,status);
CREATE INDEX IF NOT EXISTS event_access_invites_email_idx ON public.event_access_invites(lower(invited_email));

CREATE TABLE IF NOT EXISTS public.event_contributions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 creator_id uuid NOT NULL,
 screening_id uuid REFERENCES public.screenings(id) ON DELETE CASCADE,
 live_stream_id uuid REFERENCES public.live_streams(id) ON DELETE CASCADE,
 contributor_user_id uuid,
 contributor_name text,
 contributor_email text,
 contribution_type text NOT NULL CHECK(contribution_type IN ('tip','gift')),
 gift_catalog_key text,
 message text,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 provider_key text,
 provider_reference text UNIQUE,
 provider_transaction_id text,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','refunded','disputed')),
 is_anonymous boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 paid_at timestamptz,
 CHECK ((screening_id IS NOT NULL)::int + (live_stream_id IS NOT NULL)::int = 1)
);
CREATE INDEX IF NOT EXISTS event_contributions_creator_date_idx ON public.event_contributions(creator_id,created_at DESC);
CREATE INDEX IF NOT EXISTS event_contributions_screening_idx ON public.event_contributions(screening_id,status);
CREATE INDEX IF NOT EXISTS event_contributions_live_idx ON public.event_contributions(live_stream_id,status);

CREATE TABLE IF NOT EXISTS public.event_settlement_holds(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 creator_id uuid NOT NULL,
 screening_id uuid REFERENCES public.screenings(id) ON DELETE CASCADE,
 live_stream_id uuid REFERENCES public.live_streams(id) ON DELETE CASCADE,
 source_type text NOT NULL CHECK(source_type IN ('ticket','tip','gift','sponsorship','vod')),
 source_id uuid NOT NULL,
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 gross_amount_minor bigint NOT NULL CHECK(gross_amount_minor>=0),
 net_amount_minor bigint NOT NULL CHECK(net_amount_minor>=0),
 hold_status text NOT NULL DEFAULT 'held' CHECK(hold_status IN ('held','eligible','paid','refunded','disputed','blocked')),
 event_ended_at timestamptz,
 delivery_confirmed_at timestamptz,
 release_at timestamptz,
 hold_hours integer NOT NULL DEFAULT 48 CHECK(hold_hours BETWEEN 24 AND 72),
 delivery_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 released_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((screening_id IS NOT NULL)::int + (live_stream_id IS NOT NULL)::int = 1),
 UNIQUE(source_type,source_id)
);
CREATE INDEX IF NOT EXISTS event_settlement_holds_creator_idx ON public.event_settlement_holds(creator_id,hold_status,release_at);
CREATE INDEX IF NOT EXISTS event_settlement_holds_release_idx ON public.event_settlement_holds(hold_status,release_at);

CREATE TABLE IF NOT EXISTS public.event_notification_outbox(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 screening_id uuid REFERENCES public.screenings(id) ON DELETE CASCADE,
 live_stream_id uuid REFERENCES public.live_streams(id) ON DELETE CASCADE,
 recipient_email text NOT NULL,
 recipient_user_id uuid,
 notification_type text NOT NULL CHECK(notification_type IN ('ticket_confirmation','early_bird_access','event_reminder','event_started','private_invitation','event_cancelled','replay_ready','refund_update')),
 idempotency_key text NOT NULL UNIQUE,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed','cancelled')),
 scheduled_for timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0,
 last_error text,
 sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((screening_id IS NOT NULL)::int + (live_stream_id IS NOT NULL)::int = 1)
);
CREATE INDEX IF NOT EXISTS event_notification_outbox_due_idx ON public.event_notification_outbox(status,scheduled_for) WHERE status IN ('pending','failed');

ALTER TABLE public.event_access_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_settlement_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_access_invites_creator_read ON public.event_access_invites;
CREATE POLICY event_access_invites_creator_read ON public.event_access_invites FOR SELECT TO authenticated
 USING (invited_by=(select auth.uid()) OR EXISTS(SELECT 1 FROM public.screenings s JOIN public.content c ON c.id=s.content_id WHERE s.id=screening_id AND c.creator_id=(select auth.uid())) OR EXISTS(SELECT 1 FROM public.live_streams l WHERE l.id=live_stream_id AND l.creator_id=(select auth.uid())));
DROP POLICY IF EXISTS event_contributions_creator_read ON public.event_contributions;
CREATE POLICY event_contributions_creator_read ON public.event_contributions FOR SELECT TO authenticated
 USING (creator_id=(select auth.uid()));
DROP POLICY IF EXISTS event_settlement_holds_creator_read ON public.event_settlement_holds;
CREATE POLICY event_settlement_holds_creator_read ON public.event_settlement_holds FOR SELECT TO authenticated
 USING (creator_id=(select auth.uid()));
DROP POLICY IF EXISTS event_notification_outbox_creator_read ON public.event_notification_outbox;
CREATE POLICY event_notification_outbox_creator_read ON public.event_notification_outbox FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.screenings s JOIN public.content c ON c.id=s.content_id WHERE s.id=screening_id AND c.creator_id=(select auth.uid())) OR EXISTS(SELECT 1 FROM public.live_streams l WHERE l.id=live_stream_id AND l.creator_id=(select auth.uid())));

REVOKE ALL ON public.event_access_invites,public.event_contributions,public.event_settlement_holds,public.event_notification_outbox FROM anon,authenticated;
GRANT SELECT ON public.event_access_invites,public.event_contributions,public.event_settlement_holds,public.event_notification_outbox TO authenticated;
GRANT ALL ON public.event_access_invites,public.event_contributions,public.event_settlement_holds,public.event_notification_outbox TO service_role;
GRANT SELECT ON public.event_access_invites,public.event_contributions,public.event_settlement_holds,public.event_notification_outbox TO service_role;

CREATE OR REPLACE FUNCTION public.guard_event_settlement_hold()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE v_creator uuid; v_tenant uuid; v_event_end timestamptz; v_delivered timestamptz; v_hours integer;
BEGIN
 IF NEW.screening_id IS NOT NULL THEN
  SELECT c.creator_id,s.tenant_id,coalesce(s.screening_date,s.release_date),s.live_replay_ready_at,s.settlement_hold_hours
   INTO v_creator,v_tenant,v_event_end,v_delivered,v_hours
   FROM public.screenings s JOIN public.content c ON c.id=s.content_id WHERE s.id=NEW.screening_id;
 ELSE
  SELECT l.creator_id,l.tenant_id,coalesce(l.actual_ended_at,l.scheduled_end),NULL,l.settlement_hold_hours
   INTO v_creator,v_tenant,v_event_end,v_delivered,v_hours FROM public.live_streams l WHERE l.id=NEW.live_stream_id;
 END IF;
 IF v_creator IS NULL OR v_creator<>NEW.creator_id OR v_tenant<>NEW.tenant_id THEN RAISE EXCEPTION 'settlement_event_owner_mismatch' USING ERRCODE='42501'; END IF;
 NEW.hold_hours:=coalesce(NEW.hold_hours,v_hours,48);
 NEW.event_ended_at:=coalesce(NEW.event_ended_at,v_event_end);
 NEW.delivery_confirmed_at:=coalesce(NEW.delivery_confirmed_at,v_delivered);
 NEW.release_at:=CASE WHEN NEW.event_ended_at IS NOT NULL AND (NEW.delivery_confirmed_at IS NOT NULL OR (NEW.screening_id IS NULL AND NOT coalesce((SELECT settlement_delivery_required FROM public.live_streams WHERE id=NEW.live_stream_id),true))) THEN NEW.event_ended_at + make_interval(hours=>NEW.hold_hours) ELSE NULL END;
 IF NEW.release_at IS NULL THEN NEW.hold_status:='held'; ELSIF NEW.release_at<=now() THEN NEW.hold_status:='eligible'; ELSE NEW.hold_status:='held'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS event_settlement_hold_guard ON public.event_settlement_holds;
CREATE TRIGGER event_settlement_hold_guard BEFORE INSERT OR UPDATE OF event_ended_at,delivery_confirmed_at,hold_hours,screening_id,live_stream_id,creator_id,tenant_id ON public.event_settlement_holds FOR EACH ROW EXECUTE FUNCTION public.guard_event_settlement_hold();
REVOKE ALL ON FUNCTION public.guard_event_settlement_hold() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.confirm_event_delivery(p_screening_id uuid DEFAULT NULL,p_live_stream_id uuid DEFAULT NULL,p_evidence jsonb DEFAULT '{}'::jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_count integer:=0; v_ended timestamptz; v_delivered timestamptz;
BEGIN
 IF auth.role()<>'service_role' AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role::text='super_admin') THEN
  RAISE EXCEPTION 'service_or_super_admin_required' USING ERRCODE='42501';
 END IF;
 IF (p_screening_id IS NOT NULL)::int + (p_live_stream_id IS NOT NULL)::int <> 1 THEN RAISE EXCEPTION 'exactly_one_event_required'; END IF;
 IF p_screening_id IS NOT NULL THEN
  SELECT coalesce(live_ended_at,screening_date),live_replay_ready_at INTO v_ended,v_delivered FROM public.screenings WHERE id=p_screening_id;
  IF v_ended IS NULL OR v_ended>now() OR v_delivered IS NULL THEN RAISE EXCEPTION 'event_end_and_replay_delivery_required'; END IF;
  UPDATE public.event_settlement_holds SET event_ended_at=v_ended,delivery_confirmed_at=v_delivered,delivery_evidence=p_evidence,updated_at=now() WHERE screening_id=p_screening_id AND hold_status='held';
 ELSE
  SELECT coalesce(actual_ended_at,scheduled_end),actual_ended_at INTO v_ended,v_delivered FROM public.live_streams WHERE id=p_live_stream_id;
  IF v_ended IS NULL OR v_ended>now() THEN RAISE EXCEPTION 'live_event_must_have_ended'; END IF;
  UPDATE public.event_settlement_holds SET event_ended_at=v_ended,delivery_confirmed_at=v_delivered,delivery_evidence=p_evidence,updated_at=now() WHERE live_stream_id=p_live_stream_id AND hold_status='held';
 END IF;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.confirm_event_delivery(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_event_delivery(uuid,uuid,jsonb) TO service_role;

