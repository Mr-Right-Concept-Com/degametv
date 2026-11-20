
BEGIN;
CREATE TABLE IF NOT EXISTS public.personal_wallet_accounts (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 balance_minor bigint NOT NULL DEFAULT 0 CHECK(balance_minor>=0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,currency)
);
CREATE TABLE IF NOT EXISTS public.personal_wallet_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 entry_type text NOT NULL CHECK(entry_type IN ('topup_credit','contribution_debit','ticket_debit','refund_credit','adjustment')),
 amount_minor bigint NOT NULL CHECK(amount_minor>0),balance_after_minor bigint NOT NULL CHECK(balance_after_minor>=0),
 idempotency_key text NOT NULL,reference text,
 related_contribution_id uuid REFERENCES public.event_contributions(id) ON DELETE RESTRICT,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT personal_wallet_ledger_user_idempotency_unique UNIQUE(user_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS personal_wallet_ledger_user_currency_created_idx ON public.personal_wallet_ledger(user_id,currency,created_at DESC);
CREATE TABLE IF NOT EXISTS public.wallet_topup_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 provider_key text NOT NULL,provider_reference text NOT NULL UNIQUE,provider_checkout_id text,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),amount_major numeric NOT NULL CHECK(amount_major>0),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),provider_mode text NOT NULL CHECK(provider_mode IN ('live','test')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','refunded')),
 checkout_url text,idempotency_key uuid NOT NULL,provider_transaction_id text,paid_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT wallet_topup_orders_user_idempotency_unique UNIQUE(user_id,idempotency_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_topup_orders_provider_transaction_unique ON public.wallet_topup_orders(provider_key,provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
ALTER TABLE public.personal_wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_topup_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS personal_wallet_accounts_owner_read ON public.personal_wallet_accounts;
CREATE POLICY personal_wallet_accounts_owner_read ON public.personal_wallet_accounts FOR SELECT TO authenticated USING((SELECT auth.uid())=user_id);
DROP POLICY IF EXISTS personal_wallet_ledger_owner_read ON public.personal_wallet_ledger;
CREATE POLICY personal_wallet_ledger_owner_read ON public.personal_wallet_ledger FOR SELECT TO authenticated USING((SELECT auth.uid())=user_id);
DROP POLICY IF EXISTS wallet_topup_orders_owner_read ON public.wallet_topup_orders;
CREATE POLICY wallet_topup_orders_owner_read ON public.wallet_topup_orders FOR SELECT TO authenticated USING((SELECT auth.uid())=user_id);
REVOKE ALL ON public.personal_wallet_accounts,public.personal_wallet_ledger,public.wallet_topup_orders FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.personal_wallet_accounts,public.personal_wallet_ledger,public.wallet_topup_orders TO authenticated;
GRANT ALL ON public.personal_wallet_accounts,public.personal_wallet_ledger,public.wallet_topup_orders TO service_role;
DROP TRIGGER IF EXISTS personal_wallet_ledger_immutable ON public.personal_wallet_ledger;
CREATE TRIGGER personal_wallet_ledger_immutable BEFORE UPDATE OR DELETE ON public.personal_wallet_ledger FOR EACH ROW EXECUTE FUNCTION public.reject_personal_wallet_ledger_mutation();
CREATE OR REPLACE FUNCTION public.reject_personal_wallet_ledger_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin raise exception 'personal_wallet_ledger_is_immutable' using errcode='42501'; end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_my_personal_wallet_balances()
 RETURNS TABLE(currency text, balance_minor bigint, balance_major numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
 return query select a.currency,a.balance_minor,a.balance_minor::numeric/
  case when a.currency in ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') then 1
       when a.currency in ('BHD','IQD','JOD','KWD','LYD','OMR','TND') then 1000 else 100 end
 from public.personal_wallet_accounts a where a.user_id=v_user order by a.currency;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.credit_personal_wallet_topup(p_reference text, p_transaction_id text, p_amount_minor bigint, p_currency text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare o public.wallet_topup_orders%rowtype;v_balance bigint;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
 if p_reference is null or p_transaction_id is null or length(trim(p_transaction_id))=0 or p_amount_minor is null or p_amount_minor<=0 or p_currency !~ '^[A-Z]{3}$' then raise exception 'invalid_verified_topup' using errcode='22023'; end if;
 select * into o from public.wallet_topup_orders where provider_reference=p_reference for update;
 if not found then raise exception 'wallet_topup_not_found' using errcode='P0002'; end if;
 if o.amount_minor<>p_amount_minor or o.currency<>p_currency then raise exception 'wallet_topup_payment_mismatch' using errcode='22023'; end if;
 if o.status='paid' then select balance_minor into v_balance from public.personal_wallet_accounts where user_id=o.user_id and currency=o.currency;return jsonb_build_object('success',true,'already_credited',true,'currency',o.currency,'balance_minor',v_balance);end if;
 if o.status<>'pending' then raise exception 'wallet_topup_not_pending' using errcode='22023';end if;
 insert into public.personal_wallet_accounts(user_id,currency,balance_minor) values(o.user_id,o.currency,0) on conflict(user_id,currency) do nothing;
 select balance_minor into v_balance from public.personal_wallet_accounts where user_id=o.user_id and currency=o.currency for update;
 update public.personal_wallet_accounts set balance_minor=balance_minor+o.amount_minor,updated_at=now() where user_id=o.user_id and currency=o.currency returning balance_minor into v_balance;
 insert into public.personal_wallet_ledger(user_id,currency,entry_type,amount_minor,balance_after_minor,idempotency_key,reference,metadata)
 values(o.user_id,o.currency,'topup_credit',o.amount_minor,v_balance,'topup:'||o.id::text,o.provider_reference,jsonb_build_object('provider',o.provider_key,'provider_transaction_id',p_transaction_id));
 update public.wallet_topup_orders set status='paid',provider_transaction_id=p_transaction_id,paid_at=now(),updated_at=now() where id=o.id;
 return jsonb_build_object('success',true,'already_credited',false,'currency',o.currency,'balance_minor',v_balance);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.spend_personal_wallet_for_contribution(p_contribution_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare c public.event_contributions%rowtype;v_balance bigint;v_release_at timestamptz;v_hold_hours integer;v_fee_minor bigint;v_scale bigint;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'service_role_required' using errcode='42501';end if;
 if p_contribution_id is null then raise exception 'contribution_required' using errcode='22023';end if;
 select * into c from public.event_contributions where id=p_contribution_id for update;
 if not found then raise exception 'contribution_not_found' using errcode='P0002';end if;
 if c.provider_mode='wallet' and c.status='paid' then select balance_minor into v_balance from public.personal_wallet_accounts where user_id=c.contributor_user_id and currency=c.currency;return jsonb_build_object('success',true,'already_paid',true,'contribution_id',c.id,'balance_minor',v_balance);end if;
 if c.status<>'pending' or c.contributor_user_id is null or c.provider_mode<>'wallet' then raise exception 'wallet_contribution_not_pending' using errcode='22023';end if;
 if c.amount_minor<=0 or c.currency !~ '^[A-Z]{3}$' then raise exception 'invalid_contribution_amount' using errcode='22023';end if;
 insert into public.personal_wallet_accounts(user_id,currency,balance_minor) values(c.contributor_user_id,c.currency,0) on conflict(user_id,currency) do nothing;
 select balance_minor into v_balance from public.personal_wallet_accounts where user_id=c.contributor_user_id and currency=c.currency for update;
 if v_balance<c.amount_minor then raise exception 'insufficient_personal_wallet_funds' using errcode='22023';end if;
 update public.personal_wallet_accounts set balance_minor=balance_minor-c.amount_minor,updated_at=now() where user_id=c.contributor_user_id and currency=c.currency returning balance_minor into v_balance;
 insert into public.personal_wallet_ledger(user_id,currency,entry_type,amount_minor,balance_after_minor,idempotency_key,reference,related_contribution_id)
 values(c.contributor_user_id,c.currency,'contribution_debit',c.amount_minor,v_balance,'contribution:'||c.id::text,c.provider_reference,c.id);
 v_scale:=case when c.currency in ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') then 1 when c.currency in ('BHD','IQD','JOD','KWD','LYD','OMR','TND') then 1000 else 100 end;
 v_fee_minor:=round(least(coalesce(c.amount_major,c.amount_minor::numeric/v_scale),greatest(0,coalesce(c.platform_fee_major,0)))*v_scale)::bigint;
 if c.content_id is not null then v_hold_hours:=48;
 elsif c.screening_id is not null then select coalesce(settlement_hold_hours,48) into v_hold_hours from public.screenings where id=c.screening_id;
 else select coalesce(settlement_hold_hours,48) into v_hold_hours from public.live_streams where id=c.live_stream_id;end if;
 insert into public.event_settlement_holds(tenant_id,creator_id,screening_id,live_stream_id,content_id,source_type,source_id,currency,gross_amount_minor,net_amount_minor,hold_status,hold_hours)
 values(c.tenant_id,c.creator_id,c.screening_id,c.live_stream_id,c.content_id,c.contribution_type,c.id,c.currency,c.amount_minor,greatest(0,c.amount_minor-v_fee_minor),'held',coalesce(v_hold_hours,48))
 on conflict(source_type,source_id) do nothing;
 select release_at into v_release_at from public.event_settlement_holds where source_type=c.contribution_type and source_id=c.id;
 update public.event_contributions set status='paid',provider_transaction_id='personal-wallet:'||c.id::text,paid_at=now() where id=c.id;
 insert into public.wallet_ledger(user_id,screening_id,event_contribution_id,gross,fee,net,currency,kind,settles_at)
 values(c.creator_id,c.screening_id,c.id,coalesce(c.amount_major,c.amount_minor::numeric/v_scale),coalesce(c.platform_fee_major,0),
 coalesce(c.amount_major,c.amount_minor::numeric/v_scale)-coalesce(c.platform_fee_major,0),c.currency,c.contribution_type,coalesce(v_release_at,'infinity'::timestamptz))
 on conflict(event_contribution_id,kind) where event_contribution_id is not null do nothing;
 return jsonb_build_object('success',true,'already_paid',false,'contribution_id',c.id,'balance_minor',v_balance);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.refund_personal_wallet_contribution(p_contribution_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare c public.event_contributions%rowtype;v_balance bigint;v_scale bigint;v_amount_major numeric;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'service_role_required' using errcode='42501';end if;
 select * into c from public.event_contributions where id=p_contribution_id for update;
 if not found then raise exception 'contribution_not_found' using errcode='P0002';end if;
 if c.provider_mode<>'wallet' then raise exception 'not_a_wallet_contribution' using errcode='22023';end if;
 if c.status='refunded' then select balance_minor into v_balance from public.personal_wallet_accounts where user_id=c.contributor_user_id and currency=c.currency;return jsonb_build_object('success',true,'already_refunded',true,'balance_minor',v_balance);end if;
 if c.status<>'paid' then raise exception 'wallet_contribution_not_paid' using errcode='22023';end if;
 insert into public.personal_wallet_accounts(user_id,currency,balance_minor) values(c.contributor_user_id,c.currency,0) on conflict(user_id,currency) do nothing;
 select balance_minor into v_balance from public.personal_wallet_accounts where user_id=c.contributor_user_id and currency=c.currency for update;
 update public.personal_wallet_accounts set balance_minor=balance_minor+c.amount_minor,updated_at=now() where user_id=c.contributor_user_id and currency=c.currency returning balance_minor into v_balance;
 insert into public.personal_wallet_ledger(user_id,currency,entry_type,amount_minor,balance_after_minor,idempotency_key,reference,related_contribution_id)
 values(c.contributor_user_id,c.currency,'refund_credit',c.amount_minor,v_balance,'refund:'||c.id::text,c.provider_reference,c.id);
 update public.event_contributions set status='refunded' where id=c.id;
 v_scale:=case when c.currency in ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') then 1 when c.currency in ('BHD','IQD','JOD','KWD','LYD','OMR','TND') then 1000 else 100 end;
 v_amount_major:=coalesce(c.amount_major,c.amount_minor::numeric/v_scale);
 insert into public.wallet_ledger(user_id,screening_id,event_contribution_id,gross,fee,net,currency,kind,settles_at)
 values(c.creator_id,c.screening_id,c.id,-v_amount_major,0,-v_amount_major,c.currency,'refund',now())
 on conflict(event_contribution_id,kind) where event_contribution_id is not null do nothing;
 return jsonb_build_object('success',true,'already_refunded',false,'balance_minor',v_balance);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_my_wallet_activity(p_limit integer DEFAULT 100, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, activity_type text, direction text, amount_major numeric, currency text, status text, description text, counterparty text, reference text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_user uuid:=auth.uid();v_limit integer:=greatest(1,least(coalesce(p_limit,100),100));
begin
 if v_user is null then raise exception 'authentication_required' using errcode='42501';end if;
 return query with activity as (
  select st.id,'ticket_purchase'::text,'outgoing'::text,st.price,coalesce(st.currency,'NGN')::text,coalesce(st.payment_status,'unknown')::text,coalesce(s.title,'Screening ticket')::text,coalesce(nullif(p.display_name,''),nullif(p.full_name,''),'Creator')::text,st.payment_reference::text,st.created_at
  from public.screening_tickets st left join public.screenings s on s.id=st.screening_id left join public.content c on c.id=s.content_id left join public.profiles p on p.user_id=c.creator_id
  where st.user_id=v_user and not (st.payment_reference is not null and exists(select 1 from public.tickets t where t.metadata->>'payment_reference'=st.payment_reference))
  union all
  select t.id,'ticket_purchase'::text,'outgoing'::text,t.price,coalesce(t.currency,'NGN')::text,case when t.revoked_at is not null and lower(coalesce(t.revocation_reason,'')) like '%refund%' then 'refunded' when t.revoked_at is not null then 'revoked' else 'paid' end::text,coalesce(s.title,c.title,'Event ticket')::text,coalesce(nullif(p.display_name,''),nullif(p.full_name,''),'Creator')::text,t.metadata->>'payment_reference',t.created_at
  from public.tickets t left join public.screenings s on s.id::text=t.metadata->>'screening_id' left join public.content c on c.id=t.content_id left join public.profiles p on p.user_id=c.creator_id where t.user_id=v_user
  union all
  select ec.id,ec.contribution_type::text,case when ec.creator_id=v_user then 'incoming' else 'outgoing' end::text,coalesce(ec.amount_major,ec.amount_minor::numeric/100),ec.currency::text,ec.status::text,coalesce(sc.title,ls.title,ct.title,'Creator support')::text,case when ec.creator_id=v_user then case when ec.is_anonymous then 'Anonymous' else coalesce(nullif(ec.contributor_name,''),'Viewer') end else coalesce(nullif(cp.display_name,''),nullif(cp.full_name,''),'Creator') end::text,ec.provider_reference::text,ec.created_at
  from public.event_contributions ec left join public.screenings sc on sc.id=ec.screening_id left join public.live_streams ls on ls.id=ec.live_stream_id left join public.content ct on ct.id=ec.content_id left join public.profiles cp on cp.user_id=ec.creator_id where ec.creator_id=v_user or ec.contributor_user_id=v_user
  union all
  select wr.id,'withdrawal'::text,'outgoing'::text,wr.amount,wr.currency::text,wr.status::text,('Withdrawal to '||coalesce(wr.bank_name,'bank account'))::text,'DeGameTV payouts'::text,null::text,wr.created_at from public.withdrawal_requests wr where wr.user_id=v_user
  union all
  select pwl.id,pwl.entry_type::text,case when pwl.entry_type in ('contribution_debit','ticket_debit') then 'outgoing' else 'incoming' end::text,
   pwl.amount_minor::numeric/case when pwl.currency in ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') then 1 when pwl.currency in ('BHD','IQD','JOD','KWD','LYD','OMR','TND') then 1000 else 100 end,
   pwl.currency,'posted'::text,case pwl.entry_type when 'topup_credit' then 'Personal wallet top-up' when 'contribution_debit' then 'Personal wallet contribution' when 'ticket_debit' then 'Personal wallet ticket purchase' when 'refund_credit' then 'Personal wallet refund' else 'Personal wallet adjustment' end,
   'Personal stored-value wallet'::text,pwl.reference,pwl.created_at from public.personal_wallet_ledger pwl where pwl.user_id=v_user
 )
 select a.id,a.activity_type,a.direction,a.amount_major,a.currency,a.status,a.description,a.counterparty,a.reference,a.created_at
 from activity a where p_before is null or a.created_at<p_before order by a.created_at desc limit v_limit;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_event_contribution_leaderboard(p_target_kind text, p_target_id uuid, p_currency text DEFAULT NULL::text)
 RETURNS TABLE(rank_position bigint, contributor_name text, total_amount_major numeric, currency text, contribution_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
 if p_target_id is null or p_target_kind not in ('content','screening','live_stream') then raise exception 'invalid_contribution_target' using errcode='22023';end if;
 if p_target_kind='content' and not exists(select 1 from public.content where id=p_target_id and status='published') then return;end if;
 if p_target_kind='screening' and not exists(select 1 from public.screenings where id=p_target_id and status='published' and coalesce(event_visibility,'public')='public' and not coalesce(invite_only,false)) then return;end if;
 if p_target_kind='live_stream' and not exists(select 1 from public.live_streams where id=p_target_id and status in ('live','ended') and coalesce(metadata->>'event_visibility','public')='public' and coalesce(metadata->>'invite_only','false')<>'true') then return;end if;
 return query select row_number() over(partition by ec.currency order by sum(ec.amount_minor) desc),
  case when bool_or(ec.is_anonymous) then 'Anonymous' else coalesce(max(nullif(ec.contributor_name,'')),'Viewer') end,
  sum(coalesce(ec.amount_major,ec.amount_minor::numeric/100)),ec.currency,count(*)::bigint
 from public.event_contributions ec where ec.status='paid' and (p_currency is null or ec.currency=upper(p_currency))
 and case p_target_kind when 'content' then ec.content_id=p_target_id when 'screening' then ec.screening_id=p_target_id else ec.live_stream_id=p_target_id end
 group by ec.currency,coalesce(ec.contributor_user_id::text,ec.contributor_name,ec.id::text)
 order by ec.currency,sum(ec.amount_minor) desc limit 100;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_event_contribution_totals(p_target_kind text, p_target_id uuid)
 RETURNS TABLE(currency text, total_amount_major numeric, supporter_count bigint, contribution_count bigint, gift_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
 if p_target_id is null or p_target_kind not in ('content','screening','live_stream') then raise exception 'invalid_contribution_target' using errcode='22023';end if;
 if p_target_kind='content' and not exists(select 1 from public.content where id=p_target_id and status='published') then return;end if;
 if p_target_kind='screening' and not exists(select 1 from public.screenings where id=p_target_id and status='published' and coalesce(event_visibility,'public')='public' and not coalesce(invite_only,false)) then return;end if;
 if p_target_kind='live_stream' and not exists(select 1 from public.live_streams where id=p_target_id and status in ('live','ended') and coalesce(metadata->>'event_visibility','public')='public' and coalesce(metadata->>'invite_only','false')<>'true') then return;end if;
 return query select ec.currency,sum(coalesce(ec.amount_major,ec.amount_minor::numeric/100)),count(distinct ec.contributor_user_id),count(*)::bigint,count(*) filter(where ec.contribution_type='gift')::bigint
 from public.event_contributions ec where ec.status='paid'
 and case p_target_kind when 'content' then ec.content_id=p_target_id when 'screening' then ec.screening_id=p_target_id else ec.live_stream_id=p_target_id end
 group by ec.currency order by ec.currency;
end;
$function$
;

REVOKE ALL ON FUNCTION public.reject_personal_wallet_ledger_mutation() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_my_personal_wallet_balances() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_personal_wallet_balances() TO authenticated;
REVOKE ALL ON FUNCTION public.credit_personal_wallet_topup(text,text,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.credit_personal_wallet_topup(text,text,bigint,text) TO service_role;
REVOKE ALL ON FUNCTION public.spend_personal_wallet_for_contribution(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.spend_personal_wallet_for_contribution(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.refund_personal_wallet_contribution(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refund_personal_wallet_contribution(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_my_wallet_activity(integer,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_wallet_activity(integer,timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.get_event_contribution_leaderboard(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_contribution_leaderboard(text,uuid,text) TO anon,authenticated;
REVOKE ALL ON FUNCTION public.get_event_contribution_totals(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_contribution_totals(text,uuid) TO anon,authenticated;

COMMIT;
