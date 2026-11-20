create or replace function public.transition_withdrawal_request(p_request_id uuid,p_transition text,p_actor_id uuid,p_admin_note text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_row public.withdrawal_requests%rowtype;v_status text;
begin
 if p_actor_id is null or not exists(select 1 from public.user_roles where user_id=p_actor_id and role='super_admin') then raise exception 'super_admin_required' using errcode='42501';end if;
 if p_transition not in ('approve','reject') then raise exception 'unsupported_withdrawal_transition' using errcode='22023';end if;
 if p_transition='reject' and (p_admin_note is null or length(btrim(p_admin_note))<5) then raise exception 'withdrawal_rejection_reason_required' using errcode='22023';end if;
 select * into v_row from public.withdrawal_requests where id=p_request_id for update;
 if not found then raise exception 'withdrawal_request_not_found' using errcode='P0002';end if;
 if v_row.status<>'pending' then raise exception 'withdrawal_request_state_conflict' using errcode='40001';end if;
 if p_transition='approve' then
  update public.withdrawal_requests set status='approved',approved_by=p_actor_id,approved_at=now(),admin_note=nullif(btrim(coalesce(p_admin_note,'')),''),updated_at=now()
   where id=p_request_id returning * into v_row;
  v_status:='approved';
 else
  update public.withdrawal_requests set status='rejected',rejected_by=p_actor_id,rejected_at=now(),admin_note=btrim(p_admin_note),updated_at=now()
   where id=p_request_id returning * into v_row;
  v_status:='rejected';
 end if;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,old_data,new_data)
 values(p_actor_id,'withdrawal.'||v_status,'withdrawal_request',v_row.id,jsonb_build_object('status','pending'),
  jsonb_build_object('status',v_status,'admin_note',v_row.admin_note,'amount',v_row.amount,'currency',v_row.currency));
 return to_jsonb(v_row)-'account_number';
end;
$$;
revoke all on function public.transition_withdrawal_request(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.transition_withdrawal_request(uuid,text,uuid,text) to service_role;
comment on function public.transition_withdrawal_request(uuid,text,uuid,text) is
'Atomic audited super-admin withdrawal approval/rejection. Locks the request, rejects stale transitions, and never returns bank account data.';
