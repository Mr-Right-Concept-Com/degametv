insert into public.platform_settings(setting_key,setting_value,description,is_public)
values ('base_currency','"USD"'::jsonb,'Platform settlement and FX reference currency. User-facing display currency is country and preference adaptive.',false)
on conflict (setting_key) do nothing;
update public.platform_settings
set setting_value='{}'::jsonb,
    description='Deprecated static rates. Configure an fx_rates provider in the Vault-backed provider registry instead.',
    is_public=false,
    updated_at=now()
where setting_key='currency_rates';