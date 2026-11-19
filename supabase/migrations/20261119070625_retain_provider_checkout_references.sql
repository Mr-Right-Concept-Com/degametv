ALTER TABLE public.guest_payment_orders ADD COLUMN IF NOT EXISTS provider_checkout_id text;
ALTER TABLE public.live_payment_orders ADD COLUMN IF NOT EXISTS provider_checkout_id text;
CREATE INDEX IF NOT EXISTS guest_payment_orders_checkout_id_idx ON public.guest_payment_orders(provider,provider_checkout_id) WHERE provider_checkout_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS live_payment_orders_checkout_id_idx ON public.live_payment_orders(provider,provider_checkout_id) WHERE provider_checkout_id IS NOT NULL;