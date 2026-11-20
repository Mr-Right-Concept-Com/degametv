CREATE OR REPLACE FUNCTION public.get_my_wallet_activity(p_limit integer DEFAULT 100, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, activity_type text, direction text, amount_major numeric, currency text, status text, description text, counterparty text, reference text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
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
  from public.event_contributions ec left join public.screenings sc on sc.id=ec.screening_id left join public.live_streams ls on ls.id=ec.live_stream_id left join public.content ct on ct.id=ec.content_id left join public.profiles cp on cp.user_id=ec.creator_id where (ec.creator_id=v_user or ec.contributor_user_id=v_user)
    and not (ec.provider_mode='wallet' and ec.contributor_user_id=v_user)
    and not (ec.creator_id=v_user and ec.status='refunded')
  union all
  select wr.id,'withdrawal'::text,'outgoing'::text,wr.amount,wr.currency::text,wr.status::text,('Withdrawal to '||coalesce(wr.bank_name,'bank account'))::text,'DeGameTV payouts'::text,null::text,wr.created_at from public.withdrawal_requests wr where wr.user_id=v_user
  union all
  select wl.id,'creator_earning_refund'::text,'outgoing'::text,abs(wl.net),wl.currency,'posted'::text,
   'Creator contribution refund reversal'::text,'DeGameTV settlements'::text,wl.event_contribution_id::text,wl.created_at
  from public.wallet_ledger wl where wl.user_id=v_user and wl.kind='refund' and wl.event_contribution_id is not null
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
REVOKE ALL ON FUNCTION public.get_my_wallet_activity(integer,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_wallet_activity(integer,timestamptz) TO authenticated;
