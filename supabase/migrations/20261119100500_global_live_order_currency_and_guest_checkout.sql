-- Live checkout must support the same global currency and guest model as the
-- provider-neutral checkout pipeline. The original table constrained currency
-- to NGN/USD and user_id to NOT NULL, which contradicted guest checkout + FX.
ALTER TABLE public.live_payment_orders
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.live_payment_orders
  DROP CONSTRAINT IF EXISTS live_payment_orders_currency_check;

ALTER TABLE public.live_payment_orders
  ADD CONSTRAINT live_payment_orders_currency_iso
  CHECK (currency ~ '^[A-Z]{3}$');

COMMENT ON COLUMN public.live_payment_orders.user_id IS
  'Nullable for guest checkout; verified email and claim-token flow own guest ticket delivery.';
COMMENT ON COLUMN public.live_payment_orders.currency IS
  'ISO-4217 transaction currency selected through country/currency rules and provider capability checks.';
