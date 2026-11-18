create or replace function public.review_studio_account(p_account_id uuid,p_decision text,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,storage,pg_temp as $$
declare v_user uuid:=auth.uid(); v_account public.studio_accounts%rowtype;
begin
 if v_user is null or not (public.has_role(v_user,'super_admin'::public.app_role) or public.has_role(v_user,'platform_admin'::public.app_role)) then raise exception 'forbidden'; end if;
 if p_decision not in ('approved','rejected') then raise exception 'invalid_decision'; end if;
 if length(trim(coalesce(p_reason,'')))<10 or length(trim(p_reason))>1000 then raise exception 'review_reason_required'; end if;
 select * into v_account from public.studio_accounts where id=p_account_id for update;
 if not found then raise exception 'studio_application_not_found'; end if;
 if v_account.user_id=v_user then raise exception 'self_review_forbidden'; end if;
 if v_account.status not in ('pending','rejected') then raise exception 'studio_application_not_pending'; end if;
 if not exists(select 1 from public.user_roles where user_id=v_account.user_id and role='creator'::public.app_role) then raise exception 'creator_identity_role_required'; end if;
 if p_decision='approved' and v_account.tier='business' then
  if not v_account.rights_declared or v_account.cac_doc_path is null then raise exception 'business_evidence_required'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='kyb-docs' and o.name=v_account.cac_doc_path and o.owner=v_account.user_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false) then raise exception 'business_document_missing'; end if;
 end if;
 update public.studio_accounts set status=p_decision,review_notes=trim(p_reason),reviewed_by=v_user,reviewed_at=now(),updated_at=now() where id=p_account_id;
 insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
 values(v_user,'studio.application.'||p_decision,'studio_account',p_account_id,jsonb_build_object('applicant_id',v_account.user_id,'tier',v_account.tier,'reason',trim(p_reason)));
 return jsonb_build_object('account_id',p_account_id,'user_id',v_account.user_id,'status',p_decision);
end; $$;
revoke all on function public.review_studio_account(uuid,text,text) from public,anon;
grant execute on function public.review_studio_account(uuid,text,text) to authenticated;