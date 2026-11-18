-- One-time non-destructive credential migration: copy legacy credentials into Vault first, then clear plaintext columns in the same transaction.
do $$
declare r record; v_ref uuid;
begin
 for r in select id,gateway_name,test_public_key,test_secret_key,live_public_key,live_secret_key,webhook_secret
          from public.payment_gateways
          where test_secret_key is not null or live_secret_key is not null or webhook_secret is not null
          for update
 loop
  if lower(r.gateway_name) not in ('paystack','flutterwave','stripe') then raise exception 'Unsupported legacy payment provider: %',r.gateway_name; end if;
  insert into public.payment_provider_configs(provider,is_enabled,is_live,test_public_key,live_public_key,updated_at)
  values(lower(r.gateway_name),false,false,r.test_public_key,r.live_public_key,now()) on conflict(provider) do nothing;
  if r.test_secret_key is not null then
   v_ref:=vault.create_secret(r.test_secret_key,'degame-'||lower(r.gateway_name)||'-test-secret','Migrated legacy DeGameTV test credential',null);
   update public.payment_provider_configs set test_secret_ref=v_ref where provider=lower(r.gateway_name);
  end if;
  if r.live_secret_key is not null then
   v_ref:=vault.create_secret(r.live_secret_key,'degame-'||lower(r.gateway_name)||'-live-secret','Migrated legacy DeGameTV live credential',null);
   update public.payment_provider_configs set live_secret_ref=v_ref where provider=lower(r.gateway_name);
  end if;
  if r.webhook_secret is not null then
   v_ref:=vault.create_secret(r.webhook_secret,'degame-'||lower(r.gateway_name)||'-webhook-secret','Migrated legacy DeGameTV webhook credential',null);
   update public.payment_provider_configs set webhook_secret_ref=v_ref where provider=lower(r.gateway_name);
  end if;
  update public.payment_gateways set test_secret_key=null,live_secret_key=null,webhook_secret=null where id=r.id;
 end loop;
end $$;