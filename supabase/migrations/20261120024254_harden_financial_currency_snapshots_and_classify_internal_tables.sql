-- Phase 1 hardening: database-authored immutable currency snapshots and explicit API classifications.
-- No historical FX values are backfilled or estimated.

create or replace function public.stamp_financial_currency_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb := to_jsonb(new);
  v_old jsonb;
  v_patch jsonb := '{}'::jsonb;
  v_currency text;
  v_platform_base text;
  v_creator_currency text;
  v_rate public.platform_fx_rate_cache%rowtype;
  v_now timestamptz := now();
begin
  if tg_op='UPDATE' then
    v_old:=to_jsonb(old);
    v_patch:=jsonb_build_object(
      'original_currency',v_old->'original_currency',
      'creator_base_currency',v_old->'creator_base_currency',
      'platform_base_currency',v_old->'platform_base_currency',
      'settlement_currency',v_old->'settlement_currency',
      'payout_currency',v_old->'payout_currency',
      'fx_rate',v_old->'fx_rate',
      'fx_provider',v_old->'fx_provider',
      'fx_timestamp',v_old->'fx_timestamp'
    );
    new:=jsonb_populate_record(new,v_patch);
    return new;
  end if;
  v_currency:=upper(coalesce(nullif(v_row->>'currency',''),nullif(v_row->>'display_currency','')));
  if v_currency !~ '^[A-Z]{3}$' then v_currency:=null; end if;
  select upper(setting_value #>> '{}') into v_platform_base
    from public.platform_settings where setting_key='base_currency' limit 1;
  if v_platform_base !~ '^[A-Z]{3}$' then v_platform_base:=null; end if;

  if nullif(v_row->>'content_id','') is not null then
    select upper(nullif(currency,'')) into v_creator_currency from public.content where id=(v_row->>'content_id')::uuid;
  elsif nullif(v_row->>'screening_id','') is not null then
    select upper(nullif(base_currency,'')) into v_creator_currency from public.screenings where id=(v_row->>'screening_id')::uuid;
  elsif nullif(v_row->>'stream_id','') is not null then
    select upper(nullif(currency,'')) into v_creator_currency from public.live_streams where id=(v_row->>'stream_id')::uuid;
  elsif nullif(v_row->>'ticket_id','') is not null then
    select coalesce(upper(nullif(c.currency,'')),upper(nullif(ls.currency,''))) into v_creator_currency
      from public.tickets t left join public.content c on c.id=t.content_id
      left join public.live_streams ls on ls.id=t.stream_id where t.id=(v_row->>'ticket_id')::uuid;
  elsif nullif(v_row->>'live_ticket_id','') is not null then
    select upper(nullif(s.base_currency,'')) into v_creator_currency
      from public.screening_tickets st join public.screenings s on s.id=st.screening_id
      where st.id=(v_row->>'live_ticket_id')::uuid;
  elsif nullif(v_row->>'event_contribution_id','') is not null then
    select coalesce(upper(nullif(c.currency,'')),upper(nullif(s.base_currency,'')),upper(nullif(ls.currency,'')))
      into v_creator_currency from public.event_contributions ec
      left join public.content c on c.id=ec.content_id left join public.screenings s on s.id=ec.screening_id
      left join public.live_streams ls on ls.id=ec.live_stream_id where ec.id=(v_row->>'event_contribution_id')::uuid;
  elsif nullif(v_row->>'contribution_id','') is not null then
    select coalesce(upper(nullif(c.currency,'')),upper(nullif(s.base_currency,'')),upper(nullif(ls.currency,'')))
      into v_creator_currency from public.event_contributions ec
      left join public.content c on c.id=ec.content_id left join public.screenings s on s.id=ec.screening_id
      left join public.live_streams ls on ls.id=ec.live_stream_id where ec.id=(v_row->>'contribution_id')::uuid;
  end if;
  if v_creator_currency !~ '^[A-Z]{3}$' then v_creator_currency:=null; end if;

  v_patch:=jsonb_build_object(
    'original_currency',v_currency,'creator_base_currency',v_creator_currency,
    'platform_base_currency',v_platform_base,'settlement_currency',v_currency,
    'payout_currency',case when tg_table_name='withdrawal_requests' then v_currency else null end,
    'fx_rate',null,'fx_provider',null,'fx_timestamp',null
  );
  if v_currency is not null and v_platform_base is not null then
    if v_currency=v_platform_base then
      v_patch:=v_patch||jsonb_build_object('fx_rate',1,'fx_provider','identity','fx_timestamp',v_now);
    else
      select * into v_rate from public.platform_fx_rate_cache
        where base_currency=v_currency and quote_currency=v_platform_base and expires_at>v_now
        order by retrieved_at desc limit 1;
      if found then v_patch:=v_patch||jsonb_build_object('fx_rate',v_rate.rate,'fx_provider',v_rate.provider_key,'fx_timestamp',v_rate.retrieved_at); end if;
    end if;
  end if;
  new:=jsonb_populate_record(new,v_patch);
  return new;
end;
$$;
revoke all on function public.stamp_financial_currency_snapshot() from public,anon,authenticated;
comment on function public.stamp_financial_currency_snapshot() is
'Database-authored immutable currency snapshot. Derives source currency from transaction records, creator currency from canonical content/event prices, platform base currency from platform settings, and FX only from a fresh provider cache. Never accepts caller-supplied snapshots or fabricates rates.';

do $$
declare v_table text; v_existing text;
begin
  foreach v_table in array array[
    'email_provider_configs','event_early_bird_reservations','guest_payment_orders',
    'live_payment_orders','payment_provider_configs','payment_refunds','platform_ai_policies',
    'platform_feature_controls','platform_fx_rate_cache','platform_release_audit',
    'platform_release_observations','platform_release_rollouts','screening_playback_sessions',
    'service_provider_bindings','stream_provider_event_logs'
  ] loop
    if to_regclass(format('public.%I',v_table)) is not null then
      select obj_description(format('public.%I',v_table)::regclass,'pg_class') into v_existing;
      execute format('comment on table public.%I is %L',v_table,
        'Data API classification: INTERNAL_SERVICE_ROLE_ONLY. RLS is enabled; no end-user policies or grants. '||coalesce(v_existing,''));
      execute format('revoke all privileges on table public.%I from anon,authenticated',v_table);
      execute format('grant all privileges on table public.%I to service_role',v_table);
    end if;
  end loop;
end $$;

do $$
declare v_table text; v_existing text; v_class text;
begin
  foreach v_table in array array[
    'analytics_events','audit_logs','business_verifications','channels','content','country_currency_rules',
    'creator_gift_catalog','event_waitlist','fan_blasts','feature_flags','filmmaker_submissions',
    'identity_verifications','knowledgebase_articles','knowledgebase_categories','live_reactions',
    'loyalty_points','payment_gateways','payments','platform_branding_registry','platform_settings',
    'profiles','promo_banners','promo_codes','release_domains','revenue_splits','screening_comments',
    'screening_notifications','screening_tickets','screenings','studio_accounts','studio_members',
    'subscription_plans','subscriptions','support_agents','support_messages','support_sla_policies',
    'support_tickets','tickets','user_roles','wallet_ledger','watch_history','watch_party_participants',
    'watch_party_rooms','watchlists','withdrawal_requests'
  ] loop
    if to_regclass(format('public.%I',v_table)) is not null then
      select obj_description(format('public.%I',v_table)::regclass,'pg_class') into v_existing;
      v_class:=case
        when v_table in ('country_currency_rules','creator_gift_catalog','knowledgebase_articles','knowledgebase_categories','platform_branding_registry','promo_banners','release_domains','subscription_plans','channels')
          then 'PUBLIC_READ_REQUIRES_RLS'
        when v_table in ('content','screenings','screening_comments','profiles')
          then 'PUBLIC_OR_OWNER_DATA_REQUIRES_RLS_AND_COLUMN_GRANTS'
        else 'AUTHENTICATED_OWNER_OR_ADMIN_RLS_ONLY'
      end;
      execute format('comment on table public.%I is %L',v_table,
        'pg_graphql classification: '||v_class||'. Preserve row-level and column-level policies; do not grant broader access. '||coalesce(v_existing,''));
    end if;
  end loop;
end $$;

comment on view public.public_content_catalog is
'pg_graphql classification: PUBLIC_READ_SAFE_CATALOG_VIEW. Use this view for anonymous catalogue discovery; underlying content media and private metadata remain protected.';
comment on view public.public_screenings_catalog is
'pg_graphql classification: PUBLIC_READ_SAFE_CATALOG_VIEW. Use this view for anonymous screening discovery; private events and entitlement data remain protected.';
comment on function public.get_content_support_feed(uuid) is
'Public read RPC. Returns only published, publicly visible content contributions; private event and identity fields are excluded.';
comment on function public.get_event_contribution_feed(uuid,uuid) is
'Public read RPC. Returns only contributions for published public events; invite-only/private event access is not exposed.';
comment on function public.resolve_release_domain(text) is
'Public read RPC. Resolves an active verified hostname to its public storefront configuration; no credentials or private owner fields are returned.';
