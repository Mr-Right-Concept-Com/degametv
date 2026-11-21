-- Client roles must not retain structural table privileges that bypass RLS.
begin;
do $$
declare
  v_table record;
begin
  for v_table in
    select c.oid::regclass as relation
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
  loop
    if has_table_privilege('anon',v_table.relation,'TRUNCATE')
       or has_table_privilege('anon',v_table.relation,'REFERENCES')
       or has_table_privilege('anon',v_table.relation,'TRIGGER')
       or has_table_privilege('authenticated',v_table.relation,'TRUNCATE')
       or has_table_privilege('authenticated',v_table.relation,'REFERENCES')
       or has_table_privilege('authenticated',v_table.relation,'TRIGGER') then
      raise exception 'Client structural table privilege remains on %',v_table.relation;
    end if;
  end loop;
end $$;
rollback;
