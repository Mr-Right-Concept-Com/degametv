alter table public.screenings
  add column if not exists live_price_ngn numeric(12,2),
  add column if not exists live_price_usd numeric(12,2),
  add column if not exists live_recording_status text not null default 'not_started',
  add column if not exists live_provider_asset_id text,
  add column if not exists live_started_at timestamptz,
  add column if not exists live_ended_at timestamptz,
  add column if not exists live_replay_ready_at timestamptz;
alter table public.screenings
  add constraint screenings_live_price_ngn_nonnegative check (live_price_ngn is null or live_price_ngn >= 0),
  add constraint screenings_live_price_usd_nonnegative check (live_price_usd is null or live_price_usd >= 0),
  add constraint screenings_replay_price_ngn_nonnegative check (replay_price_ngn is null or replay_price_ngn >= 0),
  add constraint screenings_replay_price_usd_nonnegative check (replay_price_usd is null or replay_price_usd >= 0),
  add constraint screenings_live_recording_status_check check (live_recording_status in ('not_started','recording','processing','ready','failed'));
alter table public.live_streams alter column stream_key drop not null;
