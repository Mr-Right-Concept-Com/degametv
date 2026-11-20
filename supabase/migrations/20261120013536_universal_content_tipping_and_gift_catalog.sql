alter table public.event_contributions
  add column if not exists content_id uuid references public.content(id) on delete cascade,
  add column if not exists target_kind text not null default 'event';
alter table public.event_contributions drop constraint if exists event_contributions_check;
alter table public.event_contributions drop constraint if exists event_contributions_target_kind_check;
alter table public.event_contributions add constraint event_contributions_target_kind_check
  check ((target_kind='event' and content_id is null and ((screening_id is not null)::int + (live_stream_id is not null)::int)=1)
      or (target_kind='content' and content_id is not null and screening_id is null and live_stream_id is null));
alter table public.event_settlement_holds add column if not exists content_id uuid references public.content(id) on delete cascade;
alter table public.event_settlement_holds drop constraint if exists event_settlement_holds_check;
alter table public.event_settlement_holds add constraint event_settlement_holds_target_check
  check (((screening_id is not null)::int + (live_stream_id is not null)::int + (content_id is not null)::int)=1);
create index if not exists event_contributions_content_recent_idx on public.event_contributions(content_id,created_at desc) where status='paid';
create index if not exists event_contributions_creator_recent_idx on public.event_contributions(creator_id,created_at desc) where status='paid';
create table if not exists public.creator_gift_catalog (
 id uuid primary key default gen_random_uuid(),
 gift_key text not null,
 name text not null check(char_length(btrim(name)) between 2 and 80),
 description text,
 category text not null default 'general',
 asset_url text,
 animation_url text,
 emoji text,
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 amount_minor bigint not null check(amount_minor>0),
 animation_duration_ms integer not null default 1800 check(animation_duration_ms between 300 and 10000),
 sort_order integer not null default 0,
 is_enabled boolean not null default false,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint creator_gift_catalog_key_currency_unique unique(gift_key,currency),
 constraint creator_gift_catalog_key_check check(gift_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$')
);
alter table public.creator_gift_catalog enable row level security;
create policy creator_gift_catalog_public_read on public.creator_gift_catalog for select to anon,authenticated using(is_enabled);
create policy creator_gift_catalog_admin_manage on public.creator_gift_catalog for all to authenticated using(public.is_super_admin((select auth.uid()))) with check(public.is_super_admin((select auth.uid())));
revoke all on public.creator_gift_catalog from anon,authenticated;
grant select on public.creator_gift_catalog to anon,authenticated;
grant insert,update,delete on public.creator_gift_catalog to authenticated;
create or replace function public.guard_event_settlement_hold()
returns trigger language plpgsql set search_path to 'public','pg_temp' as $function$
declare v_creator uuid;v_tenant uuid;v_event_end timestamptz;v_delivered timestamptz;v_hours integer;
begin
 if ((new.screening_id is not null)::int+(new.live_stream_id is not null)::int+(new.content_id is not null)::int)<>1 then raise exception 'exactly_one_settlement_target_required';end if;
 if new.screening_id is not null then
  select c.creator_id,s.tenant_id,coalesce(s.live_ended_at,s.screening_date,s.release_date),
   case when s.event_type='live' then s.live_replay_ready_at when c.video_url is not null then now() else null end,s.settlement_hold_hours
  into v_creator,v_tenant,v_event_end,v_delivered,v_hours from public.screenings s join public.content c on c.id=s.content_id where s.id=new.screening_id;
 elsif new.live_stream_id is not null then
  select l.creator_id,l.tenant_id,l.actual_ended_at,
   case when l.recording_enabled and l.settlement_delivery_required then case when l.vod_replay_asset_url is not null then l.actual_ended_at else null end else l.actual_ended_at end,
   l.settlement_hold_hours into v_creator,v_tenant,v_event_end,v_delivered,v_hours from public.live_streams l where l.id=new.live_stream_id;
 else
  select c.creator_id,c.tenant_id,now(),case when c.status='published' and c.video_url is not null then now() else null end,new.hold_hours
  into v_creator,v_tenant,v_event_end,v_delivered,v_hours from public.content c where c.id=new.content_id;
 end if;
 if v_creator is null or v_creator<>new.creator_id or v_tenant<>new.tenant_id then raise exception 'settlement_target_owner_mismatch' using errcode='42501';end if;
 new.hold_hours:=coalesce(v_hours,new.hold_hours,48);
 if new.hold_hours not between 24 and 72 then raise exception 'settlement_hold_hours_out_of_range' using errcode='23514';end if;
 new.event_ended_at:=v_event_end;new.delivery_confirmed_at:=v_delivered;
 new.release_at:=case when v_event_end is not null and v_event_end<=now() and v_delivered is not null then greatest(v_event_end,v_delivered)+make_interval(hours=>new.hold_hours) else null end;
 if new.hold_status not in ('paid','refunded','disputed','blocked') then new.hold_status:=case when new.release_at is not null and new.release_at<=now() then 'eligible' else 'held' end;end if;
 return new;
end;$function$;
create or replace function public.complete_event_contribution(p_reference text,p_transaction_id text,p_amount_minor bigint,p_currency text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare c public.event_contributions%rowtype;v_fee numeric;v_scale bigint;v_release_at timestamptz;v_hold_hours integer;
begin
 if current_setting('request.jwt.claim.role',true)<>'service_role' then raise exception 'forbidden' using errcode='42501';end if;
 select * into c from public.event_contributions where provider_reference=p_reference for update;
 if not found then raise exception 'contribution_not_found';end if;
 if c.amount_minor<>p_amount_minor or c.currency<>p_currency then raise exception 'contribution_payment_mismatch';end if;
 if c.status='paid' then return jsonb_build_object('success',true,'already_paid',true,'contribution_id',c.id,'contribution_type',c.contribution_type);end if;
 if c.status<>'pending' then raise exception 'contribution_not_pending';end if;
 v_fee:=least(coalesce(c.amount_major,c.amount_minor::numeric/100),greatest(0,coalesce(c.platform_fee_major,0)));
 v_scale:=case when c.currency in ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') then 1 when c.currency in ('BHD','IQD','JOD','KWD','LYD','OMR','TND') then 1000 else 100 end;
 update public.event_contributions set status='paid',provider_transaction_id=p_transaction_id,paid_at=now() where id=c.id;
 if c.target_kind='content' then v_hold_hours:=48;
 else v_hold_hours:=case when c.screening_id is not null then coalesce((select settlement_hold_hours from public.screenings where id=c.screening_id),48) else coalesce((select settlement_hold_hours from public.live_streams where id=c.live_stream_id),48) end;end if;
 insert into public.event_settlement_holds(tenant_id,creator_id,screening_id,live_stream_id,content_id,source_type,source_id,currency,gross_amount_minor,net_amount_minor,hold_status,hold_hours)
 values(c.tenant_id,c.creator_id,c.screening_id,c.live_stream_id,c.content_id,c.contribution_type,c.id,c.currency,c.amount_minor,greatest(0,c.amount_minor-round(v_fee*v_scale)::bigint),'held',v_hold_hours)
 on conflict(source_type,source_id) do nothing;
 select release_at into v_release_at from public.event_settlement_holds where source_type=c.contribution_type and source_id=c.id;
 insert into public.wallet_ledger(user_id,screening_id,event_contribution_id,gross,fee,net,currency,kind,settles_at)
 values(c.creator_id,c.screening_id,c.id,coalesce(c.amount_major,c.amount_minor::numeric/100),v_fee,coalesce(c.amount_major,c.amount_minor::numeric/100)-v_fee,c.currency,c.contribution_type,coalesce(v_release_at,'infinity'::timestamptz))
 on conflict(event_contribution_id) where event_contribution_id is not null do nothing;
 return jsonb_build_object('success',true,'already_paid',false,'contribution_id',c.id,'contribution_type',c.contribution_type);
end;$function$;
revoke all on function public.complete_event_contribution(text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.complete_event_contribution(text,text,bigint,text) to service_role;
