-- Financial and ticket RLS policies are identity-scoped and must not target
-- PUBLIC/anon. Public catalog reads are intentionally excluded.
begin;
do $$
declare
  v_table text;
  v_policy text;
begin
  for v_table,v_policy in
    select tablename,policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('payment_gateways','payments','screening_tickets','tickets')
      and policyname in (
        'Super admins can manage payment gateways',
        'Super admins can view all payments',
        'Users can view their payments',
        'Super admins can view all tickets',
        'Users can view their own tickets',
        'Super admins can manage tickets',
        'Users can view their tickets'
      )
  loop
    if exists (
      select 1 from pg_policies p
      where p.schemaname='public' and p.tablename=v_table and p.policyname=v_policy
        and ('public'=any(p.roles) or 'anon'=any(p.roles))
    ) then
      raise exception 'identity_scoped_policy_includes_public_or_anon: %.%',v_table,v_policy;
    end if;
  end loop;

  if exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename in ('payment_gateways','payments','screening_tickets','tickets')
      and policyname in (
        'Super admins can manage payment gateways',
        'Super admins can view all payments',
        'Users can view their payments',
        'Super admins can view all tickets',
        'Users can view their own tickets',
        'Super admins can manage tickets',
        'Users can view their tickets'
      )
      and not ('authenticated'=any(roles))
  ) then
    raise exception 'identity_scoped_policy_missing_authenticated_role';
  end if;

  if has_table_privilege('anon','public.payments','select')
     or has_table_privilege('anon','public.payment_gateways','select')
     or has_table_privilege('anon','public.tickets','select')
     or has_table_privilege('anon','public.screening_tickets','select') then
    raise exception 'anonymous_financial_or_ticket_table_select_grant_present';
  end if;

  -- The creator gift catalogue remains publicly readable by design.
  if not has_table_privilege('anon','public.creator_gift_catalog','select') then
    raise exception 'public_creator_gift_catalog_read_was_unintentionally_removed';
  end if;
end $$;
rollback;
