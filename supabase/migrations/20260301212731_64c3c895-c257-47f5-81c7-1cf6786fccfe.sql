
-- Add new columns to screenings table
ALTER TABLE public.screenings 
  ADD COLUMN IF NOT EXISTS cast_crew jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gallery_images text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS age_rating text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS star_rating numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- Create screening_comments table
CREATE TABLE public.screening_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  screening_id uuid NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  email text,
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.screening_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON public.screening_comments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can post comments"
  ON public.screening_comments FOR INSERT
  WITH CHECK (nickname IS NOT NULL AND comment IS NOT NULL);

-- Create screening_notifications table
CREATE TABLE public.screening_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  screening_id uuid NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(screening_id, email)
);

ALTER TABLE public.screening_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to notifications"
  ON public.screening_notifications FOR INSERT
  WITH CHECK (email IS NOT NULL);

CREATE POLICY "Admins can view notifications"
  ON public.screening_notifications FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL,
  current_uses integer NOT NULL DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone DEFAULT NULL,
  screening_id uuid REFERENCES public.screenings(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(code, tenant_id)
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read active promo codes for validation"
  ON public.promo_codes FOR SELECT
  USING (is_active = true);
