-- Stamp immutable currency context at the database boundary for all canonical financial records.
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
  v_rate public.platform_fx_rate_cache%rowtype;
  v_now timestamptz := now();
  v_field text;
begin
  v_currency := upper(coalesce(nullif(v_row->>'original_currency',''),nullif(v_row->>'currency',''),nullif(v_row->>'display_currency','')));
  if coalesce(v_row->>'original_currency','') = '' and v_currency <> '' then
    v_patch := v_patch || jsonb_build_object('original_currency',v_currency);
  end if;

  select upper(setting_value #>> '{}') into v_platform_base
  from public.platform_settings where setting_key='base_currency' limit 1;
  if v_platform_base ~ '^[A-Z]{3}$' and coalesce(v_row->>'platform_base_currency','') = '' then
    v_patch := v_patch || jsonb_build_object('platform_base_currency',v_platform_base);
  end if;

  if coalesce(v_row->>'settlement_currency','') = '' and v_currency <> '' then
    v_patch := v_patch || jsonb_build_object('settlement_currency',v_currency);
  end if;
  if tg_table_name='withdrawal_requests' and coalesce(v_row->>'payout_currency','') = '' and v_currency <> '' then
    v_patch := v_patch || jsonb_build_object('payout_currency',v_currency);
  end if;

  if coalesce(v_row->>'fx_rate','') = '' and v_currency <> '' and v_platform_base ~ '^[A-Z]{3}$' then
    if v_currency = v_platform_base then
      v_patch := v_patch || jsonb_build_object('fx_rate',1,'fx_provider','identity','fx_timestamp',v_now);
    else
      select * into v_rate from public.platform_fx_rate_cache
      where base_currency=v_currency and quote_currency=v_platform_base and expires_at>v_now
      order by retrieved_at desc limit 1;
      if found then
        v_patch := v_patch || jsonb_build_object('fx_rate',v_rate.rate,'fx_provider',v_rate.provider_key,'fx_timestamp',v_rate.retrieved_at);
      end if;
    end if;
  end if;

  if tg_op='UPDATE' then
    v_old := to_jsonb(old);
    foreach v_field in array array['original_currency','creator_base_currency','platform_base_currency','settlement_currency','payout_currency','fx_rate','fx_provider','fx_timestamp'] loop
      if coalesce(v_old->>v_field,'') <> '' then
        v_patch := v_patch || jsonb_build_object(v_field,v_old->v_field);
      end if;
    end loop;
  end if;

  if v_patch <> '{}'::jsonb then
    new := jsonb_populate_record(new,v_patch);
  end if;
  return new;
end;
$$;
revoke all on function public.stamp_financial_currency_snapshot() from public,anon,authenticated;

do $$
declare t text;
begin
  foreach t in array array['payments','event_contributions','guest_payment_orders','live_payment_orders','wallet_ledger','withdrawal_requests','payment_refunds','tickets','screening_tickets'] loop
    if to_regclass(format('public.%I',t)) is not null then
      execute format('drop trigger if exists %I on public.%I',t||'_currency_snapshot',t);
      execute format('create trigger %I before insert or update on public.%I for each row execute function public.stamp_financial_currency_snapshot()',t||'_currency_snapshot',t);
    end if;
  end loop;
end $$;
comment on function public.stamp_financial_currency_snapshot() is 'Stamps immutable transaction currency context from platform base currency and a fresh provider FX cache. Never invents a non-identity FX rate.';
