import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list") }),
  z.object({ action: z.literal("test"), capability: z.enum(["payments","identity","bank_verification","video_delivery","email","live_streaming","fx_rates","storage","cdn","drm","sms","push","geolocation","analytics"]), providerKey: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/) }),
  z.object({
    action: z.literal("configure"),
    capability: z.enum(["payments","identity","bank_verification","video_delivery","email","live_streaming","fx_rates","storage","cdn","drm","sms","push","geolocation","analytics"]),
    providerKey: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
    enabled: z.boolean(),
    live: z.boolean(),
    priority: z.number().int().min(0).max(10000).default(100),
    baseUrl: z.string().url().refine(v => new URL(v).protocol === "https:"),
    endpoints: z.record(z.string(), z.unknown()).default({}),
    settings: z.record(z.string(), z.unknown()).default({}),
    testCredential: z.string().max(10000).optional(),
    liveCredential: z.string().max(10000).optional(),
    testWebhookSecret: z.string().max(10000).optional(),
    liveWebhookSecret: z.string().max(10000).optional(),
  }),
  z.object({
    action: z.literal("remove"),
    capability: z.enum(["payments","identity","bank_verification","video_delivery","email","live_streaming","fx_rates","storage","cdn","drm","sms","push","geolocation","analytics"]),
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
  if(p.action==="configure"&&p.enabled){
    const endpoint=(key:string)=>typeof p.endpoints[key]==="string"&&(p.endpoints[key] as string).startsWith("/")&&!(p.endpoints[key] as string).startsWith("//");
    const adapter=String(p.settings.adapter??p.providerKey).toLowerCase();
    if(p.capability==="payments"){
      const currencies=p.settings.supported_currencies;
      const origins=p.settings.allowed_checkout_origins;
      if(!endpoint("checkout_initialize")||!endpoint("payment_verify")||!endpoint("refund")||!Array.isArray(currencies)||currencies.length===0||currencies.some((v:any)=>typeof v!=="string"||!/^[A-Z]{3}$/.test(v))||!Array.isArray(origins)||origins.length===0||origins.some((v:any)=>{try{const u=new URL(v);return u.protocol!=="https:"||u.origin!==v;}catch{return true;}}))
        return json({error:"Payment adapters require checkout_initialize, payment_verify and refund endpoints, ISO supported_currencies, and HTTPS allowed_checkout_origins."},400);
      const adapters=["paystack","stripe","flutterwave","generic"];
      const configuredAdapters=["checkout_adapter","verification_adapter","refund_adapter","webhook_adapter"];
      if(!adapters.includes(adapter)||configuredAdapters.some(key=>p.settings[key]!==undefined&&!adapters.includes(String(p.settings[key]).toLowerCase())))
        return json({error:"Payment adapters must use paystack, stripe, flutterwave or generic for each configured operation."},400);
      const signatureAlgorithm=String(p.settings.signature_algorithm??"");
      if(signatureAlgorithm&&!["paystack_hmac_sha512","stripe_hmac_sha256","flutterwave_verif_hash","hmac_sha256","SHA-256","SHA-512"].includes(signatureAlgorithm))
        return json({error:"Unsupported payment webhook signature algorithm."},400);
    }
    if(p.capability==="email"){
      const sender=String(p.settings.from_email??"");
      if(!endpoint("send_email")||!/^\S+@\S+\.\S+$/.test(sender)||!["resend","sendgrid","postmark","generic"].includes(adapter))
        return json({error:"Email adapters require send_email, a verified from_email, and a supported adapter (resend, sendgrid, postmark or generic)."},400);
    }
    if(p.capability==="fx_rates"&&!endpoint("rates"))return json({error:"FX adapters require a relative rates endpoint."},400);
    if(p.capability==="live_streaming"&&(!endpoint("create_live")||!endpoint("stop_live")))return json({error:"Live streaming adapters require create_live and stop_live endpoints."},400);
    if(p.capability==="identity"&&!endpoint("verify"))return json({error:"Identity adapters require a verify endpoint."},400);
    if(p.capability==="bank_verification"&&!endpoint("verify"))return json({error:"Bank verification adapters require a verify endpoint."},400);
    if(p.capability==="video_delivery"&&!endpoint("playback_authorize"))return json({error:"Video delivery adapters require a playback_authorize endpoint."},400);
    if(p.capability==="storage"&&(!endpoint("upload_init")||!endpoint("upload_complete")||!endpoint("signed_url")||!endpoint("delete")))return json({error:"Storage adapters require upload_init, upload_complete, signed_url and delete endpoints."},400);
    if(p.capability==="cdn"&&(!endpoint("sign_url")||!endpoint("purge")))return json({error:"CDN adapters require sign_url and purge endpoints."},400);
    if(p.capability==="drm"&&!endpoint("license"))return json({error:"DRM adapters require a license endpoint."},400);
    if(p.capability==="sms"&&!endpoint("send_sms"))return json({error:"SMS adapters require a send_sms endpoint."},400);
    if(p.capability==="push"&&!endpoint("send_push"))return json({error:"Push adapters require a send_push endpoint."},400);
    if(p.capability==="geolocation"&&!endpoint("lookup"))return json({error:"Geolocation adapters require a lookup endpoint."},400);
    if(p.capability==="analytics"&&!endpoint("ingest"))return json({error:"Analytics adapters require an ingest endpoint."},400);
  }
  if(p.action==="list"){
    const {data,error}=await admin.from("service_provider_bindings")
      .select("id,capability,provider_key,enabled,is_live,base_url,endpoints,settings,updated_at,removed_at,priority,health_status,health_checked_at,health_error,test_credential_secret_ref,live_credential_secret_ref,test_webhook_secret_ref,live_webhook_secret_ref,credential_secret_ref,webhook_secret_ref")
      .order("capability").order("priority").order("provider_key");
    if(error)return json({error:"Provider registry could not be loaded."},503);
    return json({providers:(data||[]).map(({test_credential_secret_ref,live_credential_secret_ref,test_webhook_secret_ref,live_webhook_secret_ref,credential_secret_ref,webhook_secret_ref,...row})=>({...row,hasTestCredential:Boolean(test_credential_secret_ref)||Boolean(credential_secret_ref&&!row.is_live),hasLiveCredential:Boolean(live_credential_secret_ref)||Boolean(credential_secret_ref&&row.is_live),hasTestWebhookSecret:Boolean(test_webhook_secret_ref)||Boolean(webhook_secret_ref&&!row.is_live),hasLiveWebhookSecret:Boolean(live_webhook_secret_ref)||Boolean(webhook_secret_ref&&row.is_live)}))});
  }
  if(p.action==="test"){
    const [{data:binding,error:bindingError},{data:secrets,error:secretError}]=await Promise.all([
      admin.from("service_provider_bindings").select("base_url,endpoints,settings,is_live").eq("capability",p.capability).eq("provider_key",p.providerKey).is("removed_at",null).maybeSingle(),
      admin.rpc("get_service_provider_admin_secret",{p_capability:p.capability,p_provider_key:p.providerKey})
    ]);
    const vault=Array.isArray(secrets)?secrets[0]:null;
    const mode=binding?.is_live===true?"live":"test";
    const credential=mode==="live"?vault?.live_credential:vault?.test_credential;
    if(bindingError||secretError||!binding?.base_url||!credential)return json({error:"Save the selected test/live credential and HTTPS base URL before testing."},409);
    const healthPath=binding.endpoints?.health_check;
    if(typeof healthPath!=="string"||!healthPath.startsWith("/")||healthPath.startsWith("//"))return json({error:"Configure a relative health_check endpoint in the provider contract."},409);
    const target=new URL(healthPath,binding.base_url);
    if(target.origin!==new URL(binding.base_url).origin)return json({error:"Provider health endpoint must remain on the configured host."},400);
    try{
      const response=await fetch(target,{method:"GET",headers:{Authorization:"Bearer "+credential,Accept:"application/json"},signal:AbortSignal.timeout(10000)});
      const body=await response.json().catch(()=>null);
      if(!response.ok||(body?.ok!==true&&body?.status!==true)){
        const message="Provider health check failed.";
        await admin.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:message}).eq("capability",p.capability).eq("provider_key",p.providerKey).is("removed_at",null);
        return json({success:false,error:message},502);
      }
      const checkedAt=new Date().toISOString();
      await admin.from("service_provider_bindings").update({health_status:"healthy",health_checked_at:checkedAt,health_error:null}).eq("capability",p.capability).eq("provider_key",p.providerKey).is("removed_at",null);
      return json({success:true,provider:p.providerKey,capability:p.capability,mode,checkedAt});
    }catch{
      const message="Provider health endpoint did not respond.";
      await admin.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:message}).eq("capability",p.capability).eq("provider_key",p.providerKey).is("removed_at",null);
      return json({success:false,error:message},502);
    }
  }
  if(p.action==="configure"&&p.live&&!p.enabled)return json({error:"Live mode requires the provider binding to be enabled."},400);
  if(p.action==="configure"&&p.enabled){
    const {data:stored}=await admin.rpc("get_service_provider_admin_secret",{p_capability:p.capability,p_provider_key:p.providerKey});
    const existing=Array.isArray(stored)?stored[0]:null;
    const credential=p.live?(p.liveCredential||existing?.live_credential):(p.testCredential||existing?.test_credential);
    const webhook=p.live?(p.liveWebhookSecret||existing?.live_webhook_secret):(p.testWebhookSecret||existing?.test_webhook_secret);
    if(["live_streaming","payments"].includes(p.capability)&&!webhook)return json({error:"A webhook signing secret for the selected test/live mode is required before enabling this provider."},409);
    const healthPath=p.endpoints.health_check;
    if(typeof healthPath!=="string"||!healthPath.startsWith("/")||healthPath.startsWith("//"))return json({error:"Configure a relative health_check endpoint before enabling this provider."},409);
    if(!credential)return json({error:"A Vault credential for the selected test/live mode is required."},409);
    try{
      const target=new URL(healthPath,p.baseUrl);
      if(target.origin!==new URL(p.baseUrl).origin)return json({error:"Provider health endpoint must remain on the configured host."},400);
      const response=await fetch(target,{method:"GET",headers:{Authorization:"Bearer "+credential,Accept:"application/json"},signal:AbortSignal.timeout(10000)});
      const body=await response.json().catch(()=>null);
      if(!response.ok||(body?.ok!==true&&body?.status!==true)){
        await admin.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:"Provider health check failed."}).eq("capability",p.capability).eq("provider_key",p.providerKey).is("removed_at",null);
        return json({error:"Provider health check failed. Provider mode was not changed."},502);
      }
    }catch{
      await admin.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:"Provider health check did not respond."}).eq("capability",p.capability).eq("provider_key",p.providerKey).is("removed_at",null);
      return json({error:"Provider health check did not respond. Provider mode was not changed."},502);
    }
  }
  if(p.action==="remove"&&p.capability==="payments"){
    const [guestPending,livePending]=await Promise.all([
      admin.from("guest_payment_orders").select("id",{count:"exact",head:true}).eq("provider",p.providerKey).eq("status","pending"),
      admin.from("live_payment_orders").select("id",{count:"exact",head:true}).eq("provider",p.providerKey).eq("status","pending"),
    ]);
    if(guestPending.error||livePending.error)return json({error:"Pending payment orders could not be checked; provider removal was blocked."},503);
    const pending=(guestPending.count??0)+(livePending.count??0);
    if(pending>0)return json({error:"This provider cannot be removed while "+pending+" payment orders are pending. Disable new routing, allow pending orders to settle, then remove it."},409);
  }
  const args=p.action==="remove"
    ? {p_capability:p.capability,p_provider_key:p.providerKey,p_enabled:false,p_is_live:false,p_remove:true}
    : {p_capability:p.capability,p_provider_key:p.providerKey,p_enabled:p.enabled,p_is_live:p.live,p_base_url:p.baseUrl,p_endpoints:p.endpoints,p_settings:p.settings,p_test_credential:p.testCredential??null,p_live_credential:p.liveCredential??null,p_test_webhook_secret:p.testWebhookSecret??null,p_live_webhook_secret:p.liveWebhookSecret??null,p_priority:p.priority};
  const {data,error}=p.action==="remove"
    ? await caller.rpc("admin_configure_service_provider_modes",args)
    : await caller.rpc("admin_configure_service_provider_modes_with_priority",args);
  if(error)return json({error:"Provider change was rejected.",code:error.message},400);
  if(p.action==="configure"){
    await admin.from("service_provider_bindings").update({
      health_status:p.enabled?"healthy":"unknown",
      health_checked_at:p.enabled?new Date().toISOString():null,
      health_error:null
    }).eq("capability",p.capability).eq("provider_key",p.providerKey).is("removed_at",null);
  }
  return json({success:true,result:data});
});