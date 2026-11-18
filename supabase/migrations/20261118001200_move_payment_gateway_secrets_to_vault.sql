ALTER TABLE public.payment_gateways
  ADD COLUMN IF NOT EXISTS test_secret_ref uuid,
  ADD COLUMN IF NOT EXISTS live_secret_ref uuid,
  ADD COLUMN IF NOT EXISTS webhook_secret_ref uuid;

DO $$
DECLARE
  gateway record;
  secret_ref uuid;
BEGIN
  FOR gateway IN SELECT * FROM public.payment_gateways LOOP
    IF gateway.test_secret_key IS NOT NULL AND gateway.test_secret_ref IS NULL THEN
      secret_ref := vault.create_secret(
        gateway.test_secret_key,
        'payment.' || gateway.gateway_name || '.test.secret',
        'Payment gateway test credential for tenant ' || gateway.tenant_id::text,
        NULL
      );
      UPDATE public.payment_gateways SET test_secret_ref = secret_ref WHERE id = gateway.id;
    END IF;
    IF gateway.live_secret_key IS NOT NULL AND gateway.live_secret_ref IS NULL THEN
      secret_ref := vault.create_secret(
        gateway.live_secret_key,
        'payment.' || gateway.gateway_name || '.live.secret',
        'Payment gateway live credential for tenant ' || gateway.tenant_id::text,
        NULL
      );
      UPDATE public.payment_gateways SET live_secret_ref = secret_ref WHERE id = gateway.id;
    END IF;
    IF gateway.webhook_secret IS NOT NULL AND gateway.webhook_secret_ref IS NULL THEN
      secret_ref := vault.create_secret(
        gateway.webhook_secret,
        'payment.' || gateway.gateway_name || '.webhook.secret',
        'Payment gateway webhook credential for tenant ' || gateway.tenant_id::text,
        NULL
      );
      UPDATE public.payment_gateways SET webhook_secret_ref = secret_ref WHERE id = gateway.id;
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.payment_gateways
  DROP COLUMN IF EXISTS test_secret_key,
  DROP COLUMN IF EXISTS live_secret_key,
  DROP COLUMN IF EXISTS webhook_secret;

REVOKE SELECT ON TABLE public.payment_gateways FROM anon;
