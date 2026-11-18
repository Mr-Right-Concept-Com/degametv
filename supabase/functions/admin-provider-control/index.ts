import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list") }),
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
      .select("id,capability,provider_key,enabled,is_live,base_url,endpoints,settings,updated_at,removed_at")
      .order("capability").order("provider_key");
    if(error)return json({error:"Provider registry could not be loaded."},503);
    return json({providers:data||[]});
  }
  const args=p.action==="remove"
    ? {p_capability:p.capability,p_provider_key:p.providerKey,p_enabled:false,p_is_live:false,p_remove:true}
    : {p_capability:p.capability,p_provider_key:p.providerKey,p_enabled:p.enabled,p_is_live:p.live,p_base_url:p.baseUrl,p_endpoints:p.endpoints,p_settings:p.settings,p_credential:p.credential??null,p_webhook_secret:p.webhookSecret??null,p_remove:false};
  const {data,error}=await caller.rpc("admin_configure_service_provider",args);
  if(error)return json({error:"Provider change was rejected.",code:error.message},400);
  return json({success:true,result:data});
});