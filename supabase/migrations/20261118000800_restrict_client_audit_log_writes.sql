-- Audit records are trusted security evidence. Clients must never be able to forge them.
-- Server-side service-role operations and SECURITY DEFINER review transactions remain able to write.
REVOKE INSERT ON TABLE public.audit_logs FROM anon, authenticated;
