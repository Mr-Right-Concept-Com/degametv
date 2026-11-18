import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function hmac(secret:string,body:string,algorithm:"SHA-256"|"SHA-512"){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:algorithm},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(body)));}
function equal(a:string,b:string){if(a.length!==b.length)return false;let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;}
async function sendTicketEmail(admin:ReturnType<typeof createClient>,url:string,service:string,reference:string){
 const {data:order}=await admin.from("guest_payment_orders").select("id,ticket_id,email,currency,app_origin,email_sent_at").eq("provider_reference",reference).maybeSingle();
 if(!order||order.email_sent_at||!order.app_origin)return false;
 const {data:claim}=await admin.from("guest_payment_orders").update({email_sent_at:new Date().toISOString()}).eq("id",order.id).is("email_sent_at",null).select("id").maybeSingle();
 if(!claim)return false;
 const {data:ticket}=await admin.from("screening_tickets").select("ticket_code,watch_code,expires_at,screening_id,location,price").eq("id",order.ticket_id).maybeSingle();
 const {data:screening}=ticket?await admin.from("screenings").select("title").eq("id",ticket.screening_id).maybeSingle():{data:null};
 if(!ticket){await admin.from("guest_payment_orders").update({email_sent_at:null}).eq("id",order.id);return false;}
 const response=await fetch(url+"/functions/v1/send-watch-email",{method:"POST",headers:{"Authorization":"Bearer "+service,"apikey":service,"Content-Type":"application/json"},body:JSON.stringify({email:order.email,movieTitle:screening?.title||"Your DeGameTV screening",watchUrl:order.app_origin.replace(/\/$/,"")+"/watch/"+ticket.watch_code+"?email="+encodeURIComponent(order.email),ticketCode:ticket.ticket_code,expiresAt:ticket.expires_at,location:ticket.location,price:Number(ticket.price),currency:order.currency})}).catch(()=>null);
 if(!response?.ok)await admin.from("guest_payment_orders").update({email_sent_at:null}).eq("id",order.id);
 return Boolean(response?.ok);
}
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json(503,{error:"Webhook processor unavailable."});
 const raw=await req.text();
 try{
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:configs,error}=await admin.rpc("get_service_provider_runtime_config",{p_capability:"payments"});
  if(error||!Array.isArray(configs)||!configs.length||!configs[0].credential||!configs[0].webhook_secret)return json(503,{error:"Active payment provider or webhook secret is not configured."});
  const config=configs[0],settings=config.settings||{};
  const signatureHeader=typeof settings.signature_header==="string"?settings.signature_header:"x-provider-signature";
  const algorithm=settings.signature_algorithm==="SHA-256"?"SHA-256":"SHA-512";
  const signature=req.headers.get(signatureHeader)||"",expected=await hmac(config.webhook_secret,raw,algorithm);
  const normalized=signature.toLowerCase().replace(/^sha256=/,"").replace(/^sha512=/,"");
  if(!equal(normalized,expected.toLowerCase()))return json(401,{error:"Invalid webhook signature."});
  const event=JSON.parse(raw);
  if(event?.type!==(settings.success_event||"payment.succeeded"))return json(200,{received:true,ignored:true});
  const reference=event?.reference;
  if(typeof reference!=="string"||!/^DTV_[A-Za-z0-9]+$/.test(reference)&&!/^DTVL_[A-Za-z0-9]+$/.test(reference))return json(400,{error:"Invalid payment reference."});
  const verifyPath=config.endpoints?.payment_verify;
  if(typeof verifyPath!=="string"||!verifyPath.startsWith("/")||verifyPath.startsWith("//"))return json(503,{error:"Payment verification endpoint is not configured."});
  const verifyUrl=new URL(verifyPath,config.base_url);
  if(verifyUrl.origin!==new URL(config.base_url).origin)return json(503,{error:"Invalid payment verification endpoint."});
  const authHeader=typeof settings.credential_header==="string"?settings.credential_header:"Authorization";
  const authPrefix=typeof settings.credential_prefix==="string"?settings.credential_prefix:"Bearer ";
  const verification=await fetch(verifyUrl,{method:"POST",headers:{[authHeader]:authPrefix+config.credential,"Content-Type":"application/json"},body:JSON.stringify({reference}),signal:AbortSignal.timeout(15000)});
  const result=await verification.json().catch(()=>null);
  if(!verification.ok||result?.verified!==true||result?.status!=="paid")return json(202,{received:true,verified:false});
  const liveOrder=reference.startsWith("DTVL_");
  const {data:liveOrderRow}=liveOrder?await admin.from("live_payment_orders").select("user_id").eq("provider_reference",reference).maybeSingle():{data:null};
  const claimToken=liveOrder&&liveOrderRow?.user_id===null?Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join(""):null;
  const claimHash=claimToken?await crypto.subtle.digest("SHA-256",new TextEncoder().encode(claimToken)).then(b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,"0")).join("")):null;
  const args=liveOrder?{p_reference:reference,p_transaction_id:String(result.transaction_id||reference),p_amount_minor:Number(result.amount_minor),p_currency:String(result.currency),p_claim_token_hash:claimHash}:{p_reference:reference,p_transaction_id:String(result.transaction_id||reference),p_amount_minor:Number(result.amount_minor),p_currency:String(result.currency)};
  const {data:completed,error:completeError}=await admin.rpc(liveOrder?"complete_live_payment_order":"complete_guest_payment_order",args);
  if(completeError)return json(409,{error:"Payment verification did not match the pending order."});
  let emailSent=false;
  if(liveOrder&&completed?.ticket_id&&completed?.email){
   const configuredSite=Deno.env.get("SITE_URL")||req.headers.get("origin")||"";
   let deliveryUrl:string|null=null;
   try {
    const siteUrl=new URL(configuredSite);
    if(siteUrl.protocol==="https:"||siteUrl.hostname==="localhost") {
     deliveryUrl=new URL(claimToken?"/live/claim?token="+encodeURIComponent(claimToken):"/tickets",siteUrl).toString();
    }
   } catch { deliveryUrl=null; }
   if(deliveryUrl) {
    const mail=await fetch(url+"/functions/v1/send-watch-email",{method:"POST",headers:{"Authorization":"Bearer "+service,"apikey":service,"Content-Type":"application/json"},body:JSON.stringify({email:completed.email,movieTitle:completed.title||"Live event",watchUrl:deliveryUrl,ticketCode:completed.ticket_code,expiresAt:completed.valid_until,location:completed.currency==="NGN"?"nigeria":"international",price:Number(completed.price),currency:completed.currency})}).catch(()=>null);
    emailSent=Boolean(mail?.ok);
   }
  } else if(!liveOrder) emailSent=await sendTicketEmail(admin,url,service,reference);
  return json(200,{received:true,verified:true,fulfillment:completed,emailSent});
 }catch{return json(400,{error:"Invalid webhook payload."});}
});