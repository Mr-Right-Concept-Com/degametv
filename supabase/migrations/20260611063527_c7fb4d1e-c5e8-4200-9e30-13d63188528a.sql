
-- KYC fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS kyc_id_type TEXT,
  ADD COLUMN IF NOT EXISTS kyc_id_url TEXT,
  ADD COLUMN IF NOT EXISTS kyc_selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS kyc_full_name TEXT,
  ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;

-- kyc_status allowed: 'unverified' | 'pending' | 'verified' | 'rejected'

-- Allow users to update their own KYC fields (policy should already exist via profile RLS)
-- Add helper to check verification
CREATE OR REPLACE FUNCTION public.is_kyc_verified(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND kyc_status = 'verified'
  )
$$;
