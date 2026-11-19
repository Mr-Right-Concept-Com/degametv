INSERT INTO public.platform_feature_controls(feature_key,enabled,rollout_percentage,release_state,config,change_reason,updated_by)
SELECT flags.feature_key,true,100,'released','{}'::jsonb,'Baseline runtime switch for existing administrator routes.',admin.user_id
FROM (VALUES ('admin.dashboard'),('admin.marketing')) AS flags(feature_key)
CROSS JOIN LATERAL (SELECT user_id FROM public.user_roles WHERE role::text='super_admin' ORDER BY created_at LIMIT 1) AS admin
ON CONFLICT(feature_key) DO NOTHING;