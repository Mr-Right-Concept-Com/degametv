import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@3.25.76";
const schema=z.object({screeningId:z.string().uuid(),ticketType:z.enum(["live","replay","combo"]),currency:z.enum(["NGN","USD"])}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed"});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 const authorization=req.headers.get("Authorization")||"";
 if(!url||!service||!anon||!authorization.startsWith("Bearer "))return json(503,{error:"Checkout is unavailable."});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return json(400,{error:"Invalid event checkout request."});
 const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return json(401,{error:"Sign in before purchasing a live event ticket."});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {screeningId,ticketType,currency}=parsed.data;
  const {data:screening,error}=await db.from("screenings").select("id,tenant_id,content_id,title,slug,status,live_price_ngn,live_price_usd,replay_price_ngn,replay_price_usd,replay_access_hours,live_recording_status,live_replay_ready_at").eq("id",screeningId).eq("status","published").maybeSingle();
  if(error||!screening)return json(404,{error:"Published event not found."});
  const {data:stream}=await db.from("live_streams").select("id,tenant_id,status,metadata").eq("tenant_id",screening.tenant_id).contains("metadata",{screening_id:screening.id}).maybeSingle();
  if(!stream)return json(409,{error:"Live event has not been provisioned."});
  if(ticketType==="live"&&!["live","starting"].includes(stream.status))return json(409,{error:"Live admission is not currently available."});
  if(ticketType==="replay"&&(!screening.live_replay_ready_at||screening.live_recording_status!=="ready"))return json(409,{error:"Replay is not ready yet."});
  const price=ticketType==="live"?(currency==="NGN"?screening.live_price_ngn:screening.live_price_usd):(currency==="NGN"?screening.replay_price_ngn:screening.replay_price_usd);
  const amount=Number(price);if(!Number.isFinite(amount)||amount<=0)return json(409,{error:"This ticket price is not configured."});
  const {data:providers,error:providerError}=await db.rpc("get_service_provider_runtime_config",{p_capability:"payments"});
  if(providerError||!Array.isArray(providers)||!providers.length)return json(503,{error:"No payment provider is enabled in Admin Provider Vault."});
  const provider=providers[0],endpoint=provider.endpoints?.checkout_initialize;
  if(!provider.credential||typeof endpoint!=="string"||!endpoint.startsWith("/")||endpoint.startsWith("//"))return json(503,{error:"The active payment provider checkout adapter is incomplete."});
  const {data:profile}=await db.auth.admin.getUserById(user.id);
  const email=user.email||profile.user?.email;if(!email)return json(400,{error:"A verified account email is required."});
  const origin=Deno.env.get("SITE_URL")||req.headers.get("origin")||"";
  const parsedOrigin=new URL(origin);if(parsedOrigin.protocol!=="https:"&&!["localhost","127.0.0.1"].includes(parsedOrigin.hostname))return json(503,{error:"Secure return URL is not configured."});
  const reference="DTVL_"+crypto.randomUUID().replaceAll("-","");
  const minor=Math.round(amount*100);
  const {error:insertError}=await db.from("live_payment_orders").insert({tenant_id:screening.tenant_id,user_id:user.id,screening_id:screening.id,stream_id:stream.id,ticket_type:ticketType,provider:provider.provider_key,provider_reference:reference,email,amount_minor:minor,currency,metadata:{created_from:"viewer_checkout"}});
  if(insertError)return json(503,{error:"Could not create a secure ticket order. No charge was made."});
  const target=new URL(endpoint,provider.base_url);if(target.origin!==new URL(provider.base_url).origin)throw new Error("invalid_provider_endpoint");
  const h=provider.settings?.credential_header||"Authorization",prefix=provider.settings?.credential_prefix??"Bearer ";
  const response=await fetch(target,{method:"POST",headers:{[h]:prefix+provider.credential,"Content-Type":"application/json"},body:JSON.stringify({customer:{email},amount_minor:minor,currency,reference,callback_url:new URL("/payment/return?reference="+reference,parsedOrigin).toString(),metadata:{screening_id:screening.id,stream_id:stream.id,ticket_type:ticketType}}),signal:AbortSignal.timeout(15000)});
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.authorized!==true||typeof result.checkout_url!=="string"){await db.from("live_payment_orders").update({status:"failed"}).eq("provider_reference",reference);return json(502,{error:"Payment provider rejected checkout. No charge was made."});}
  const checkout=new URL(result.checkout_url),allowed=provider.settings?.allowed_checkout_origins;
  if(checkout.protocol!=="https:"||!Array.isArray(allowed)||!allowed.includes(checkout.origin))throw new Error("untrusted_checkout_url");
  await db.from("live_payment_orders").update({checkout_url:checkout.toString()}).eq("provider_reference",reference);
  return json(200,{success:true,reference,checkoutUrl:checkout.toString(),amount,currency,ticketType});
 }catch{return json(502,{error:"Checkout could not be initialized. No ticket has been issued."});}
});