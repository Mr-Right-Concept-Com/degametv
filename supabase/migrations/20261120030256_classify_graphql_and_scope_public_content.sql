comment on schema public is E'@graphql({"introspection": false, "max_rows": 50})';
create or replace function public.is_active_support_agent(p_user_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$ select auth.uid() is not null and auth.uid()=p_user_id and exists(select 1 from public.support_agents a where a.user_id=p_user_id and a.is_active=true); $$;
revoke all on function public.is_active_support_agent(uuid) from public,anon;
grant execute on function public.is_active_support_agent(uuid) to authenticated;
comment on function public.is_active_support_agent(uuid) is 'RLS helper: confirms that the caller is the requested active support agent; never accepts an arbitrary user id.';
drop policy if exists knowledgebase_articles_public_read on public.knowledgebase_articles;
create policy knowledgebase_articles_public_read_anon on public.knowledgebase_articles
 for select to anon using(is_published and published_at is not null and published_at<=now() and audience in ('all','public','viewer'));
create policy knowledgebase_articles_audience_read_authenticated on public.knowledgebase_articles
 for select to authenticated using(
  is_published and published_at is not null and published_at<=now() and (
   audience in ('all','public','viewer')
   or (audience in ('creator','studio') and public.is_approved_creator(auth.uid()))
   or (audience in ('business','licensee_admin') and public.has_role(auth.uid(),'licensee_admin'::public.app_role))
   or (audience in ('support','technical') and public.is_active_support_agent(auth.uid()))
   or (audience='admin' and (public.has_role(auth.uid(),'platform_admin'::public.app_role) or public.has_role(auth.uid(),'super_admin'::public.app_role)))
  )
 );
drop policy if exists "Anyone can read comments" on public.screening_comments;
drop policy if exists "Anyone can post comments" on public.screening_comments;
create policy screening_comments_visible_event_read on public.screening_comments for select to anon,authenticated using(
 exists(select 1 from public.screenings s where s.id=screening_comments.screening_id and s.status='published' and coalesce(s.event_visibility,'public') in ('public','unlisted') and coalesce(s.invite_only,false)=false)
 or (auth.uid() is not null and exists(select 1 from public.screenings s join public.content c on c.id=s.content_id where s.id=screening_comments.screening_id and c.creator_id=auth.uid()))
 or (auth.uid() is not null and exists(select 1 from public.event_access_invites i where i.screening_id=screening_comments.screening_id and i.invited_user_id=auth.uid() and i.status='accepted' and (i.expires_at is null or i.expires_at>now())))
 or (auth.uid() is not null and exists(select 1 from public.screening_tickets t where t.screening_id=screening_comments.screening_id and t.user_id=auth.uid() and t.payment_status in ('paid','completed','succeeded') and t.refunded_at is null))
 or public.is_super_admin(auth.uid())
);
create policy screening_comments_visible_event_insert on public.screening_comments for insert to anon,authenticated with check(
 nickname is not null and length(btrim(nickname)) between 1 and 80 and comment is not null and length(btrim(comment)) between 1 and 2000
 and (
  exists(select 1 from public.screenings s where s.id=screening_comments.screening_id and s.status='published' and coalesce(s.event_visibility,'public') in ('public','unlisted') and coalesce(s.invite_only,false)=false)
  or (auth.uid() is not null and exists(select 1 from public.screenings s join public.content c on c.id=s.content_id where s.id=screening_comments.screening_id and c.creator_id=auth.uid()))
  or (auth.uid() is not null and exists(select 1 from public.event_access_invites i where i.screening_id=screening_comments.screening_id and i.invited_user_id=auth.uid() and i.status='accepted' and (i.expires_at is null or i.expires_at>now())))
  or (auth.uid() is not null and exists(select 1 from public.screening_tickets t where t.screening_id=screening_comments.screening_id and t.user_id=auth.uid() and t.payment_status in ('paid','completed','succeeded') and t.refunded_at is null))
 )
);
revoke select on table public.screening_comments from anon,authenticated;
grant select(id,screening_id,nickname,comment,created_at) on table public.screening_comments to anon,authenticated;
comment on table public.screening_comments is E'@graphql({"description":"Public discussion. Email is hidden; rows and inserts are restricted to public screenings or verified creator, invite and ticket access.","max_rows":50})';
comment on table public.service_provider_bindings is E'@graphql({"description":"Internal Vault-backed provider registry. Backend-only; never grant Data API or GraphQL access."})';
comment on table public.service_provider_secret_versions is E'@graphql({"description":"Internal Vault secret version metadata. Backend-only; contains no plaintext secrets."})';
comment on table public.platform_ai_policies is E'@graphql({"description":"Internal AI workflow policy controls. Backend-only; managed through privileged control plane."})';
comment on table public.platform_release_rollouts is E'@graphql({"description":"Internal release rollout state. Backend-only; managed through privileged control plane."})';
comment on table public.platform_release_audit is E'@graphql({"description":"Internal immutable release audit events. Backend-only."})';
comment on table public.platform_release_observations is E'@graphql({"description":"Internal canary health observations. Backend-only."})';
comment on table public.content is E'@graphql({"description":"Published content catalogue. Row-level security controls creator ownership and publication visibility.","max_rows":50})';
comment on table public.screenings is E'@graphql({"description":"Published public/unlisted screenings only. Private and invite-only screenings are excluded by row-level security.","max_rows":50})';
comment on table public.knowledgebase_articles is E'@graphql({"description":"Published support knowledge. Audience-specific row-level security restricts creator, business, technical and admin articles.","max_rows":50})';
comment on table public.platform_branding_registry is E'@graphql({"description":"Public branding tokens for web and native clients. Only records marked public are readable.","max_rows":20})';
comment on table public.country_currency_rules is E'@graphql({"description":"Enabled ISO country and currency rules for public localization and checkout display.","max_rows":300})';
