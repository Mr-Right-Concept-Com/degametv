CREATE TABLE IF NOT EXISTS public.studio_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'creator',
  company_name text, cac_number text, tax_id text, cac_doc_path text,
  bank_name text, bank_account_number text, bank_account_name text,
  rights_declared boolean NOT NULL DEFAULT false,
  seats integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.studio_accounts TO authenticated;
GRANT ALL ON public.studio_accounts TO service_role;
ALTER TABLE public.studio_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own studio account read" ON public.studio_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own studio account insert" ON public.studio_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');