
-- Create screenings table (virtual cinema events)
CREATE TABLE public.screenings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  content_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  poster_url TEXT,
  banner_url TEXT,
  trailer_url TEXT,
  release_date TIMESTAMP WITH TIME ZONE,
  screening_date TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  location_pricing JSONB NOT NULL DEFAULT '{"nigeria": 5000, "international": 15}',
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tickets table
CREATE TABLE public.screening_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  screening_id UUID NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT NOT NULL,
  ticket_code TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  addons JSONB DEFAULT '{}',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_reference TEXT,
  watch_url TEXT,
  watch_code TEXT NOT NULL UNIQUE,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '90 days')
);

-- Create payment gateways config table (for admin to manage live/test keys)
CREATE TABLE public.payment_gateways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  gateway_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  is_live BOOLEAN DEFAULT false,
  test_secret_key TEXT,
  test_public_key TEXT,
  live_secret_key TEXT,
  live_public_key TEXT,
  webhook_secret TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, gateway_name)
);

-- Enable RLS
ALTER TABLE public.screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- RLS Policies for screenings
CREATE POLICY "Anyone can view published screenings"
  ON public.screenings FOR SELECT
  USING (status = 'published');

CREATE POLICY "Super admins can manage all screenings"
  ON public.screenings FOR ALL
  USING (is_super_admin(auth.uid()));

-- RLS Policies for tickets
CREATE POLICY "Users can view their own tickets"
  ON public.screening_tickets FOR SELECT
  USING (auth.uid() = user_id OR email = auth.jwt()->>'email');

CREATE POLICY "Anyone can purchase a ticket"
  ON public.screening_tickets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Super admins can view all tickets"
  ON public.screening_tickets FOR SELECT
  USING (is_super_admin(auth.uid()));

-- RLS Policies for payment gateways (admin only)
CREATE POLICY "Super admins can manage payment gateways"
  ON public.payment_gateways FOR ALL
  USING (is_super_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_screenings_status ON public.screenings(status);
CREATE INDEX idx_screenings_slug ON public.screenings(slug);
CREATE INDEX idx_tickets_screening_id ON public.screening_tickets(screening_id);
CREATE INDEX idx_tickets_email ON public.screening_tickets(email);
CREATE INDEX idx_tickets_watch_code ON public.screening_tickets(watch_code);
CREATE INDEX idx_payment_gateways_tenant ON public.payment_gateways(tenant_id);
