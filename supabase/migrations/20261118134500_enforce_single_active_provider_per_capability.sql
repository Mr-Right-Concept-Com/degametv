create or replace function public.deactivate_other_service_provider_bindings()
returns trigger language plpgsql security definer set search_path='public','pg_temp'
as $$
begin
 if new.enabled and new.removed_at is null then
   update public.service_provider_bindings
      set enabled=false,updated_at=now()
    where capability=new.capability and enabled=true and removed_at is null
      and id is distinct from new.id;
 end if;
 return new;
end $$;
revoke all on function public.deactivate_other_service_provider_bindings() from public,anon,authenticated;
drop trigger if exists service_provider_single_active on public.service_provider_bindings;
create trigger service_provider_single_active before insert or update of enabled,capability,removed_at
on public.service_provider_bindings for each row execute function public.deactivate_other_service_provider_bindings();