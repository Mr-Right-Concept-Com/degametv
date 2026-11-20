create or replace function public.stamp_financial_currency_snapshot()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_row jsonb:=to_jsonb(new);v_old jsonb;v_patch jsonb:='{}'::jsonb;
 v_currency text;v_platform_base text;v_creator_currency text;v_settlement_currency text;v_provider_key text;
 v_rate public.platform_fx_rate_cache%rowtype;v_now timestamptz:=now();
begin
 if tg_op='UPDATE' then
  v_old:=to_jsonb(old);
  v_patch:=jsonb_build_object('original_currency',v_old->'original_currency','creator_base_currency',v_old->'creator_base_currency',
   'platform_base_currency',v_old->'platform_base_currency','settlement_currency',v_old->'settlement_currency',
   'payout_currency',v_old->'payout_currency','fx_rate',v_old->'fx_rate','fx_provider',v_old->'fx_provider','fx_timestamp',v_old->'fx_timestamp');
  new:=jsonb_populate_record(new,v_patch);return new;
 end if;
 v_currency:=upper(coalesce(nullif(v_row->>'currency',''),nullif(v_row->>'display_currency','')));
 if v_currency !~ '^[A-Z]{3}$' then v_currency:=null;end if;
 select upper(setting_value #>> '{}') into v_platform_base from public.platform_settings where setting_key='base_currency' limit 1;
 if v_platform_base !~ '^[A-Z]{3}$' then v_platform_base:=null;end if;
 if nullif(v_row->>'content_id','') is not null then
  select upper(nullif(currency,'')) into v_creator_currency from public.content where id=(v_row->>'content_id')::uuid;
 elsif nullif(v_row->>'screening_id','') is not null then
  select upper(nullif(base_currency,'')) into v_creator_currency from public.screenings where id=(v_row->>'screening_id')::uuid;
 elsif nullif(v_row->>'stream_id','') is not null then
  select upper(nullif(currency,'')) into v_creator_currency from public.live_streams where id=(v_row->>'stream_id')::uuid;
 elsif nullif(v_row->>'ticket_id','') is not null then
  select coalesce(upper(nullif(c.currency,'')),upper(nullif(ls.currency,''))) into v_creator_currency from public.tickets t
   left join public.content c on c.id=t.content_id left join public.live_streams ls on ls.id=t.stream_id where t.id=(v_row->>'ticket_id')::uuid;
 elsif nullif(v_row->>'live_ticket_id','') is not null then
  select upper(nullif(s.base_currency,'')) into v_creator_currency from public.screening_tickets st
   join public.screenings s on s.id=st.screening_id where st.id=(v_row->>'live_ticket_id')::uuid;
 elsif nullif(v_row->>'event_contribution_id','') is not null then
  select coalesce(upper(nullif(c.currency,'')),upper(nullif(s.base_currency,'')),upper(nullif(ls.currency,''))) into v_creator_currency
   from public.event_contributions ec left join public.content c on c.id=ec.content_id left join public.screenings s on s.id=ec.screening_id
   left join public.live_streams ls on ls.id=ec.live_stream_id where ec.id=(v_row->>'event_contribution_id')::uuid;
 elsif nullif(v_row->>'contribution_id','') is not null then
  select coalesce(upper(nullif(c.currency,'')),upper(nullif(s.base_currency,'')),upper(nullif(ls.currency,''))) into v_creator_currency
   from public.event_contributions ec left join public.content c on c.id=ec.content_id left join public.screenings s on s.id=ec.screening_id
   left join public.live_streams ls on ls.id=ec.live_stream_id where ec.id=(v_row->>'contribution_id')::uuid;
 end if;
 if v_creator_currency !~ '^[A-Z]{3}$' then v_creator_currency:=null;end if;
 v_provider_key:=coalesce(nullif(v_row->>'provider',''),nullif(v_row->>'provider_key',''));
 if v_provider_key is not null then
  select upper(nullif(settings->>'settlement_currency','')) into v_settlement_currency
   from public.service_provider_bindings where capability='payments' and provider_key=v_provider_key and removed_at is null;
 end if;
 if tg_table_name in ('wallet_ledger','withdrawal_requests') then v_settlement_currency:=v_currency;end if;
 if v_settlement_currency !~ '^[A-Z]{3}$' then v_settlement_currency:=null;end if;
 v_patch:=jsonb_build_object('original_currency',v_currency,'creator_base_currency',v_creator_currency,
  'platform_base_currency',v_platform_base,'settlement_currency',v_settlement_currency,
  'payout_currency',case when tg_table_name='withdrawal_requests' then v_currency else null end,
  'fx_rate',null,'fx_provider',null,'fx_timestamp',null);
 if v_currency is not null and v_platform_base is not null then
  if v_currency=v_platform_base then v_patch:=v_patch||jsonb_build_object('fx_rate',1,'fx_provider','identity','fx_timestamp',v_now);
  else
   select * into v_rate from public.platform_fx_rate_cache where base_currency=v_currency and quote_currency=v_platform_base and expires_at>v_now order by retrieved_at desc limit 1;
   if found then v_patch:=v_patch||jsonb_build_object('fx_rate',v_rate.rate,'fx_provider',v_rate.provider_key,'fx_timestamp',v_rate.retrieved_at);end if;
  end if;
 end if;
 new:=jsonb_populate_record(new,v_patch);return new;
end;
$$;
revoke all on function public.stamp_financial_currency_snapshot() from public,anon,authenticated;
comment on function public.stamp_financial_currency_snapshot() is
'Database-authored immutable currency snapshot. Settlement currency is recorded only when confirmed by the configured payment provider or the authoritative wallet ledger; payout currency is recorded from withdrawal currency. No caller-supplied snapshot or estimated FX is accepted.';
