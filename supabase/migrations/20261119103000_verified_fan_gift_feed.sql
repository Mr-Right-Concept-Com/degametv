-- Provider-backed tip/gift checkout metadata and a privacy-safe live gift feed.
ALTER TABLE public.event_contributions
  ADD COLUMN IF NOT EXISTS amount_major numeric(18,6),
  ADD COLUMN IF NOT EXISTS platform_fee_major numeric(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_mode text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS provider_checkout_id text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.event_contributions'::regclass AND conname='event_contributions_provider_mode_valid') THEN
    ALTER TABLE public.event_contributions ADD CONSTRAINT event_contributions_provider_mode_valid CHECK(provider_mode IN ('test','live'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.event_live_gift_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL UNIQUE REFERENCES public.event_contributions(id) ON DELETE CASCADE,
  screening_id uuid REFERENCES public.screenings(id) ON DELETE CASCADE,
  live_stream_id uuid REFERENCES public.live_streams(id) ON DELETE CASCADE,
  contribution_type text NOT NULL CHECK(contribution_type IN ('tip','gift')),
  display_name text NOT NULL,
  gift_catalog_key text,
  message text,
  amount_minor bigint NOT NULL CHECK(amount_minor>0),
  currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((screening_id IS NOT NULL)::int + (live_stream_id IS NOT NULL)::int = 1)
);
CREATE INDEX IF NOT EXISTS event_live_gift_feed_screening_idx ON public.event_live_gift_feed(screening_id,created_at DESC);
CREATE INDEX IF NOT EXISTS event_live_gift_feed_stream_idx ON public.event_live_gift_feed(live_stream_id,created_at DESC);

ALTER TABLE public.event_live_gift_feed ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_live_gift_feed FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.event_live_gift_feed TO anon,authenticated,service_role;
GRANT ALL ON public.event_live_gift_feed TO service_role;

DROP POLICY IF EXISTS public_live_gift_feed_read ON public.event_live_gift_feed;
CREATE POLICY public_live_gift_feed_read ON public.event_live_gift_feed
FOR SELECT TO anon,authenticated
USING (
  (screening_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.screenings s
    WHERE s.id=screening_id AND s.status='published'
      AND s.event_type='live' AND s.event_visibility IN ('public','unlisted') AND NOT s.invite_only
  ))
  OR
  (live_stream_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.live_streams l
    WHERE l.id=live_stream_id AND l.event_visibility IN ('public','unlisted') AND NOT l.invite_only
      AND NOT EXISTS (
        SELECT 1 FROM public.screenings s
        WHERE s.id=CASE WHEN coalesce(l.metadata->>'screening_id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
);

CREATE OR REPLACE FUNCTION public.publish_verified_event_gift_feed_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_event_type text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'paid' OR (TG_OP='UPDATE' AND OLD.status='paid') THEN RETURN NEW; END IF;
  IF NEW.screening_id IS NOT NULL THEN
    SELECT event_type INTO v_event_type FROM public.screenings WHERE id=NEW.screening_id;
  ELSE
    v_event_type:='live';
  END IF;
  IF v_event_type<>'live' THEN RETURN NEW; END IF;
  INSERT INTO public.event_live_gift_feed(
    contribution_id,screening_id,live_stream_id,contribution_type,display_name,
    gift_catalog_key,message,amount_minor,currency
  ) VALUES (
    NEW.id,NEW.screening_id,NEW.live_stream_id,NEW.contribution_type,
    CASE WHEN NEW.is_anonymous THEN 'Anonymous supporter'
         ELSE coalesce(nullif(trim(NEW.contributor_name),''),'A supporter') END,
    NEW.gift_catalog_key,NEW.message,NEW.amount_minor,NEW.currency
  ) ON CONFLICT(contribution_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS event_contribution_public_gift_feed ON public.event_contributions;
CREATE TRIGGER event_contribution_public_gift_feed
AFTER INSERT OR UPDATE OF status ON public.event_contributions
FOR EACH ROW EXECUTE FUNCTION public.publish_verified_event_gift_feed_item();
REVOKE ALL ON FUNCTION public.publish_verified_event_gift_feed_item() FROM PUBLIC,anon,authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='event_live_gift_feed'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_live_gift_feed;
  END IF;
END $$;

          THEN (l.metadata->>'screening_id')::uuid ELSE NULL END
          AND (s.event_visibility NOT IN ('public','unlisted') OR s.invite_only)
      )
  ))
);

CREATE OR REPLACE FUNCTION public.publish_verified_event_gift_feed_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_event_type text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'paid' OR (TG_OP='UPDATE' AND OLD.status='paid') THEN RETURN NEW; END IF;
  IF NEW.screening_id IS NOT NULL THEN
    SELECT event_type INTO v_event_type FROM public.screenings WHERE id=NEW.screening_id;
  ELSE
    v_event_type:='live';
  END IF;
  IF v_event_type<>'live' THEN RETURN NEW; END IF;
  INSERT INTO public.event_live_gift_feed(
    contribution_id,screening_id,live_stream_id,contribution_type,display_name,
    gift_catalog_key,message,amount_minor,currency
  ) VALUES (
    NEW.id,NEW.screening_id,NEW.live_stream_id,NEW.contribution_type,
    CASE WHEN NEW.is_anonymous THEN 'Anonymous supporter'
         ELSE coalesce(nullif(trim(NEW.contributor_name),''),'A supporter') END,
    NEW.gift_catalog_key,NEW.message,NEW.amount_minor,NEW.currency
  ) ON CONFLICT(contribution_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS event_contribution_public_gift_feed ON public.event_contributions;
CREATE TRIGGER event_contribution_public_gift_feed
AFTER INSERT OR UPDATE OF status ON public.event_contributions
FOR EACH ROW EXECUTE FUNCTION public.publish_verified_event_gift_feed_item();
REVOKE ALL ON FUNCTION public.publish_verified_event_gift_feed_item() FROM PUBLIC,anon,authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='event_live_gift_feed'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_live_gift_feed;
  END IF;
END $$;
