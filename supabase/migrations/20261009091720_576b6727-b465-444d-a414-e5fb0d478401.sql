ALTER TABLE public.studio_members ALTER COLUMN role SET DEFAULT 'producer';
UPDATE public.studio_members SET role = 'producer' WHERE role NOT IN ('producer', 'live_operator', 'accountant', 'viewer');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.studio_members'::regclass AND conname = 'studio_members_role_allowed') THEN
    ALTER TABLE public.studio_members ADD CONSTRAINT studio_members_role_allowed CHECK (role IN ('producer', 'live_operator', 'accountant', 'viewer'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.studio_members'::regclass AND conname = 'studio_members_status_allowed') THEN
    ALTER TABLE public.studio_members ADD CONSTRAINT studio_members_status_allowed CHECK (status IN ('invited', 'active', 'removed'));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS studio_members_owner_email_lower_uidx ON public.studio_members (owner_id, lower(member_email));

ALTER TABLE public.promo_banners ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.promo_banners ADD COLUMN IF NOT EXISTS screening_id uuid;
UPDATE public.promo_banners SET status = CASE WHEN is_active THEN 'approved' ELSE 'requested' END WHERE status IS NULL OR status = '';
CREATE INDEX IF NOT EXISTS promo_banners_screening_id_idx ON public.promo_banners (screening_id);

CREATE OR REPLACE FUNCTION public.is_studio_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1
    FROM public.studio_members m
    JOIN public.studio_accounts a ON a.user_id = m.owner_id
    WHERE m.member_user_id = _user_id
      AND m.status = 'active'
      AND a.tier = 'business'
      AND a.status = 'approved'
  )
$$;

CREATE OR REPLACE FUNCTION public.accept_studio_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accepted integer;
  signed_in_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  signed_in_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF signed_in_email = '' THEN
    RETURN 0;
  END IF;
  UPDATE public.studio_members m
  SET member_user_id = auth.uid(), status = 'active'
  FROM public.studio_accounts a
  WHERE m.owner_id = a.user_id
    AND a.tier = 'business'
    AND a.status = 'approved'
    AND lower(m.member_email) = signed_in_email
    AND m.status = 'invited';
  GET DIAGNOSTICS accepted = ROW_COUNT;
  RETURN accepted;
END
$$;

CREATE OR REPLACE FUNCTION public.validate_studio_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tier_name text;
  tier_status text;
  seat_limit integer;
  seats_used integer;
BEGIN
  IF NEW.member_email IS NULL OR length(trim(NEW.member_email)) = 0 THEN
    RAISE EXCEPTION 'A team member email is required';
  END IF;
  NEW.member_email := lower(trim(NEW.member_email));
  IF NEW.role NOT IN ('producer', 'live_operator', 'accountant', 'viewer') THEN
    RAISE EXCEPTION 'Unsupported Studio team role';
  END IF;
  IF NEW.status NOT IN ('invited', 'active', 'removed') THEN
    RAISE EXCEPTION 'Unsupported Studio team status';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin(auth.uid()) AND NEW.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only manage your own Studio team';
  END IF;
  SELECT tier, status, seats INTO tier_name, tier_status, seat_limit
  FROM public.studio_accounts WHERE user_id = NEW.owner_id;
  IF NOT public.is_super_admin(auth.uid()) AND (tier_name IS DISTINCT FROM 'business' OR tier_status IS DISTINCT FROM 'approved') THEN
    RAISE EXCEPTION 'An approved Business tier is required to manage team seats';
  END IF;
  IF NEW.status <> 'removed' THEN
    SELECT count(*) INTO seats_used FROM public.studio_members m
    WHERE m.owner_id = NEW.owner_id AND m.status <> 'removed'
      AND (TG_OP = 'INSERT' OR m.id <> NEW.id);
    IF seats_used >= coalesce(seat_limit, 0) THEN
      RAISE EXCEPTION 'Business team seat limit reached';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS validate_studio_member_before_write ON public.studio_members;
CREATE TRIGGER validate_studio_member_before_write
BEFORE INSERT OR UPDATE ON public.studio_members
FOR EACH ROW EXECUTE FUNCTION public.validate_studio_member();

CREATE OR REPLACE FUNCTION public.guard_promo_banner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR NEW.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the event organizer or a super admin can manage this banner';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'requested';
    NEW.is_active := false;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Only a super admin can approve, publish, or hide a banner';
    END IF;
    NEW.status := OLD.status;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS guard_promo_banner_before_write ON public.promo_banners;
CREATE TRIGGER guard_promo_banner_before_write
BEFORE INSERT OR UPDATE ON public.promo_banners
FOR EACH ROW EXECUTE FUNCTION public.guard_promo_banner();