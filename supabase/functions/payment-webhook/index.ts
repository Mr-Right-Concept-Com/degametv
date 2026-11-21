import { createServiceClient, type TypedSupabaseClient } from "../_shared/supabase.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const isRecord=(value:unknown):value is Record<string,unknown> =>
 value!==null&&typeof value==="object"&&!Array.isArray(value);

const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function hmac(secret:string,body:string,algorithm:"SHA-256"|"SHA-512"){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:algorithm},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(body)));}
function equal(a:string,b:string){if(a.length!==b.length)return false;let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;}
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
const sha256=async(value:string)=>hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
async function sendTicketEmail(admin:TypedSupabaseClient,url:string,service:string,reference:string){
 const {data:order}=await admin.from("guest_payment_orders").select("id,ticket_id,email,currency,email_sent_at").eq("provider_reference",reference).maybeSingle();
 if(!order||order.email_sent_at)return false;
 const {data:siteSetting}=await admin.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
 const origin=typeof siteSetting?.setting_value==="string"?siteSetting.setting_value:"";
 let canonical:string|null=null;
 try{const site=new URL(origin);if(siteSetting?.is_public===true&&site.protocol==="https:")canonical=site.origin;}catch{canonical=null;}
 if(!canonical)return false;
 const {data:claim}=await admin.from("guest_payment_orders").update({email_sent_at:new Date().toISOString()}).eq("id",order.id).is("email_sent_at",null).select("id").maybeSingle();
 if(!claim)return false;
 const {data:ticket}=await admin.from("screening_tickets").select("ticket_code,watch_code,expires_at,screening_id,location,price").eq("id",order.ticket_id).maybeSingle();
 const {data:screening}=ticket?await admin.from("screenings").select("title").eq("id",ticket.screening_id).maybeSingle():{data:null};
 if(!ticket){await admin.from("guest_payment_orders").update({email_sent_at:null}).eq("id",order.id);return false;}
 const response=await fetch(url+"/functions/v1/send-watch-email",{method:"POST",headers:{Authorization:"Bearer "+service,apikey:service,"Content-Type":"application/json"},body:JSON.stringify({email:order.email,movieTitle:screening?.title||"Your DeGameTV screening",watchUrl:canonical+"/watch/"+ticket.watch_code+"?email="+encodeURIComponent(order.email),ticketCode:ticket.ticket_code,expiresAt:ticket.expires_at,location:ticket.location,price:Number(ticket.price),currency:order.currency}),signal:AbortSignal.timeout(20000)}).catch(()=>null);
 if(!response?.ok)await admin.from("guest_payment_orders").update({email_sent_at:null}).eq("id",order.id);
 return Boolean(response?.ok);
}
serve(async(req:Request)=>{
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json(503,{error:"Webhook processor unavailable."});
 const raw=await req.text();
 try{
  const admin=createServiceClient(url,service);
  const parsedEvent:unknown=JSON.parse(raw);
  const event=isRecord(parsedEvent)?parsedEvent:{};
  const eventDataValue=isRecord(event.data)
   ? (isRecord(event.data.object)?event.data.object:event.data)
   : event;
  const eventData=isRecord(eventDataValue)?eventDataValue:{};
  const eventMetadata=isRecord(eventData.metadata)?eventData.metadata:{};
  const reference=eventData.reference??eventData.tx_ref??eventMetadata.reference??
   eventData.client_reference_id??event.reference??(isRecord(event.data)?event.data.reference:undefined);
  if(typeof reference!=="string"||(!/^DTV_[A-Za-z0-9]+$/.test(reference)&&!/^DTVL_[A-Za-z0-9]+$/.test(reference)&&!/^DTVG_[A-Za-z0-9]+$/.test(reference)&&!/^DTVW_[A-Za-z0-9]+$/.test(reference)))return json(400,{error:"Invalid payment reference."});
  const liveOrder=reference.startsWith("DTVL_");
  const contributionOrder=reference.startsWith("DTVG_");
  const walletTopupOrder=reference.startsWith("DTVW_");
  const orderLookup=liveOrder
   ? await admin.from("live_payment_orders").select("provider,provider_mode,provider_checkout_id,metadata,email_sent_at,status,user_id").eq("provider_reference",reference).maybeSingle()
   : contributionOrder
    ? await admin.from("event_contributions").select("provider:provider_key,provider_mode,provider_checkout_id,status").eq("provider_reference",reference).maybeSingle()
    : walletTopupOrder
     ? await admin.from("wallet_topup_orders").select("provider:provider_key,provider_mode,provider_checkout_id,status").eq("provider_reference",reference).maybeSingle()
     : await admin.from("guest_payment_orders").select("provider,provider_mode,provider_checkout_id").eq("provider_reference",reference).maybeSingle();
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
  const webhookAdapter=String(settings.webhook_adapter??settings.adapter??config.provider_key).toLowerCase();
  const signatureHeader=typeof settings.signature_header==="string"?settings.signature_header:(webhookAdapter==="paystack"?"x-paystack-signature":webhookAdapter==="stripe"?"stripe-signature":webhookAdapter==="flutterwave"?"verif-hash":"x-provider-signature");
  const signature=req.headers.get(signatureHeader)||"";
  const signatureAlgorithm=String(settings.signature_algorithm??(webhookAdapter==="paystack"?"paystack_hmac_sha512":webhookAdapter==="stripe"?"stripe_hmac_sha256":webhookAdapter==="flutterwave"?"flutterwave_verif_hash":"hmac_sha256"));
  let signatureValid=false;
  if(signatureAlgorithm==="flutterwave_verif_hash")signatureValid=equal(signature,config.webhook_secret);
  else if(signatureAlgorithm==="stripe_hmac_sha256"){
   const parts=Object.fromEntries(signature.split(",").map((part:string)=>part.trim().split("=",2)));
   const timestamp=Number(parts.t);
   if(Number.isFinite(timestamp)&&Math.abs(Date.now()/1000-timestamp)<=300&&typeof parts.v1==="string"){
    const expected=await hmac(config.webhook_secret,String(parts.t)+"."+raw,"SHA-256");
    signatureValid=equal(parts.v1.toLowerCase(),expected.toLowerCase());
   }
  }else{
   const algorithm=signatureAlgorithm==="paystack_hmac_sha512"?"SHA-512":"SHA-256";
   const expected=await hmac(config.webhook_secret,raw,algorithm);
   const normalized=signature.toLowerCase().replace(/^sha256=/,"").replace(/^sha512=/,"");
   signatureValid=equal(normalized,expected.toLowerCase());
  }
  if(!signatureValid)return json(401,{error:"Invalid webhook signature."});
  if(liveOrder&&orderLookup.data.status==="paid"&&orderLookup.data.email_sent_at)return json(200,{received:true,verified:true,alreadyPaid:true,emailSent:true});

  const eventName=String(event?.event||event?.type||"");
  const defaultSuccessEvent=webhookAdapter==="paystack"?"charge.success":webhookAdapter==="stripe"?"checkout.session.completed":webhookAdapter==="flutterwave"?"charge.completed":"payment.succeeded";
  if(eventName!==(settings.success_event||defaultSuccessEvent))return json(200,{received:true,ignored:true});
  const verifyPath=config.endpoints?.payment_verify;
  if(typeof verifyPath!=="string"||!verifyPath.startsWith("/")||verifyPath.startsWith("//"))return json(503,{error:"Payment verification endpoint is not configured."});
  const verificationAdapter=String(settings.verification_adapter??settings.adapter??config.provider_key).toLowerCase();
  const verificationReference=verificationAdapter==="stripe"?(orderLookup.data.provider_checkout_id||reference):reference;
  const verifyUrl=new URL(verificationAdapter==="paystack"?verifyPath.replace(/\/$/,"")+"/"+encodeURIComponent(reference):verifyPath.replace("{reference}",encodeURIComponent(verificationReference)),config.base_url);
  if(verifyUrl.origin!==new URL(config.base_url).origin)return json(503,{error:"Invalid payment verification endpoint."});
  const authHeader=typeof settings.credential_header==="string"?settings.credential_header:"Authorization";
  const authPrefix=typeof settings.credential_prefix==="string"?settings.credential_prefix:"Bearer ";
  const verifyMethod=verificationAdapter==="paystack"||verificationAdapter==="stripe"||verifyPath.includes("{reference}")?"GET":String(settings.verify_method??"POST").toUpperCase();
  const verifyField=String(settings.verify_reference_field??(verificationAdapter==="flutterwave"?"tx_ref":"reference"));
  if(verifyMethod==="GET"&&!verifyPath.includes("{reference}")&&verificationAdapter!=="paystack")verifyUrl.searchParams.set(String(settings.verify_reference_param??"reference"),verificationReference);
  const verification=await fetch(verifyUrl,{method:verifyMethod,headers:{[authHeader]:authPrefix+config.credential,Accept:"application/json",...(verifyMethod==="POST"?{"Content-Type":"application/json"}:{})},...(verifyMethod==="POST"?{body:JSON.stringify({[verifyField]:reference})}:{}),signal:AbortSignal.timeout(15000)}).catch(()=>null);
  if(!verification)return json(503,{error:"Payment verification provider is unavailable."});
  const providerResult=await verification.json().catch(()=>null);
  const providerPayload=isRecord(providerResult)?providerResult:{};
  const providerData=isRecord(providerPayload.data)?providerPayload.data:{};
  let result:Record<string,unknown>=providerPayload;
  if(verificationAdapter==="paystack"){
   const successful=providerPayload.status===true&&providerData.status==="success";
   result={verified:successful,status:successful?"paid":"unpaid",transaction_id:providerData.id,amount_minor:providerData.amount,currency:providerData.currency};
  }else if(verificationAdapter==="stripe"){
   const paid=providerPayload.payment_status==="paid";
   result={verified:paid,status:paid?"paid":"unpaid",transaction_id:providerPayload.payment_intent||providerPayload.id,amount_minor:providerPayload.amount_total,currency:providerPayload.currency};
  }else if(verificationAdapter==="flutterwave"){
   const currency=String(providerData.currency??"").toUpperCase();
   const major=Number(providerData.amount);
   const digits=currency&&/^[A-Z]{3}$/.test(currency)?new Intl.NumberFormat("en",{style:"currency",currency}).resolvedOptions().maximumFractionDigits:2;
   result={verified:providerPayload.status==="success"&&providerData.status==="successful",status:providerData.status==="successful"?"paid":"unpaid",transaction_id:providerData.id,amount_minor:Math.round(major*Math.pow(10,digits)),currency};
  }
  if(!verification.ok||result?.verified!==true||result?.status!=="paid"||!Number.isFinite(Number(result?.amount_minor))||typeof result?.currency!=="string")return json(409,{error:"Payment has not been verified as successful."});
  if(walletTopupOrder){
   const {data:credited,error:creditError}=await admin.rpc("credit_personal_wallet_topup",{
    p_reference:reference,p_transaction_id:String(result.transaction_id||reference),
    p_amount_minor:Number(result.amount_minor),p_currency:String(result.currency).toUpperCase()
   });
   if(creditError)return json(409,{error:"Payment was verified but Personal Wallet credit could not be completed."});
   return json(200,{received:true,verified:true,walletCredit:credited,entitlementGranted:false});
  }
  if(contributionOrder){
   const {data:completed,error:completeError}=await admin.rpc("complete_event_contribution",{
    p_reference:reference,p_transaction_id:String(result.transaction_id||reference),
    p_amount_minor:Number(result.amount_minor),p_currency:String(result.currency)
   });
   if(completeError)return json(409,{error:"Payment was verified but the contribution ledger could not be completed."});
   return json(200,{received:true,verified:true,fulfillment:completed,entitlementGranted:false});
  }
  const liveOrderRow=liveOrder?orderLookup.data:null;
  let claimToken:string|null=null,emailClaimed=false;
  if(liveOrder&&liveOrderRow?.user_id===null){
   const {data:claim}=await admin.rpc("claim_live_payment_email",{p_reference:reference});
   if(claim!==true)return json(202,{received:true,verified:true,fulfillment:"email_delivery_in_progress"});
   emailClaimed=true;claimToken=randomToken();
  }
  const claimHash=claimToken?await sha256(claimToken):null;
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
   const mail=deliveryUrl?await fetch(url+"/functions/v1/send-watch-email",{method:"POST",headers:{Authorization:"Bearer "+service,apikey:service,"Content-Type":"application/json"},body:JSON.stringify({email:completed.email,movieTitle:completed.title||"Live event",watchUrl:deliveryUrl,ticketCode:completed.ticket_code,expiresAt:completed.valid_until,location:liveOrderRow?.metadata?.country_code||"Global",price:Number(completed.price),currency:completed.currency}),signal:AbortSignal.timeout(20000)}).catch(()=>null):null;
   emailSent=Boolean(mail?.ok);
   await admin.from("live_payment_orders").update(emailSent?{email_sent_at:new Date().toISOString(),email_delivery_claimed_at:null}:{email_delivery_claimed_at:null}).eq("provider_reference",reference);
  }else if(!liveOrder)emailSent=await sendTicketEmail(admin,url,service,reference);
  return json(200,{received:true,verified:true,fulfillment:completed,emailSent});
 }catch(error){console.error("payment-webhook",error);return json(500,{error:"Webhook could not be processed."});}
});
