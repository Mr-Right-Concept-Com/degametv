create table if not exists public.platform_security_alerts(
 id uuid primary key default gen_random_uuid(),source_audit_id uuid unique references public.audit_logs(id) on delete set null,
 severity text not null check(severity in ('high','critical')),event_key text not null,actor_id uuid references auth.users(id) on delete set null,
 entity_type text,entity_id uuid,summary text not null,details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),resolved_at timestamptz,resolved_by uuid references auth.users(id) on delete set null,resolution_note text
);
create index if not exists platform_security_alerts_unresolved_idx on public.platform_security_alerts(created_at desc) where resolved_at is null;
alter table public.platform_security_alerts enable row level security;
revoke all on public.platform_security_alerts from public,anon,authenticated;
grant all on public.platform_security_alerts to service_role;
comment on table public.platform_security_alerts is E'@graphql({"description":"Internal high-risk administrator and platform security alerts. Service-role only; reviewed through God Mode control plane."})';
create or replace function public.capture_platform_security_alert()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_action text:=lower(coalesce(new.action,''));v_severity text;
begin
 if v_action !~ '(role|impersonat|wallet|withdrawal|provider|secret|vault|release|chargeback|refund|payout|branding|feature_control|country_currency|public_site_url|setting_update|permission|moderation|fraud)' then return new;end if;
 if v_action ~ '(super_admin|chargeback|fraud|rollback|secret_rotat|provider_removed|permission_escalat)' then v_severity:='critical';else v_severity:='high';end if;
 insert into public.platform_security_alerts(source_audit_id,severity,event_key,actor_id,entity_type,entity_id,summary,details)
 values(new.id,v_severity,new.action,new.user_id,new.entity_type,new.entity_id,left(new.action||' on '||coalesce(new.entity_type,'platform'),240),
  jsonb_build_object('action',new.action,'entity_type',new.entity_type,'entity_id',new.entity_id))
 on conflict(source_audit_id) do nothing;
 return new;
end $$;
revoke all on function public.capture_platform_security_alert() from public,anon,authenticated,service_role;
drop trigger if exists audit_logs_capture_platform_security_alert on public.audit_logs;
create trigger audit_logs_capture_platform_security_alert after insert on public.audit_logs for each row execute function public.capture_platform_security_alert();
