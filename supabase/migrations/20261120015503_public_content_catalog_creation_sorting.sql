grant select (created_at) on public.content to anon;
create or replace view public.public_content_catalog with (security_invoker=true,security_barrier=true) as select id,title,description,type,poster_url,trailer_url,duration,release_date,genres,created_at from public.content where status='published';
