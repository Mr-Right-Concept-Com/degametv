
-- Gift ticket + currency columns on screening_tickets
ALTER TABLE public.screening_tickets
  ADD COLUMN IF NOT EXISTS gift_from text,
  ADD COLUMN IF NOT EXISTS gift_message text,
  ADD COLUMN IF NOT EXISTS display_currency text,
  ADD COLUMN IF NOT EXISTS display_amount numeric;

-- Loyalty points
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  ticket_id uuid REFERENCES public.screening_tickets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loyalty_points TO authenticated;
GRANT ALL ON public.loyalty_points TO service_role;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own loyalty points" ON public.loyalty_points
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON public.loyalty_points(user_id);

-- Watch party rooms
CREATE TABLE IF NOT EXISTS public.watch_party_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
  host_user_id uuid NOT NULL,
  room_code text NOT NULL UNIQUE,
  name text,
  current_position numeric NOT NULL DEFAULT 0,
  is_playing boolean NOT NULL DEFAULT false,
  last_event_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.watch_party_rooms TO authenticated;
GRANT ALL ON public.watch_party_rooms TO service_role;
ALTER TABLE public.watch_party_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed can view rooms" ON public.watch_party_rooms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create their own rooms" ON public.watch_party_rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "Hosts update their rooms" ON public.watch_party_rooms
  FOR UPDATE TO authenticated USING (auth.uid() = host_user_id);

CREATE TRIGGER trg_wpr_updated BEFORE UPDATE ON public.watch_party_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Participants
CREATE TABLE IF NOT EXISTS public.watch_party_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.watch_party_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.watch_party_participants TO authenticated;
GRANT ALL ON public.watch_party_participants TO service_role;
ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed users view participants" ON public.watch_party_participants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users join as themselves" ON public.watch_party_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave themselves" ON public.watch_party_participants
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Live reactions
CREATE TABLE IF NOT EXISTS public.live_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
  user_id uuid,
  emoji text NOT NULL,
  position_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.live_reactions TO authenticated;
GRANT ALL ON public.live_reactions TO service_role;
ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed view reactions" ON public.live_reactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authed post own reactions" ON public.live_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_live_reactions_screening ON public.live_reactions(screening_id, created_at DESC);
