-- Run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase1_currency_snapshot.sql
begin;
create temporary table phase1_currency_snapshot_probe(
  id uuid primary key default gen_random_uuid(),currency text,
  original_currency text,creator_base_currency text,platform_base_currency text,
  settlement_currency text,payout_currency text,fx_rate numeric,fx_provider text,fx_timestamp timestamptz
) on commit drop;
create trigger phase1_currency_snapshot_probe_trigger
before insert or update on phase1_currency_snapshot_probe
for each row execute function public.stamp_financial_currency_snapshot();
do $$
declare v_base text; v_id uuid; v_row record;
begin
  select upper(setting_value #>> '{}') into v_base from public.platform_settings where setting_key='base_currency' limit 1;
  if v_base is null or v_base !~ '^[A-Z]{3}$' then raise exception 'platform_base_currency_not_configured'; end if;
  insert into phase1_currency_snapshot_probe(currency,original_currency,platform_base_currency,fx_rate)
  values(v_base,'XXX','XXX',999) returning id into v_id;
  select * into v_row from phase1_currency_snapshot_probe where id=v_id;
  if v_row.original_currency<>v_base or v_row.platform_base_currency<>v_base or v_row.fx_rate<>1 or v_row.fx_provider<>'identity' then
    raise exception 'insert_snapshot_not_database_authored';
  end if;
  update phase1_currency_snapshot_probe set original_currency='ZZZ',platform_base_currency='ZZZ',fx_rate=9 where id=v_id;
  select * into v_row from phase1_currency_snapshot_probe where id=v_id;
  if v_row.original_currency<>v_base or v_row.platform_base_currency<>v_base or v_row.fx_rate<>1 then
    raise exception 'snapshot_changed_after_insert';
  end if;
end $$;
rollback;
