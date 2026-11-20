drop policy if exists "Anyone can view published content" on public.content;
create policy "Anonymous can view published content" on public.content for select to anon using (status='published');

drop policy if exists "Public can view published non-private screenings" on public.screenings;
create policy "Anonymous can view published non-private screenings" on public.screenings for select to anon using (
 status='published' and coalesce(event_visibility,'public') in ('public','unlisted') and coalesce(invite_only,false)=false
);

revoke select (id,title,description,type,poster_url,trailer_url,duration,release_date,genres,status,created_at) on public.content from anon;
revoke select (
 id,content_id,title,slug,description,poster_url,banner_url,trailer_url,release_date,screening_date,duration,
 location_pricing,status,event_type,lifecycle,live_price_ngn,live_price_usd,live_recording_status,live_started_at,
 live_ended_at,live_replay_ready_at,replay_price_ngn,replay_price_usd,replay_access_hours,refund_policy,cast_crew,
 gallery_images,age_rating,star_rating,review_count,allowed_countries,blocked_countries,cancelled_at,created_at,
 updated_at,base_price,base_currency,early_bird_price,early_bird_currency,early_bird_ends_at,early_bird_capacity,
 release_access_at,event_timezone,presale_enabled,sales_open_at,sales_close_at,event_visibility,invite_only
) on public.screenings from anon;

alter view public.public_content_catalog set (security_invoker=false,security_barrier=true);
alter view public.public_screenings_catalog set (security_invoker=false,security_barrier=true);
alter view public.public_content_catalog owner to postgres;
alter view public.public_screenings_catalog owner to postgres;
grant select on public.public_content_catalog,public.public_screenings_catalog to anon,authenticated;
