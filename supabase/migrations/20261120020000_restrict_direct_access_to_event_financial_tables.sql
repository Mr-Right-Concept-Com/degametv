-- Sensitive event, payment and settlement records are service-role mediated.
-- RLS without policies blocks REST access, while explicit privilege revocation
-- also removes these relations from ordinary PostgREST/GraphQL role access.
begin;

do $$
declare
  v_table text;
  v_tables text[] := array[
    'event_access_invites',
    'event_contributions',
    'event_settlement_holds',
    'event_notification_outbox',
    'live_payment_orders',
    'guest_payment_orders',
    'payment_refunds',
    'screening_playback_sessions',
    'stream_provider_event_logs'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('revoke all privileges on table public.%I from anon, authenticated', v_table);
    end if;
  end loop;
end $$;

commit;