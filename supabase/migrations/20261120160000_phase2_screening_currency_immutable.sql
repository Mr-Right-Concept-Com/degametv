create or replace function public.prevent_screening_creator_currency_change()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $function$
begin
  if old.price_currency is not null and new.price_currency is distinct from old.price_currency then
    raise exception 'screening_creator_base_currency_is_immutable' using errcode='23514';
  end if;
  return new;
end
$function$;
drop trigger if exists screenings_immutable_creator_price_currency on public.screenings;
create trigger screenings_immutable_creator_price_currency
before update of price_currency on public.screenings
for each row execute function public.prevent_screening_creator_currency_change();
revoke all on function public.prevent_screening_creator_currency_change() from public,anon,authenticated;