-- =============================================
-- AGE MEDIA ECOSYSTEM - COMPLETE DATABASE SCHEMA
-- =============================================

-- 1. ENUMS FOR ROLES AND TYPES
-- =============================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'platform_admin', 'licensee_admin', 'creator', 'moderator', 'viewer');
CREATE TYPE public.tenant_type AS ENUM ('platform', 'licensee', 'creator');
CREATE TYPE public.content_type AS ENUM ('movie', 'series', 'episode', 'trailer', 'short', 'live', 'vod', 'channel');
CREATE TYPE public.monetization_type AS ENUM ('free', 'svod', 'tvod', 'avod', 'ppv', 'ticket');
CREATE TYPE public.content_status AS ENUM ('draft', 'processing', 'published', 'scheduled', 'archived', 'deleted');
CREATE TYPE public.stream_status AS ENUM ('scheduled', 'live', 'ended', 'cancelled');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired', 'paused', 'trial');
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE public.ticket_type AS ENUM ('live', 'replay', 'combo', 'screening');

-- 2. USER ROLES TABLE (SECURITY FIRST)
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'viewer',
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role, tenant_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT,
    full_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    country TEXT,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. TENANTS TABLE (Multi-tenant core)
-- =============================================
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type tenant_type NOT NULL DEFAULT 'licensee',
    owner_id UUID REFERENCES auth.users(id),
    logo_url TEXT,
    favicon_url TEXT,
    primary_color TEXT DEFAULT '#6366f1',
    secondary_color TEXT DEFAULT '#8b5cf6',
    custom_domain TEXT,
    settings JSONB DEFAULT '{}',
    features JSONB DEFAULT '{"ott": true, "live": true, "shorts": false, "cinema": false}',
    cdn_config JSONB DEFAULT '{}',
    payment_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 5. PLATFORM SETTINGS (Global Super Admin)
-- =============================================
CREATE TABLE public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 6. CONTENT TABLE (Videos, Movies, Series)
-- =============================================
CREATE TABLE public.content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    type content_type NOT NULL DEFAULT 'movie',
    status content_status NOT NULL DEFAULT 'draft',
    thumbnail_url TEXT,
    poster_url TEXT,
    banner_url TEXT,
    video_url TEXT,
    trailer_url TEXT,
    duration INTEGER, -- in seconds
    release_date DATE,
    genres TEXT[],
    tags TEXT[],
    cast_crew JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    monetization monetization_type NOT NULL DEFAULT 'free',
    price DECIMAL(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    availability_start TIMESTAMPTZ,
    availability_end TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_drm_protected BOOLEAN DEFAULT false,
    parent_id UUID REFERENCES public.content(id), -- for episodes/series
    season_number INTEGER,
    episode_number INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, slug)
);
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

-- 7. LIVE STREAMS TABLE
-- =============================================
CREATE TABLE public.live_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    banner_url TEXT,
    stream_key TEXT NOT NULL UNIQUE,
    rtmp_url TEXT,
    playback_url TEXT,
    status stream_status NOT NULL DEFAULT 'scheduled',
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    viewer_count INTEGER DEFAULT 0,
    peak_viewers INTEGER DEFAULT 0,
    monetization monetization_type NOT NULL DEFAULT 'free',
    ticket_price DECIMAL(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    is_ticketed BOOLEAN DEFAULT false,
    recording_enabled BOOLEAN DEFAULT true,
    recording_url TEXT,
    chat_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- 8. CHANNELS TABLE (Linear TV / FAST)
-- =============================================
CREATE TABLE public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    stream_url TEXT,
    epg_url TEXT,
    is_live BOOLEAN DEFAULT false,
    category TEXT,
    monetization monetization_type NOT NULL DEFAULT 'avod',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, slug)
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- 9. SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    interval TEXT DEFAULT 'month', -- month, year, week
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    stripe_price_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    status subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    stripe_subscription_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 10. TICKETS TABLE (Cinema/Events)
-- =============================================
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    content_id UUID REFERENCES public.content(id),
    stream_id UUID REFERENCES public.live_streams(id),
    ticket_type ticket_type NOT NULL DEFAULT 'live',
    ticket_code TEXT NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 11. PAYMENTS TABLE
