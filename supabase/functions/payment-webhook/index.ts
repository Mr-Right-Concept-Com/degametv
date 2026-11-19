import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function hmac(secret:string,body:string,algorithm:"SHA-256"|"SHA-512"){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:algorithm},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(body)));}
function equal(a:string,b:string){if(a.length!==b.length)return false;let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;}
async function sendTicketEmail(admin:ReturnType<typeof createClient>,url:string,service:string,reference:string){
 const {data:order}=await admin.from("guest_payment_orders").select("id,ticket_id,email,currency,app_origin,email_sent_at").eq("provider_reference",reference).maybeSingle();
 if(!order||order.email_sent_at)return false;
 const {data:siteSetting}=await admin.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
 const origin=typeof siteSetting?.setting_value==="string"?siteSetting.setting_value:"";
 if(siteSetting?.is_public!==true||!origin.startsWith("https://"))return false;
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
  const event=JSON.parse(raw);
  const reference=event?.reference||event?.data?.reference;
  if(typeof reference!=="string"||!/^DTV_[A-Za-z0-9]+$/.test(reference)&&!/^DTVL_[A-Za-z0-9]+$/.test(reference))return json(400,{error:"Invalid payment reference."});
  const liveOrder=reference.startsWith("DTVL_");
  const orderLookup=liveOrder
    ? await admin.from("live_payment_orders").select("provider,provider_mode,metadata,email_sent_at,status,user_id").eq("provider_reference",reference).maybeSingle()
    : await admin.from("guest_payment_orders").select("provider,provider_mode").eq("provider_reference",reference).maybeSingle();
  if(orderLookup.error||!orderLookup.data?.provider)return json(404,{error:"Payment order not found."});
  const [{data:binding,error:bindingError},{data:secrets,error:secretError}]=await Promise.all([
   admin.from("service_provider_bindings").select("provider_key,base_url,endpoints,settings,is_live").eq("capability","payments").eq("provider_key",orderLookup.data.provider).maybeSingle(),
   admin.rpc("get_service_provider_admin_secret",{p_capability:"payments",p_provider_key:orderLookup.data.provider})
  ]);
  const vault=Array.isArray(secrets)?secrets[0]:null;
  const mode=orderLookup.data.provider_mode==="live"||(orderLookup.data.provider_mode==null&&binding?.is_live===true)?"live":"test";
  const config=binding?{...binding,credential:mode==="live"?vault?.live_credential:vault?.test_credential,webhook_secret:mode==="live"?vault?.live_webhook_secret:vault?.test_webhook_secret}:null;
  if(bindingError||secretError||!config?.credential||!config?.webhook_secret)return json(503,{error:"The provider used by this payment has no retained webhook credentials."});
  const settings=config.settings||{};
  const signatureHeader=typeof settings.signature_header==="string"?settings.signature_header:"x-provider-signature";
  const algorithm=settings.signature_algorithm==="SHA-256"?"SHA-256":"SHA-512";
  const signature=req.headers.get(signatureHeader)||"",expected=await hmac(config.webhook_secret,raw,algorithm);
  const normalized=signature.toLowerCase().replace(/^sha256=/,"").replace(/^sha512=/,"");
  if(!equal(normalized,expected.toLowerCase()))return json(401,{error:"Invalid webhook signature."});
  if(liveOrder&&orderLookup.data.status==="paid"&&orderLookup.data.email_sent_at)return json(200,{received:true,verified:true,alreadyPaid:true,emailSent:true});
  const eventName=event?.event||event?.type;
  if(eventName!==(settings.success_event||"payment.succeeded"))return json(200,{received:true,ignored:true});
  const verifyPath=config.endpoints?.payment_verify;
  if(typeof verifyPath!=="string"||!verifyPath.startsWith("/")||verifyPath.startsWith("//"))return json(503,{error:"Payment verification endpoint is not configured."});
  const paystack=settings.adapter==="paystack";
  const verifyUrl=new URL(paystack?verifyPath.replace(/\/$/,"")+"/"+encodeURIComponent(reference):verifyPath,config.base_url);
  if(verifyUrl.origin!==new URL(config.base_url).origin)return json(503,{error:"Invalid payment verification endpoint."});
  const authHeader=typeof settings.credential_header==="string"?settings.credential_header:"Authorization";
  const authPrefix=typeof settings.credential_prefix==="string"?settings.credential_prefix:"Bearer ";
  const verification=await fetch(verifyUrl,{method:paystack?"GET":"POST",headers:{[authHeader]:authPrefix+config.credential,...(paystack?{}:{"Content-Type":"application/json"})},...(paystack?{}:{body:JSON.stringify({reference})}),signal:AbortSignal.timeout(15000)});
  const providerResult=await verification.json().catch(()=>null);
  const result=paystack?{verified:providerResult?.status===true&&providerResult?.data?.status==="success",status:providerResult?.data?.status==="success"?"paid":"unpaid",transaction_id:providerResult?.data?.id,amount_minor:providerResult?.data?.amount,currency:providerResult?.data?.currency}:providerResult;
  if(!verification.ok||result?.verified!==true||result?.status!=="paid")return json(202,{received:true,verified:false});
  const {data:liveOrderRow}=liveOrder?await admin.from("live_payment_orders").select("user_id,metadata,email_sent_at").eq("provider_reference",reference).maybeSingle():{data:null};
  let claimToken:string|null=null;
  let emailClaimed=false;
  if(liveOrder&&liveOrderRow?.user_id===null){
   const {data:claim}=await admin.rpc("claim_live_payment_email",{p_reference:reference});
   if(claim!==true)return json(202,{received:true,verified:true,fulfillment:"email_delivery_in_progress"});
   emailClaimed=true;
   claimToken=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
  }
  const claimHash=claimToken?await crypto.subtle.digest("SHA-256",new TextEncoder().encode(claimToken)).then(b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,"0")).join("")):null;
  const args=liveOrder?{p_reference:reference,p_transaction_id:String(result.transaction_id||reference),p_amount_minor:Number(result.amount_minor),p_currency:String(result.currency),p_claim_token_hash:claimHash}:{p_reference:reference,p_transaction_id:String(result.transaction_id||reference),p_amount_minor:Number(result.amount_minor),p_currency:String(result.currency)};
  const {data:completed,error:completeError}=await admin.rpc(liveOrder?"complete_live_payment_order":"complete_guest_payment_order",args);
  if(completeError){
   if(emailClaimed)await admin.from("live_payment_orders").update({email_delivery_claimed_at:null}).eq("provider_reference",reference);
   return json(409,{error:"Payment verification did not match the pending order."});
  }
  let emailSent=false;
  if(liveOrder&&completed?.ticket_id&&completed?.email&&emailClaimed&&claimToken){
   const {data:siteSetting}=await admin.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
   const origin=typeof siteSetting?.setting_value==="string"?siteSetting.setting_value:"";
   let deliveryUrl:string|null=null;
   try{const siteUrl=new URL(origin);if(siteSetting?.is_public===true&&siteUrl.protocol==="https:")deliveryUrl=new URL("/live/claim?token="+encodeURIComponent(claimToken),siteUrl).toString();}catch{deliveryUrl=null;}
   const mail=deliveryUrl?await fetch(url+"/functions/v1/send-watch-email",{method:"POST",headers:{"Authorization":"Bearer "+service,"apikey":service,"Content-Type":"application/json"},body:JSON.stringify({email:completed.email,movieTitle:completed.title||"Live event",watchUrl:deliveryUrl,ticketCode:completed.ticket_code,expiresAt:completed.valid_until,location:liveOrderRow?.metadata?.country_code||"Global",price:Number(completed.price),currency:completed.currency})}).catch(()=>null):null;
   emailSent=Boolean(mail?.ok);
   await admin.from("live_payment_orders").update(emailSent?{email_sent_at:new Date().toISOString(),email_delivery_claimed_at:null}:{email_delivery_claimed_at:null}).eq("provider_reference",reference);
  } else if(!liveOrder) emailSent=await sendTicketEmail(admin,url,service,reference);
  return json(200,{received:true,verified:true,fulfillment:completed,emailSent});
 }catch{return json(400,{error:"Invalid webhook payload."});}
});