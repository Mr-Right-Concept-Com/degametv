create or replace function public.get_my_studio_account()
returns table(tier text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select sa.tier, sa.status
  from public.studio_accounts sa
  where sa.user_id = auth.uid()
  limit 1;
$$;
revoke all on function public.get_my_studio_account() from public, anon;
grant execute on function public.get_my_studio_account() to authenticated;