-- =============================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status payment_status NOT NULL DEFAULT 'pending',
    payment_type TEXT NOT NULL, -- subscription, ticket, tvod, tip
    reference_id UUID, -- subscription_id, ticket_id, content_id
    stripe_payment_id TEXT,
    provider TEXT DEFAULT 'stripe',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 12. REVENUE SPLITS TABLE
-- =============================================
CREATE TABLE public.revenue_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    content_id UUID REFERENCES public.content(id),
    platform_share DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    licensee_share DECIMAL(5,2) NOT NULL DEFAULT 30.00,
    creator_share DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_splits ENABLE ROW LEVEL SECURITY;

-- 13. WATCH HISTORY TABLE
-- =============================================
CREATE TABLE public.watch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    watch_position INTEGER DEFAULT 0, -- in seconds
    watch_duration INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    last_watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, content_id)
);
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- 14. WATCHLISTS TABLE
-- =============================================
CREATE TABLE public.watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, content_id)
);
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- 15. ANALYTICS TABLE
-- =============================================
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    content_id UUID,
    stream_id UUID,
    device_type TEXT,
    country TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 16. FEATURE FLAGS TABLE
-- =============================================
CREATE TABLE public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    rollout_percentage INTEGER DEFAULT 100,
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, feature_key)
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- 17. AUDIT LOGS TABLE
-- =============================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON public.content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_live_streams_updated_at BEFORE UPDATE ON public.live_streams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PROFILE TRIGGER FOR NEW USERS
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_super_admin(auth.uid()));

-- User Roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage all roles" ON public.user_roles FOR ALL USING (public.is_super_admin(auth.uid()));

-- Tenants
CREATE POLICY "Anyone can view active tenants" ON public.tenants FOR SELECT USING (is_active = true);
CREATE POLICY "Tenant owners can update their tenant" ON public.tenants FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Super admins can manage all tenants" ON public.tenants FOR ALL USING (public.is_super_admin(auth.uid()));

-- Platform Settings
CREATE POLICY "Anyone can view public settings" ON public.platform_settings FOR SELECT USING (is_public = true);
CREATE POLICY "Super admins can manage settings" ON public.platform_settings FOR ALL USING (public.is_super_admin(auth.uid()));

-- Content
CREATE POLICY "Anyone can view published content" ON public.content FOR SELECT USING (status = 'published');
CREATE POLICY "Creators can manage their content" ON public.content FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "Super admins can manage all content" ON public.content FOR ALL USING (public.is_super_admin(auth.uid()));

-- Live Streams
CREATE POLICY "Anyone can view scheduled/live streams" ON public.live_streams FOR SELECT USING (status IN ('scheduled', 'live'));
CREATE POLICY "Creators can manage their streams" ON public.live_streams FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "Super admins can manage all streams" ON public.live_streams FOR ALL USING (public.is_super_admin(auth.uid()));

-- Channels
CREATE POLICY "Anyone can view active channels" ON public.channels FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins can manage channels" ON public.channels FOR ALL USING (public.is_super_admin(auth.uid()));

-- Subscription Plans
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins can manage plans" ON public.subscription_plans FOR ALL USING (public.is_super_admin(auth.uid()));

-- Subscriptions
CREATE POLICY "Users can view their subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage subscriptions" ON public.subscriptions FOR ALL USING (public.is_super_admin(auth.uid()));

-- Tickets
CREATE POLICY "Users can view their tickets" ON public.tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage tickets" ON public.tickets FOR ALL USING (public.is_super_admin(auth.uid()));

-- Payments
CREATE POLICY "Users can view their payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all payments" ON public.payments FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Revenue Splits
CREATE POLICY "Super admins can manage revenue splits" ON public.revenue_splits FOR ALL USING (public.is_super_admin(auth.uid()));

-- Watch History
CREATE POLICY "Users can manage their watch history" ON public.watch_history FOR ALL USING (auth.uid() = user_id);

-- Watchlists
CREATE POLICY "Users can manage their watchlist" ON public.watchlists FOR ALL USING (auth.uid() = user_id);

-- Analytics
CREATE POLICY "Super admins can view analytics" ON public.analytics_events FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Anyone can insert analytics" ON public.analytics_events FOR INSERT WITH CHECK (true);

-- Feature Flags
CREATE POLICY "Anyone can view feature flags" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "Super admins can manage feature flags" ON public.feature_flags FOR ALL USING (public.is_super_admin(auth.uid()));

-- Audit Logs
CREATE POLICY "Super admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);