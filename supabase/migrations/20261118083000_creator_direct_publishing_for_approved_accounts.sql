create or replace function public.publish_creator_content(p_content_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'storage', 'pg_temp'
as $function$
declare
  v_user uuid := auth.uid();
  v_content public.content%rowtype;
begin
  if v_user is null or not public.is_approved_creator(v_user) then
    raise exception 'approved_creator_required' using errcode='42501';
  end if;
  select * into v_content from public.content
   where id = p_content_id and creator_id = v_user for update;
  if not found then raise exception 'content_not_found'; end if;
  if v_content.status not in ('draft','pending') then raise exception 'content_not_publishable'; end if;
  if v_content.poster_url is null or v_content.video_url is null then raise exception 'content_assets_required'; end if;
  if not exists (
    select 1 from storage.objects o where o.bucket_id = 'creator-masters'
      and o.name = v_content.video_url and o.owner = v_user
      and o.archived_at is null and coalesce(o.is_delete_marker,false) = false
  ) then raise exception 'master_media_missing'; end if;
  update public.content set status = 'published', updated_at = now() where id = p_content_id;
  update public.filmmaker_submissions set status = 'approved'
   where content_id = p_content_id and submitter_email = (select email from auth.users where id = v_user)
     and status in ('pending','approved');
  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
  values(v_user,'creator.content.published','content',p_content_id,
    jsonb_build_object('tenant_id',v_content.tenant_id,'content_type',v_content.type,
      'publication_policy','approved_creator_direct_publish'));
  return jsonb_build_object('content_id',p_content_id,'status','published','share_path','/content/'||p_content_id::text);
end;
$function$;
grant execute on function public.publish_creator_content(uuid) to authenticated;
