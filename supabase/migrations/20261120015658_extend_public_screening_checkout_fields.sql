create or replace view public.public_screenings_catalog
with (security_barrier=true,security_invoker=false)
as select
  id,content_id,title,slug,description,poster_url,banner_url,trailer_url,release_date,
  screening_date,duration,location_pricing,status,event_type,lifecycle,live_price_ngn,
  live_price_usd,live_recording_status,live_started_at,live_ended_at,live_replay_ready_at,
  replay_price_ngn,replay_price_usd,replay_access_hours,refund_policy,cast_crew,
  gallery_images,age_rating,star_rating,review_count,allowed_countries,blocked_countries,
  cancelled_at,created_at,updated_at,base_price,base_currency,early_bird_price,
  early_bird_currency,early_bird_ends_at,early_bird_capacity,release_access_at,
  event_timezone,presale_enabled,sales_open_at,sales_close_at,
  replay_base_price,access_model,replay_access_model
from public.screenings
where status='published'
  and coalesce(event_visibility,'public') in ('public','unlisted')
  and coalesce(invite_only,false)=false;
alter view public.public_screenings_catalog owner to postgres;
grant select on public.public_screenings_catalog to anon,authenticated;
