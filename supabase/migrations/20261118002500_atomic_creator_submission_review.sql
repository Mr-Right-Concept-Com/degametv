create or replace function public.review_creator_submission(p_submission_id uuid,p_status text,p_admin_note text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_submission public.filmmaker_submissions%rowtype;
begin
 if v_user is null or not (public.has_role(v_user,'super_admin'::public.app_role) or public.has_role(v_user,'platform_admin'::public.app_role)) then raise exception 'forbidden'; end if;
 if p_status not in ('approved','rejected','in_review') then raise exception 'invalid_status'; end if;
 if p_status='rejected' and length(trim(coalesce(p_admin_note,'')))<10 then raise exception 'rejection_reason_required'; end if;
 select * into v_submission from public.filmmaker_submissions where id=p_submission_id for update;
 if not found then raise exception 'submission_not_found'; end if;
 if lower(v_submission.submitter_email)=lower(coalesce(auth.jwt()->>'email','')) then raise exception 'self_review_forbidden'; end if;
 if v_submission.status in ('approved','rejected') then raise exception 'submission_already_reviewed'; end if;
 if p_status='approved' and v_submission.content_id is null then raise exception 'submission_content_missing'; end if;
 update public.filmmaker_submissions set status=p_status,admin_notes=nullif(trim(p_admin_note),''),updated_at=now() where id=p_submission_id;
 return jsonb_build_object('submission_id',p_submission_id,'status',p_status,'content_id',v_submission.content_id);
end; $$;
revoke all on function public.review_creator_submission(uuid,text,text) from public,anon;
grant execute on function public.review_creator_submission(uuid,text,text) to authenticated;