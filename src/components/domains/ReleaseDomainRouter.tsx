import { useEffect } from 'react';
import { useLocation,useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type DomainSettings = { controlDomain?: string; releaseDomain?: string };
type DomainResolution = { content_id?: string };
type ResolverClient = { rpc: (name: string, args: { p_hostname: string }) => Promise<{ data: DomainResolution[] | null; error: { message: string } | null }> };
export function ReleaseDomainRouter(){
 const location=useLocation();const navigate=useNavigate();
 useEffect(()=>{
  if(location.pathname!=='/')return;
  let active=true;
  const resolve=async()=>{
   const {data:setting}=await supabase.from('platform_settings').select('setting_value').eq('setting_key','domain_settings').maybeSingle();
   const values=(setting?.setting_value&&typeof setting.setting_value==='object'?setting.setting_value:{}) as DomainSettings;
   const host=window.location.hostname.toLowerCase();
   const control=(values.controlDomain||'').toLowerCase();
   const release=(values.releaseDomain||'').toLowerCase();
   if(host==='localhost'||host.endsWith('.localhost')||[control,release].filter(Boolean).some(root=>host===root||host==='www.'+root))return;
   const client=supabase as unknown as ResolverClient;
   const {data}=await client.rpc('resolve_release_domain',{p_hostname:window.location.host});
   if(active&&data?.[0]?.content_id)navigate('/content/'+data[0].content_id,{replace:true,state:{releaseDomain:true,hostname:host}});
  };
  void resolve();
  return()=>{active=false;};
 },[location.pathname,navigate]);
 return null;
}
