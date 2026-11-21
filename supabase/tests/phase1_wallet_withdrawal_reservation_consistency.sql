-- Wallet display and withdrawal reservation must share the same terminal-state
-- predicate. Failed/rejected requests release funds; pending/approved/processing
-- requests continue to reserve them. This is a structural regression test and
-- deliberately does not manufacture or mutate financial records.
begin;
do $$
declare
  v_balance text;
  v_by_currency text;
  v_request text;
begin
  select pg_get_functiondef('public.wallet_balance(uuid)'::regprocedure) into v_balance;
  select pg_get_functiondef('public.wallet_balance_by_currency(uuid)'::regprocedure) into v_by_currency;
  select pg_get_functiondef(
    'public.request_wallet_withdrawal(numeric,text,text,text,text,text)'::regprocedure
  ) into v_request;

  if position('w.status NOT IN (''rejected'', ''failed'')' in v_balance)=0 then
    raise exception 'wallet_balance_terminal_withdrawal_predicate_mismatch';
  end if;
  if position('w.status NOT IN (''rejected'', ''failed'')' in v_by_currency)=0 then
    raise exception 'wallet_balance_by_currency_terminal_withdrawal_predicate_mismatch';
  end if;
  if position('w.status not in (''rejected'',''failed'')' in v_request)=0 then
    raise exception 'request_wallet_withdrawal_terminal_predicate_changed_without_reconciliation';
  end if;
  if position('w.currency = l.currency' in v_by_currency)=0 then
    raise exception 'currency_specific_withdrawal_reservation_missing';
  end if;

  -- Client-visible summary RPCs must not permit a caller to inspect another
  -- user's creator wallet. Their authorization predicate must remain present.
  if position('auth.uid()' in v_balance)=0 or position('is_super_admin' in v_balance)=0
     or position('auth.uid()' in v_by_currency)=0 or position('is_super_admin' in v_by_currency)=0 then
    raise exception 'wallet_balance_owner_or_super_admin_guard_missing';
  end if;
end $$;
rollback;
