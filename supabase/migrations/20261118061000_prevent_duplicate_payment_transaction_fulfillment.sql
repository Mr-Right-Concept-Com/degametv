-- A provider transaction may fulfil at most one guest order.
create unique index if not exists guest_payment_orders_provider_transaction_id_key
  on public.guest_payment_orders(provider_transaction_id)
  where provider_transaction_id is not null;
