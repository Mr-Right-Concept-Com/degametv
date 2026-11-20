begin;
drop policy if exists "Public can read enabled country currency rules" on public.country_currency_rules;
create policy "Public can read enabled country currency rules"
on public.country_currency_rules
for select to anon,authenticated
using (enabled=true);
grant select on public.country_currency_rules to anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.country_currency_rules from anon,authenticated;
commit;