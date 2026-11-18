-- Keep creator tier submission behind an authenticated owner-scoped RPC.
-- This avoids exposing studio_accounts writes to the browser while preserving
-- the existing RLS policies and business-verification gate.
create or replace function public.submit_my_studio_account(p_tier text)
returns table(tier text, status text)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := auth.uid();
  v_current_status text;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_tier not in ('creator', 'business') then
    raise exception 'invalid_studio_tier' using errcode = '22023';
  end if;

  select sa.status into v_current_status
  from public.studio_accounts sa
  where sa.user_id = v_user
  for update;

  if v_current_status = 'approved' then
    raise exception 'studio_account_already_approved' using errcode = '42501';
  end if;

  if p_tier = 'business' and not exists (
    select 1
    from public.business_verifications bv
    where bv.user_id = v_user
      and bv.status in ('pending', 'processing', 'verified')
  ) then
    raise exception 'business_verification_required' using errcode = '42501';
  end if;

  insert into public.studio_accounts(user_id, tier, status, updated_at)
  values (v_user, p_tier, 'pending', now())
  on conflict (user_id) do update
    set tier = excluded.tier,
        status = 'pending',
        updated_at = now()
    where public.studio_accounts.user_id = v_user
      and public.studio_accounts.status <> 'approved';

  return query
    select sa.tier, sa.status
    from public.studio_accounts sa
    where sa.user_id = v_user;
end;
$function$;

revoke all on function public.submit_my_studio_account(text) from public;
revoke all on function public.submit_my_studio_account(text) from anon;
grant execute on function public.submit_my_studio_account(text) to authenticated;
