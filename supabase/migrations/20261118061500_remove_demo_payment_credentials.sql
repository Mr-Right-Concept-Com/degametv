-- Remove seeded demo credentials so a test-mode toggle cannot activate fake payment keys.
update public.payment_provider_configs
set test_public_key = null,
    test_secret_ref = null,
    is_enabled = false,
    is_live = false,
    updated_at = now()
where test_public_key = 'pk_test_demo';
