-- Client roles must never own structural table privileges. RLS does not protect
-- TRUNCATE, REFERENCES, or TRIGGER operations, so remove these grants from every
-- current public table while preserving intentional SELECT/INSERT/UPDATE/DELETE
-- grants and their existing row-level policies.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
