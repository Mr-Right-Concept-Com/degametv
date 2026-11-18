create or replace function public.sync_business_verification_from_studio_review()
returns trigger language plpgsql security definer set search_path='public','pg_temp'
as $$
begin
 if new.status is distinct from old.status and new.status in ('approved','rejected') then
   update public.business_verifications
      set status=case when new.status='approved' then 'verified' else 'rejected' end,
          rejection_reason=case when new.status='rejected' then coalesce(nullif(trim(new.review_notes),''),'Rejected during Studio review') else null end,
          reviewed_by=new.reviewed_by,reviewed_at=coalesce(new.reviewed_at,now()),updated_at=now()
    where user_id=new.user_id and status in ('pending','processing')
      and id=(select id from public.business_verifications where user_id=new.user_id and status in ('pending','processing') order by submitted_at desc limit 1);
 end if;
 return new;
end $$;
revoke all on function public.sync_business_verification_from_studio_review() from public,anon,authenticated;
drop trigger if exists studio_review_sync_business_verification on public.studio_accounts;
create trigger studio_review_sync_business_verification after update of status on public.studio_accounts
for each row execute function public.sync_business_verification_from_studio_review();