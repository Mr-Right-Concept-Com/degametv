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
 update public.event_settlement_holds set hold_status='refunded',released_at=now(),updated_at=now() where source_type=c.contribution_type and source_id=c.id and hold_status='held';
 v_scale:=case when c.currency in ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') then 1 when c.currency in ('BHD','IQD','JOD','KWD','LYD','OMR','TND') then 1000 else 100 end;
 v_amount_major:=coalesce(c.amount_major,c.amount_minor::numeric/v_scale);
 insert into public.wallet_ledger(user_id,screening_id,event_contribution_id,gross,fee,net,currency,kind,settles_at)
 values(c.creator_id,c.screening_id,c.id,-v_amount_major,0,-v_amount_major,c.currency,'refund',now())
 on conflict(event_contribution_id,kind) where event_contribution_id is not null do nothing;
 return jsonb_build_object('success',true,'already_refunded',false,'balance_minor',v_balance);
end;
$function$
;
REVOKE ALL ON FUNCTION public.refund_personal_wallet_contribution(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refund_personal_wallet_contribution(uuid) TO service_role;