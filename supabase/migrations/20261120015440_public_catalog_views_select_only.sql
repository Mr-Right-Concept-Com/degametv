revoke all on public.public_content_catalog, public.public_screenings_catalog from public, anon, authenticated;
grant select on public.public_content_catalog, public.public_screenings_catalog to anon, authenticated;
