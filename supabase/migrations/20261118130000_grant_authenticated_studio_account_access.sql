-- studio_accounts is protected by owner-scoped RLS policies. The table
-- previously had no table-level grants for authenticated users, so PostgREST
-- returned "permission denied for table studio_accounts" before RLS ran.
-- Grant only the operations required by the creator tier card; RLS continues
-- to constrain every row to auth.uid() = user_id and pending submissions.
grant select, insert, update on table public.studio_accounts to authenticated;
