-- Public discovery is available without an account. Keep private playback assets,
-- provider identifiers, tenant configuration and transactional data out of the
-- anonymous catalog surface. RLS continues to expose published rows only.
GRANT SELECT (
  id, title, slug, description, type, status, poster_url, banner_url,
  thumbnail_url, trailer_url, duration, release_date, genres, tags,
  monetization, price, currency, availability_start, availability_end,
  cast_crew, rating, is_featured, parent_id, season_number, episode_number,
  sort_order, view_count, like_count, created_at, updated_at
) ON TABLE public.content TO anon, authenticated;

GRANT SELECT (
  id, content_id, title, slug, description, poster_url, banner_url,
  trailer_url, release_date, screening_date, duration, location_pricing,
  status, event_type, lifecycle, live_price_ngn, live_price_usd,
  live_recording_status, live_started_at, live_ended_at,
  live_replay_ready_at, replay_price_ngn, replay_price_usd,
  replay_access_hours, refund_policy, cast_crew, gallery_images,
  age_rating, star_rating, review_count, allowed_countries,
  blocked_countries, cancelled_at, created_at, updated_at
) ON TABLE public.screenings TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view published content" ON public.content;
CREATE POLICY "Anyone can view published content"
  ON public.content FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Anyone can view published screenings" ON public.screenings;
CREATE POLICY "Anyone can view published screenings"
  ON public.screenings FOR SELECT TO anon, authenticated
  USING (status = 'published');
