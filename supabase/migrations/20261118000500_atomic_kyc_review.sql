create or replace function public.review_kyc_application(
  p_user_id uuid,
  p_decision text,
  p_reason text,
  p_ip_address text default null,
  p_user_agent text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_id_path text;
  v_selfie_path text;
  v_now timestamptz := now();
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.user_roles
    where user_id = v_actor and role::text in ('super_admin', 'platform_admin')
  ) then
    raise exception 'identity_review_forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('verified', 'rejected') then
    raise exception 'invalid_identity_decision' using errcode = '22023';
  end if;
  if p_reason is null or length(trim(p_reason)) < 10 or length(trim(p_reason)) > 1000 then
    raise exception 'identity_review_reason_required' using errcode = '22023';
  end if;

  select kyc_status, kyc_id_url, kyc_selfie_url
    into v_status, v_id_path, v_selfie_path
  from public.profiles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'identity_applicant_not_found' using errcode = 'P0002';
  end if;
  if v_status <> 'pending' then
    raise exception 'identity_application_not_pending' using errcode = '55000';
  end if;
  if v_id_path is null or v_selfie_path is null then
    raise exception 'identity_evidence_missing' using errcode = '23514';
  end if;

  update public.profiles
  set kyc_status = p_decision,
      kyc_verified_at = case when p_decision = 'verified' then v_now else null end,
      updated_at = v_now
  where user_id = p_user_id and kyc_status = 'pending';

  insert into public.audit_logs (
    user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent
  ) values (
    v_actor,
    case when p_decision = 'verified' then 'identity.application.approved' else 'identity.application.rejected' end,
    'profile', p_user_id,
    jsonb_build_object('kyc_status', v_status),
    jsonb_build_object('kyc_status', p_decision, 'reason', trim(p_reason), 'reviewed_by', v_actor, 'reviewed_at', v_now),
    p_ip_address, p_user_agent
  );

  return jsonb_build_object('success', true, 'status', p_decision, 'reviewed_at', v_now);
end;
$$;

revoke all on function public.review_kyc_application(uuid, text, text, text, text) from public, anon;
grant execute on function public.review_kyc_application(uuid, text, text, text, text) to authenticated;
