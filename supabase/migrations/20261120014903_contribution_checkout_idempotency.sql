alter table public.event_contributions
  add column if not exists idempotency_key uuid,
  add column if not exists checkout_url text;

create unique index if not exists event_contributions_user_idempotency_uidx
  on public.event_contributions(contributor_user_id, idempotency_key)
  where contributor_user_id is not null and idempotency_key is not null;

comment on column public.event_contributions.idempotency_key is
  'Client-generated request identity used to prevent duplicate contribution orders and charges.';
comment on column public.event_contributions.checkout_url is
  'Provider checkout URL retained privately to resume an idempotent pending contribution request.';
