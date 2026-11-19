import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@3.25.76";
const schema=z.object({screeningId:z.string().uuid(),ticketType:z.enum(["live","replay","combo"]),currency:z.enum(["NGN","USD"]),email:z.string().trim().email().max(254).optional(),cohortId:z.string().min(8).max(128).optional()}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
async function featureEnabled(db: ReturnType<typeof createClient>, key: string, subject: string): Promise<boolean> {
 const {data:flag,error}=await db.from("platform_feature_controls").select("enabled,rollout_percentage,release_state").eq("feature_key",key).maybeSingle();
 if(error)return false;
 if(!flag)return true;
 if(!flag.enabled||["draft","paused","rolled_back"].includes(flag.release_state))return false;
 if(flag.release_state==="released")return flag.rollout_percentage===100;
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(subject+":"+key));
 return new DataView(digest).getUint32(0,false)%100<flag.rollout_percentage;
}
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed"});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 const authorization=req.headers.get("Authorization")||"";
 if(!url||!service||!anon)return json(503,{error:"Checkout is unavailable."});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return json(400,{error:"Invalid event checkout request."});
 let user=null;
 if(authorization) {
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error:userError}=await userClient.auth.getUser();
  if(userError||!data.user)return json(401,{error:"Your sign-in session is invalid. Sign in again or use guest checkout."});
  user=data.user;
 } else if(!parsed.data.email) {
  return json(400,{error:"Enter an email address for guest ticket delivery."});
 }
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const cohortSubject=parsed.data.cohortId??user?.id??parsed.data.email?.toLowerCase()??"guest";
 if(!await featureEnabled(db,"cinema.ticketing",cohortSubject))return json(403,{error:"Ticket checkout is paused for this release cohort."});
 try{
  const {screeningId,ticketType,currency}=parsed.data;
  const {data:screening,error}=await db.from("screenings").select("id,tenant_id,content_id,title,slug,status,live_price_ngn,live_price_usd,replay_price_ngn,replay_price_usd,replay_access_hours,replay_access_model,access_model,live_recording_status,live_replay_ready_at").eq("id",screeningId).eq("status","published").maybeSingle();
  if(error||!screening)return json(404,{error:"Published event not found."});
  const {data:stream}=await db.from("live_streams").select("id,tenant_id,status,metadata").eq("tenant_id",screening.tenant_id).contains("metadata",{screening_id:screening.id}).maybeSingle();
  if(!stream)return json(409,{error:"Live event has not been provisioned."});
  if(ticketType==="live"&&!["scheduled","live","starting"].includes(stream.status))return json(409,{error:"Live admission is not currently available."});
  if(ticketType==="live"&&screening.access_model==="FREE")return json(409,{error:"This event is free. Claim a free pass instead of checking out."});
  if(ticketType==="replay"&&screening.replay_access_model!=="SEPARATE_PRICE")return json(409,{error:"Replay access is included with the live ticket or available free; a separate replay purchase is not enabled."});
  if(ticketType==="replay"&&(!screening.live_replay_ready_at||screening.live_recording_status!=="ready"))return json(409,{error:"Replay is not ready yet."});
  const price=ticketType==="live"?(currency==="NGN"?screening.live_price_ngn:screening.live_price_usd):(currency==="NGN"?screening.replay_price_ngn:screening.replay_price_usd);
  const amount=Number(price);if(!Number.isFinite(amount)||amount<=0)return json(409,{error:"This ticket price is not configured."});
  const {data:providers,error:providerError}=await db.rpc("get_service_provider_runtime_config",{p_capability:"payments"});
  if(providerError||!Array.isArray(providers)||!providers.length)return json(503,{error:"No payment provider is enabled in Admin Provider Vault."});
  const usable=providers.filter((p:any)=>p.credential&&typeof p.endpoints?.checkout_initialize==="string"&&p.endpoints.checkout_initialize.startsWith("/")&&!p.endpoints.checkout_initialize.startsWith("//"));
  if(!usable.length)return json(503,{error:"No enabled payment provider has a complete checkout adapter contract."});
  const {data:profile}=user?await db.auth.admin.getUserById(user.id):{data:null};
  const email=user?.email||profile?.user?.email||parsed.data.email;
  if(!email)return json(400,{error:"An email address is required for ticket delivery."});
  const origin=Deno.env.get("SITE_URL")||req.headers.get("origin")||"";
  const parsedOrigin=new URL(origin);if(parsedOrigin.protocol!=="https:"&&!["localhost","127.0.0.1"].includes(parsedOrigin.hostname))return json(503,{error:"Secure return URL is not configured."});
  const reference="DTVL_"+crypto.randomUUID().replaceAll("-","");
  const minor=Math.round(amount*100);
  const {error:insertError}=await db.from("live_payment_orders").insert({tenant_id:screening.tenant_id,user_id:user?.id??null,guest_checkout:!user,screening_id:screening.id,stream_id:stream.id,ticket_type:ticketType,provider:usable[0].provider_key,provider_reference:reference,email,amount_minor:minor,currency,metadata:{created_from:"viewer_checkout",guest_checkout:!user}});
  if(insertError)return json(503,{error:"Could not create a secure ticket order. No charge was made."});
  let selected:any=null,checkoutUrl:string|null=null;
  for(const candidate of usable){
   try{
    const target=new URL(candidate.endpoints.checkout_initialize,candidate.base_url);
    if(target.origin!==new URL(candidate.base_url).origin)continue;
    const h=candidate.settings?.credential_header||"Authorization",prefix=candidate.settings?.credential_prefix??"Bearer ";
    const callbackUrl=new URL("/payment/return?reference="+reference,parsedOrigin).toString();
    const adapter=candidate.settings?.adapter;
    const requestBody=adapter==="paystack"
      ? {email,amount:minor,currency,reference,callback_url:callbackUrl,metadata:{screening_id:screening.id,stream_id:stream.id,ticket_type:ticketType}}
      : {customer:{email},amount_minor:minor,currency,reference,callback_url:callbackUrl,metadata:{screening_id:screening.id,stream_id:stream.id,ticket_type:ticketType}};
    const response=await fetch(target,{method:"POST",headers:{[h]:prefix+candidate.credential,"Content-Type":"application/json"},body:JSON.stringify(requestBody),signal:AbortSignal.timeout(15000)});
    const result=await response.json().catch(()=>null);
    const authorized=adapter==="paystack"?result?.status===true:result?.authorized===true;
    const checkoutValue=adapter==="paystack"?result?.data?.authorization_url:result?.checkout_url;
    if(!response.ok||!authorized||typeof checkoutValue!=="string")continue;
    const checkout=new URL(checkoutValue),allowed=candidate.settings?.allowed_checkout_origins;
    if(checkout.protocol!=="https:"||!Array.isArray(allowed)||!allowed.includes(checkout.origin))continue;
    selected=candidate;checkoutUrl=checkout.toString();break;
   }catch{continue;}
  }
  if(!selected||!checkoutUrl){await db.from("live_payment_orders").update({status:"failed"}).eq("provider_reference",reference);return json(502,{error:"No configured payment provider accepted checkout. No charge was made."});}
  await db.from("live_payment_orders").update({provider:selected.provider_key,checkout_url:checkoutUrl,metadata:{created_from:"viewer_checkout",guest_checkout:!user,provider_mode:selected.is_live===true?"live":"test"}}).eq("provider_reference",reference);
  return json(200,{success:true,reference,checkoutUrl,amount,currency,ticketType,provider:selected.provider_key});
 }catch{return json(502,{error:"Checkout could not be initialized. No ticket has been issued."});}
});