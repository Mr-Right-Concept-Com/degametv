revoke all on function public.admin_configure_email_provider(text,text,text,text,text,boolean,boolean) from public,anon,authenticated;
revoke all on function public.admin_configure_payment_provider(text,text,text,text,text,text,boolean,boolean) from public,anon,authenticated;
revoke all on function public.admin_configure_service_provider(text,text,boolean,boolean,text,jsonb,jsonb,text,text,boolean) from public,anon,authenticated;
revoke all on function public.admin_configure_service_provider_modes(text,text,boolean,boolean,text,jsonb,jsonb,text,text,text,text,boolean) from public,anon,authenticated;
revoke all on function public.admin_upsert_country_currency_rule(text,text,text,text,text,boolean,text) from public,anon,authenticated;
revoke all on function public.admin_upsert_feature_control(text,boolean,integer,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.admin_configure_service_provider_modes_with_priority(text,text,boolean,boolean,text,jsonb,jsonb,text,text,text,text,integer) to authenticated;
