drop trigger if exists service_provider_single_active on public.service_provider_bindings;
drop function if exists public.deactivate_other_service_provider_bindings();
comment on table public.service_provider_bindings is
'Vault-backed provider control plane. Multiple enabled healthy providers per capability are permitted; routing is deterministic by priority then provider_key and adapters fail over after provider health failures. No single-active trigger is installed.';
