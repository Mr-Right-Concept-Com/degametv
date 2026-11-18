-- Private transactional, identity, tenant and engagement records must not be discoverable to guests.
-- Public catalog surfaces (content, screenings, channels, published promo banners and plans)
-- retain their existing anon SELECT grants and RLS policies.
REVOKE SELECT ON TABLE
  public.analytics_events,
  public.audit_logs,
  public.event_waitlist,
  public.fan_blasts,
  public.filmmaker_submissions,
  public.loyalty_points,
  public.payment_gateways,
  public.payments,
  public.revenue_splits,
  public.screening_notifications,
  public.screening_tickets,
  public.stream_configs,
  public.studio_members,
  public.subscriptions,
  public.tickets,
  public.user_roles,
  public.wallet_ledger,
  public.watch_history,
  public.watch_party_participants,
  public.watch_party_rooms,
  public.watchlists,
  public.withdrawal_requests
FROM anon;
