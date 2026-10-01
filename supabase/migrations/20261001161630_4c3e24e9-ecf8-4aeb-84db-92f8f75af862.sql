REVOKE ALL ON public.studio_accounts FROM anon;
CREATE POLICY "admins manage studio accounts" ON public.studio_accounts FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

ALTER TABLE public.screenings
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'film',
  ADD COLUMN IF NOT EXISTS lifecycle text NOT NULL DEFAULT 'upcoming',
  ADD COLUMN IF NOT EXISTS replay_price_ngn numeric,
  ADD COLUMN IF NOT EXISTS replay_price_usd numeric,
  ADD COLUMN IF NOT EXISTS replay_access_hours integer NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

CREATE TABLE public.event_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (screening_id, email)
);
GRANT INSERT ON public.event_waitlist TO anon;
GRANT SELECT, INSERT ON public.event_waitlist TO authenticated;
GRANT ALL ON public.event_waitlist TO service_role;
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone joins waitlist" ON public.event_waitlist FOR INSERT TO anon, authenticated WITH CHECK (length(email) BETWEEN 5 AND 255);
CREATE POLICY "admins read waitlist" ON public.event_waitlist FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE TABLE public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticket_id uuid,
  screening_id uuid,
  gross numeric NOT NULL DEFAULT 0,
  fee numeric NOT NULL DEFAULT 0,
  net numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  kind text NOT NULL DEFAULT 'sale',
  settles_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT ALL ON public.wallet_ledger TO service_role;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ledger" ON public.wallet_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  bank_name text NOT NULL, account_number text NOT NULL, account_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own withdrawals read" ON public.withdrawal_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));
CREATE POLICY "own withdrawals insert" ON public.withdrawal_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending' AND amount > 0);
CREATE POLICY "admin withdrawals update" ON public.withdrawal_requests FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.wallet_balance(_user_id uuid)
RETURNS TABLE(gross numeric, fees numeric, escrow numeric, withdrawable numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    coalesce(sum(l.gross),0), coalesce(sum(l.fee),0),
    coalesce(sum(l.net) FILTER (WHERE l.settles_at > now()),0),
    coalesce(sum(l.net) FILTER (WHERE l.settles_at <= now()),0)
      - coalesce((SELECT sum(w.amount) FROM withdrawal_requests w WHERE w.user_id = _user_id AND w.status <> 'rejected'),0)
  FROM wallet_ledger l WHERE l.user_id = _user_id AND (_user_id = auth.uid() OR is_super_admin(auth.uid()));
$$;
REVOKE EXECUTE ON FUNCTION public.wallet_balance(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.wallet_balance(uuid) TO authenticated;