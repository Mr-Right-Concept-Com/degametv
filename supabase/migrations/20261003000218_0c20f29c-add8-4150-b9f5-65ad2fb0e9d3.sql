
ALTER TABLE public.screening_tickets
  ADD COLUMN IF NOT EXISTS ticket_kind text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS access_hours integer,
  ADD COLUMN IF NOT EXISTS first_played_at timestamptz;

CREATE TABLE IF NOT EXISTS public.studio_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  member_email text NOT NULL,
  member_user_id uuid,
  role text NOT NULL DEFAULT 'manager',
  status text NOT NULL DEFAULT 'invited',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, member_email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_members TO authenticated;
GRANT ALL ON public.studio_members TO service_role;
ALTER TABLE public.studio_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage team" ON public.studio_members FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR member_user_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.stream_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  screening_id uuid,
  provider text NOT NULL DEFAULT 'rtmp',
  ingest_url text,
  stream_key text,
  playback_url text,
  simulcast_targets jsonb NOT NULL DEFAULT '[]',
  is_live boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, screening_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stream_configs TO authenticated;
GRANT ALL ON public.stream_configs TO service_role;
ALTER TABLE public.stream_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage stream configs" ON public.stream_configs FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.fan_blasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  screening_id uuid NOT NULL,
  template text NOT NULL,
  subject text NOT NULL,
  body text,
  audience text NOT NULL DEFAULT 'all',
  recipients_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fan_blasts TO authenticated;
GRANT ALL ON public.fan_blasts TO service_role;
ALTER TABLE public.fan_blasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners see blasts" ON public.fan_blasts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  placement text NOT NULL DEFAULT 'home',
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  link_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promo_banners TO authenticated;
GRANT ALL ON public.promo_banners TO service_role;
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active banners" ON public.promo_banners FOR SELECT
  USING (is_active OR owner_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Admins and owners insert banners" ON public.promo_banners FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Admins and owners update banners" ON public.promo_banners FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Admins and owners delete banners" ON public.promo_banners FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users upload own kyb docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='kyb-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users and admins read kyb docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='kyb-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_super_admin(auth.uid())));

CREATE OR REPLACE FUNCTION public.grant_creator_on_tier_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'creator') THEN
      INSERT INTO public.user_roles(user_id, role) VALUES (NEW.user_id, 'creator');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_grant_creator_on_tier ON public.studio_accounts;
CREATE TRIGGER trg_grant_creator_on_tier AFTER INSERT OR UPDATE OF status ON public.studio_accounts
  FOR EACH ROW EXECUTE FUNCTION public.grant_creator_on_tier_approval();
