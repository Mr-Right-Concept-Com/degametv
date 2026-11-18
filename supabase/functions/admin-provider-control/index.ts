import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list") }),
  z.object({ action: z.literal("test"), capability: z.enum(["payments","identity","bank_verification","video_delivery","email","live_streaming"]), providerKey: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/) }),
  z.object({
    action: z.literal("configure"),
    capability: z.enum(["payments","identity","bank_verification","video_delivery","email","live_streaming"]),
    providerKey: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
    enabled: z.boolean(),
    live: z.boolean(),
    baseUrl: z.string().url().refine(v => new URL(v).protocol === "https:"),
    endpoints: z.record(z.string(), z.unknown()).default({}),
    settings: z.record(z.string(), z.unknown()).default({}),
    credential: z.string().max(10000).optional(),
    webhookSecret: z.string().max(10000).optional(),
  }),
  z.object({
    action: z.literal("remove"),
    capability: z.enum(["payments","identity","bank_verification","video_delivery","email","live_streaming"]),
    providerKey: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  }),
]);

const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." },405);
  const url=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization=req.headers.get("Authorization");
  if(!url||!anon||!service||!authorization?.startsWith("Bearer ")) return json({error:"Provider control unavailable."},503);
  const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await caller.auth.getUser();
  if(authError||!user)return json({error:"Authentication required."},401);
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return json({error:"Invalid provider control request.",details:parsed.error.flatten()},400);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:isAdmin,error:roleError}=await admin.rpc("is_super_admin",{_user_id:user.id});
  if(roleError||!isAdmin)return json({error:"Super administrator access required."},403);
  const p=parsed.data;
  if(p.action==="list"){
    const {data,error}=await admin.from("service_provider_bindings")
      .select("id,capability,provider_key,enabled,is_live,base_url,endpoints,settings,updated_at,removed_at,priority,credential_secret_ref,webhook_secret_ref")
      .order("capability").order("priority").order("provider_key");
    if(error)return json({error:"Provider registry could not be loaded."},503);
    return json({providers:(data||[]).map(({credential_secret_ref,webhook_secret_ref,...row})=>({...row,hasCredential:Boolean(credential_secret_ref),hasWebhookSecret:Boolean(webhook_secret_ref)}))});
  }
  if(p.action==="test"){
    const {data:rows,error}=await admin.rpc("get_service_provider_runtime_config",{p_capability:p.capability});
    if(error)return json({error:"Provider runtime configuration could not be loaded."},503);
    const provider=Array.isArray(rows)?rows.find((row:any)=>row.provider_key===p.providerKey):null;
    if(!provider?.credential||!provider?.base_url)return json({error:"Save a provider credential and HTTPS base URL before testing."},409);
    const healthPath=provider.endpoints?.health_check;
    if(typeof healthPath!=="string"||!healthPath.startsWith("/")||healthPath.startsWith("//"))return json({error:"Configure a relative health_check endpoint in the provider contract."},409);
    const target=new URL(healthPath,provider.base_url);
    if(target.origin!==new URL(provider.base_url).origin)return json({error:"Provider health endpoint must remain on the configured host."},400);
    try{
      const response=await fetch(target,{method:"GET",headers:{Authorization:"Bearer "+provider.credential,Accept:"application/json"},signal:AbortSignal.timeout(10000)});
      const body=await response.json().catch(()=>null);
      if(!response.ok||body?.ok!==true)return json({success:false,error:"Provider health check failed. Binding has not been changed."},502);
      return json({success:true,provider:p.providerKey,capability:p.capability,mode:provider.is_live?"live":"test",checkedAt:new Date().toISOString()});
    }catch{return json({success:false,error:"Provider health endpoint did not respond. Binding has not been changed."},502);}
  }
  if(p.action==="configure"&&p.enabled){
    if(p.live&&!p.webhookSecret){
      const {data:existing}=await admin.from("service_provider_bindings").select("webhook_secret_ref").eq("capability",p.capability).eq("provider_key",p.providerKey).maybeSingle();
      if(!existing?.webhook_secret_ref)return json({error:"A webhook signing secret is required before enabling live mode."},409);
    }
    const healthPath=p.endpoints.health_check;
    if(typeof healthPath!=="string"||!healthPath.startsWith("/")||healthPath.startsWith("//"))return json({error:"Configure a relative health_check endpoint and pass a successful provider health test before enabling this binding."},409);
    let credential=p.credential;
    if(!credential){
      const {data:stored}=await admin.rpc("get_service_provider_admin_secret",{p_capability:p.capability,p_provider_key:p.providerKey});
      credential=Array.isArray(stored)?stored[0]?.credential:undefined;
    }
    if(!credential)return json({error:"A Vault credential is required before enabling this provider."},409);
    try{
      const target=new URL(healthPath,p.baseUrl);
      if(target.origin!==new URL(p.baseUrl).origin)return json({error:"Provider health endpoint must remain on the configured host."},400);
      const response=await fetch(target,{method:"GET",headers:{Authorization:"Bearer "+credential,Accept:"application/json"},signal:AbortSignal.timeout(10000)});
      const body=await response.json().catch(()=>null);
      if(!response.ok||body?.ok!==true)return json({error:"Provider health check failed. Provider mode was not changed."},502);
    }catch{return json({error:"Provider health check did not respond. Provider mode was not changed."},502);}
  }
  const args=p.action==="remove"
    ? {p_capability:p.capability,p_provider_key:p.providerKey,p_enabled:false,p_is_live:false,p_remove:true}
    : {p_capability:p.capability,p_provider_key:p.providerKey,p_enabled:p.enabled,p_is_live:p.live,p_base_url:p.baseUrl,p_endpoints:p.endpoints,p_settings:p.settings,p_credential:p.credential??null,p_webhook_secret:p.webhookSecret??null,p_remove:false};
  const {data,error}=await caller.rpc("admin_configure_service_provider",args);
  if(error)return json({error:"Provider change was rejected.",code:error.message},400);
  return json({success:true,result:data});
});