create or replace function public.guard_studio_account_owner_update()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if auth.uid()=old.user_id then
  if new.status<>'pending' then raise exception 'studio_status_admin_only'; end if;
  if new.review_notes is distinct from old.review_notes or new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at then raise exception 'studio_review_metadata_admin_only'; end if;
 end if;
 return new;
end; $$;
drop trigger if exists guard_studio_account_owner_update on public.studio_accounts;
create trigger guard_studio_account_owner_update before update on public.studio_accounts for each row execute function public.guard_studio_account_owner_update();