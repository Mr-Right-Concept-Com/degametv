create or replace function public.accept_studio_invitation(
  p_invitation_id uuid,
  p_user_id uuid,
  p_email text
) returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $function$
declare
  v_invitation public.studio_invitations%rowtype;
  v_studio public.studio_accounts%rowtype;
  v_member_count integer;
  v_existing public.studio_memberships%rowtype;
  v_now timestamptz := now();
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  if p_invitation_id is null or p_user_id is null or nullif(lower(trim(p_email)),'') is null then
    raise exception 'invitation_acceptance_arguments_required' using errcode='22023';
  end if;
  select * into v_invitation from public.studio_invitations where id=p_invitation_id for update;
  if not found then raise exception 'invitation_not_found' using errcode='P0002'; end if;
  if v_invitation.accepted_at is not null then
    if v_invitation.invited_user_id=p_user_id then
      return jsonb_build_object('success',true,'status','ACCEPTED','studioAccountId',v_invitation.studio_account_id,'role',v_invitation.role,'idempotent',true);
    end if;
    raise exception 'invitation_already_used' using errcode='23505';
  end if;
  if v_invitation.revoked_at is not null or v_invitation.expires_at<=v_now then raise exception 'invitation_expired_or_revoked' using errcode='P0001'; end if;
  if lower(v_invitation.email)<>lower(trim(p_email)) then raise exception 'invited_email_mismatch' using errcode='42501'; end if;
  if v_invitation.invited_user_id is not null and v_invitation.invited_user_id<>p_user_id then raise exception 'invitation_user_mismatch' using errcode='42501'; end if;
  select * into v_studio from public.studio_accounts where id=v_invitation.studio_account_id for update;
  if not found or v_studio.status<>'approved' then raise exception 'studio_not_approved' using errcode='23514'; end if;
  select * into v_existing from public.studio_memberships where studio_account_id=v_studio.id and user_id=p_user_id and revoked_at is null and accepted_at is not null;
  if not found then
    select count(*) into v_member_count from public.studio_memberships where studio_account_id=v_studio.id and revoked_at is null and accepted_at is not null;
    if v_member_count>=coalesce(v_studio.seats,1) then raise exception 'studio_seat_limit_reached' using errcode='23514'; end if;
  end if;
  insert into public.studio_memberships(studio_account_id,user_id,role,invited_by,accepted_at,revoked_at)
  values(v_studio.id,p_user_id,v_invitation.role,v_invitation.invited_by,v_now,null)
  on conflict(studio_account_id,user_id) do update set role=excluded.role,invited_by=excluded.invited_by,accepted_at=excluded.accepted_at,revoked_at=null;
  update public.studio_invitations set invited_user_id=p_user_id,accepted_at=v_now where id=v_invitation.id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
  values(p_user_id,'studio.invitation.accepted','studio_invitation',v_invitation.id,jsonb_build_object('studio_account_id',v_studio.id,'role',v_invitation.role));
  return jsonb_build_object('success',true,'status','ACCEPTED','studioAccountId',v_studio.id,'role',v_invitation.role);
end
$function$;
revoke all on function public.accept_studio_invitation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.accept_studio_invitation(uuid,uuid,text) to service_role;