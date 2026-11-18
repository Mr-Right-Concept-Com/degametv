REVOKE ALL ON TABLE public.studio_accounts FROM anon, authenticated;
GRANT SELECT (
  id, user_id, tier, company_name, cac_number, cac_doc_path,
  rights_declared, seats, status, created_at, updated_at, review_notes,
  reviewed_by, reviewed_at
) ON public.studio_accounts TO authenticated;
GRANT INSERT (
  user_id, tier, company_name, cac_number, cac_doc_path,
  rights_declared, seats, status
) ON public.studio_accounts TO authenticated;
GRANT UPDATE (
  tier, company_name, cac_number, cac_doc_path,
  rights_declared, seats, status, updated_at
) ON public.studio_accounts TO authenticated;
