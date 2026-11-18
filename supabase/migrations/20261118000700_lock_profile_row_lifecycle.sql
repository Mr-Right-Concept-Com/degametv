-- Profile lifecycle is managed by the auth trigger and privileged workflows.
-- Clients may update only the safe columns granted in the preceding migration.
revoke insert, delete, truncate on table public.profiles from authenticated;
