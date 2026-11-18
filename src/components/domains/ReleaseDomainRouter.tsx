import { useEffect } from 'react';
import { useLocation,useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
export function ReleaseDomainRouter(){
 const location=useLocation();const navigate=useNavigate();
 useEffect(()=>{const host=window.location.hostname.toLowerCase();if(location.pathname!=='/'||host==='localhost'||host.endsWith('.localhost')||!host.endsWith('.spixie.net'))return;let active=true;void supabase.rpc('resolve_release_domain',{p_hostname:window.location.host}).then(({data})=>{if(active&&Array.isArray(data)&&data[0]?.content_id)navigate('/content/'+data[0].content_id,{replace:true,state:{releaseDomain:true,hostname:host}});});return()=>{active=false;};},[location.pathname,navigate]);return null;
}
