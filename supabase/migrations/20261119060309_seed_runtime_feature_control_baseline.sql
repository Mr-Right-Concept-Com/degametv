with admin_user as (select user_id from public.user_roles where role::text='super_admin' limit 1),
defaults(feature_key) as (values ('creator.live'),('creator.screenings'),('creator.fan_blast'),('creator.team'),('creator.analytics'),('cinema.ticketing'),('cinema.live_playback'),('cinema.replay'))
insert into public.platform_feature_controls(feature_key,enabled,rollout_percentage,release_state,config,change_reason,updated_by)
select d.feature_key,true,100,'released','{}'::jsonb,'Initial platform feature baseline; administrator can stage, pause or roll back.',a.user_id
from defaults d cross join admin_user a on conflict(feature_key) do nothing;