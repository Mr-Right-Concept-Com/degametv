-- Remove inherited table-wide catalog reads from anonymous/public roles.
-- Re-grant authenticated users their existing full catalog access, while guests
-- receive only fields intended for public discovery and commerce.
REVOKE SELECT ON TABLE public.content FROM PUBLIC, anon;
REVOKE SELECT ON TABLE public.screenings FROM PUBLIC, anon;

REVOKE SELECT (creator_id, tenant_id, metadata, video_url)
  ON TABLE public.content FROM PUBLIC, anon;
REVOKE SELECT (tenant_id, metadata, live_provider_asset_id)
  ON TABLE public.screenings FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.content TO authenticated;
GRANT SELECT ON TABLE public.screenings TO authenticated;

GRANT SELECT (
  id, title, slug, description, type, status, poster_url, banner_url,
  thumbnail_url, trailer_url, duration, release_date, genres, tags,
  monetization, price, currency, availability_start, availability_end,
  cast_crew, rating, is_featured, parent_id, season_number, episode_number,
  sort_order, view_count, like_count, created_at, updated_at
) ON TABLE public.content TO anon;

GRANT SELECT (
  id, content_id, title, slug, description, poster_url, banner_url,
  trailer_url, release_date, screening_date, duration, location_pricing,
  status, event_type, lifecycle, live_price_ngn, live_price_usd,
  live_recording_status, live_started_at, live_ended_at,
  live_replay_ready_at, replay_price_ngn, replay_price_usd,
  replay_access_hours, refund_policy, cast_crew, gallery_images,
  age_rating, star_rating, review_count, allowed_countries,
  blocked_countries, cancelled_at, created_at, updated_at
) ON TABLE public.screenings TO anon;