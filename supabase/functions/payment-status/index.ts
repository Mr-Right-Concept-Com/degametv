import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@3.25.76";
const schema=z.object({reference:z.string().min(20).max(80).regex(/^DTV(?:L|G)?_[A-Za-z0-9]+$/)}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
const sha256=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,"0")).join("");
async function verifyProviderPayment(admin:ReturnType<typeof createClient>,reference:string,order:any){
 const [{data:binding,error:bindingError},{data:secretRows,error:secretError}]=await Promise.all([
  admin.from("service_provider_bindings").select("provider_key,base_url,endpoints,settings,is_live").eq("capability","payments").eq("provider_key",order.provider).maybeSingle(),
  admin.rpc("get_service_provider_admin_secret",{p_capability:"payments",p_provider_key:order.provider}),
 ]);
 const secrets=Array.isArray(secretRows)?secretRows[0]:null;
 const mode=order.provider_mode??(binding?.is_live===true?"live":"test");
 const credential=mode==="live"?secrets?.live_credential:secrets?.test_credential;
 if(bindingError||secretError||!binding?.base_url||!credential)return {state:"pending" as const};
 const path=binding.endpoints?.payment_verify;
 if(typeof path!=="string"||!path.startsWith("/")||path.startsWith("//"))return {state:"pending" as const};
 const adapter=String(binding.settings?.verification_adapter??binding.settings?.adapter??binding.provider_key).toLowerCase();
 const verificationReference=adapter==="stripe"?(order.provider_checkout_id||reference):reference;
 const target=new URL(adapter==="paystack"?path.replace(/\/$/,"")+"/"+encodeURIComponent(reference):path.replace("{reference}",encodeURIComponent(verificationReference)),binding.base_url);
 if(target.origin!==new URL(binding.base_url).origin)return {state:"pending" as const};
 const method=adapter==="paystack"||adapter==="stripe"||path.includes("{reference}")?"GET":String(binding.settings?.verify_method??"POST").toUpperCase();
 const referenceMode=String(binding.settings?.verify_reference_mode??"body");
 const referenceField=String(binding.settings?.verify_reference_field??"reference");
 if(method==="GET"&&!path.includes("{reference}")&&adapter!=="paystack")target.searchParams.set(String(binding.settings?.verify_reference_param??"reference"),verificationReference);
 const authHeader=typeof binding.settings?.credential_header==="string"?binding.settings.credential_header:"Authorization";
 const authPrefix=typeof binding.settings?.credential_prefix==="string"?binding.settings.credential_prefix:"Bearer ";
 const response=await fetch(target,{method,headers:{[authHeader]:authPrefix+credential,"Content-Type":"application/json",Accept:"application/json"},...(method==="POST"?{body:JSON.stringify(referenceMode==="query"?{}:{[referenceField]:reference})}:{}),signal:AbortSignal.timeout(12000)}).catch(()=>null);
 if(!response)return {state:"pending" as const};
 const payload=await response.json().catch(()=>null);
 if(!response.ok||!payload)return {state:"pending" as const};
 let verified=false,status="pending",amountMinor=0,currency="",transactionId=reference;
 if(adapter==="paystack"){
  verified=payload.status===true&&payload.data?.status==="success";
  status=String(payload.data?.status??"pending");
  amountMinor=Number(payload.data?.amount);
  currency=String(payload.data?.currency??"").toUpperCase();
  transactionId=String(payload.data?.id??reference);
 }else if(adapter==="stripe"){
  verified=payload.payment_status==="paid";
  status=String(payload.payment_status??"pending");
  amountMinor=Number(payload.amount_total);
  currency=String(payload.currency??"").toUpperCase();
  transactionId=String(payload.payment_intent??payload.id??reference);
 }else if(adapter==="flutterwave"){
  verified=payload.status==="success"&&payload.data?.status==="successful";
  status=String(payload.data?.status??"pending");
  currency=String(payload.data?.currency??"").toUpperCase();
  const major=Number(payload.data?.amount);
  const digits=currency&&/^[A-Z]{3}$/.test(currency)?new Intl.NumberFormat("en",{style:"currency",currency}).resolvedOptions().maximumFractionDigits:2;
  amountMinor=Math.round(major*Math.pow(10,digits));
  transactionId=String(payload.data?.id??reference);
 }else{
  verified=payload.verified===true&&payload.status==="paid";
  status=String(payload.status??"pending");
  amountMinor=Number(payload.amount_minor);
  currency=String(payload.currency??"").toUpperCase();
  transactionId=String(payload.transaction_id??reference);
 }
 if(["failed","abandoned","cancelled","canceled"].includes(status.toLowerCase()))return {state:"failed" as const};
 if(!verified||!Number.isSafeInteger(amountMinor)||amountMinor!==Number(order.amount_minor)||currency!==String(order.currency).toUpperCase())return {state:"pending" as const};
 return {state:"paid" as const,amountMinor,currency,transactionId};
}
async function publicOrigin(admin:ReturnType<typeof createClient>){
 const {data,error}=await admin.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
 const value=typeof data?.setting_value==="string"?data.setting_value:"";
 try{const u=new URL(value);if(error||data?.is_public!==true||u.protocol!=="https:"||u.username||u.password)return null;return u.origin;}catch{return null;}
}
async function dispatchTicketEmail(url:string,service:string,message:Record<string,unknown>){
 const response=await fetch(url+"/functions/v1/send-watch-email",{method:"POST",headers:{Authorization:"Bearer "+service,apikey:service,"Content-Type":"application/json"},body:JSON.stringify(message),signal:AbortSignal.timeout(20000)}).catch(()=>null);
 return Boolean(response?.ok);
}
serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{error:"A valid payment reference is required."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json(503,{error:"Payment status is temporarily unavailable."});
 try{
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const reference=parsed.data.reference;
  if(reference.startsWith("DTVG_")){
   const {data:contribution,error:contributionError}=await admin.from("event_contributions")
    .select("id,status,provider:provider_key,provider_mode,provider_reference,provider_checkout_id,amount_minor,currency,provider_transaction_id,amount_major,platform_fee_major")
    .eq("provider_reference",reference).maybeSingle();
   if(contributionError||!contribution)return json(404,{error:"No fan contribution was found for that payment reference."});
   let status=contribution.status;
   if(status==="pending"){
    const verified=await verifyProviderPayment(admin,reference,contribution);
    if(verified.state==="failed"){
     await admin.from("event_contributions").update({status:"failed"}).eq("id",contribution.id).eq("status","pending");
     status="failed";
    }else if(verified.state==="paid"){
     const {error:updateError}=await admin.from("event_contributions").update({
      status:"paid",provider_transaction_id:verified.transactionId,paid_at:new Date().toISOString(),
     }).eq("id",contribution.id).eq("status","pending");
     if(updateError)return json(503,{error:"Payment was verified, but the creator contribution record needs reconciliation."});
     status="paid";
    }
   }
   return json(200,{status,contribution:true,noContentEntitlement:true,provider:contribution.provider});
  }

  if(reference.startsWith("DTVL_")){
   const {data:order,error}=await admin.from("live_payment_orders").select("id,status,email,user_id,provider_reference,provider_checkout_id,provider,provider_mode,amount_minor,amount_major,currency,provider_transaction_id,stream_id,screening_id,ticket_type,metadata,email_sent_at").eq("provider_reference",reference).maybeSingle();
   if(error||!order)return json(404,{error:"No live event payment could be found for that reference."});
   let status=order.status;
   let emailSent=Boolean(order.email_sent_at);
   let claimToken:string|null=null;
   let claimed=false;
   let completed:any=null;
   if(status==="pending"){
    const verified=await verifyProviderPayment(admin,reference,order);
    if(verified.state==="failed"){
     await admin.from("live_payment_orders").update({status:"failed"}).eq("id",order.id).eq("status","pending");
     status="failed";
    }else if(verified.state==="paid"){
     if(order.user_id===null){
      const {data:claim}=await admin.rpc("claim_live_payment_email",{p_reference:reference});
      if(claim!==true)return json(200,{status:"pending",delivery:"email",email:order.email,provider:order.provider,emailSent:false});
      claimed=true;claimToken=randomToken();
     }
     const {data:result,error:completeError}=await admin.rpc("complete_live_payment_order",{
      p_reference:reference,p_transaction_id:verified.transactionId,p_amount_minor:verified.amountMinor,p_currency:verified.currency,
      p_claim_token_hash:claimToken?await sha256(claimToken):null,
     });
     if(completeError){
      if(claimed)await admin.from("live_payment_orders").update({email_delivery_claimed_at:null}).eq("id",order.id);
      return json(409,{error:"Payment was verified but ticket fulfillment is delayed. Retry status shortly."});
     }
     completed=result;status="paid";
    }
   }
   if(status==="paid"&&order.user_id===null&&!emailSent&&!claimed){
    const {data:claim}=await admin.rpc("claim_live_payment_email",{p_reference:reference});
    if(claim===true){
     claimed=true;claimToken=randomToken();
     const {data:result,error:completeError}=await admin.rpc("complete_live_payment_order",{
      p_reference:reference,p_transaction_id:order.provider_transaction_id||reference,p_amount_minor:order.amount_minor,p_currency:order.currency,
      p_claim_token_hash:await sha256(claimToken),
     });
     if(completeError){
      await admin.from("live_payment_orders").update({email_delivery_claimed_at:null}).eq("id",order.id);
      return json(409,{error:"Your paid ticket is confirmed, but secure email delivery needs a retry."});
     }
     completed=result;
    }
   }
   if(claimed&&claimToken&&completed?.ticket_id&&completed?.email){
    const origin=await publicOrigin(admin);
    const deliveryUrl=origin?new URL("/live/claim?token="+encodeURIComponent(claimToken),origin).toString():null;
    emailSent=deliveryUrl?await dispatchTicketEmail(url,service,{email:completed.email,movieTitle:completed.title||"Live event",watchUrl:deliveryUrl,ticketCode:completed.ticket_code,expiresAt:completed.valid_until,location:order.metadata?.country_code||"Global",price:Number(completed.price),currency:completed.currency}):false;
    await admin.from("live_payment_orders").update(emailSent?{email_sent_at:new Date().toISOString(),email_delivery_claimed_at:null}:{email_delivery_claimed_at:null}).eq("id",order.id);
   }else if(claimed){
    await admin.from("live_payment_orders").update({email_delivery_claimed_at:null}).eq("id",order.id);
   }
   return json(200,{status,delivery:order.user_id?"my_tickets":"email",email:order.email,provider:order.provider,emailSent});
  }

  const {data:order,error}=await admin.from("guest_payment_orders").select("id,ticket_id,status,email,provider_reference,provider_checkout_id,provider,provider_mode,amount_minor,currency,app_origin,email_sent_at").eq("provider_reference",reference).maybeSingle();
  if(error||!order)return json(404,{error:"No payment could be found for those details."});
  if(order.status==="pending"){
   const verified=await verifyProviderPayment(admin,reference,order);
   if(verified.state==="failed"){
    await admin.from("guest_payment_orders").update({status:"failed"}).eq("id",order.id).eq("status","pending");
    await admin.from("screening_tickets").update({payment_status:"failed"}).eq("id",order.ticket_id).eq("payment_status","pending");
   }else if(verified.state==="paid"){
    const {error:completeError}=await admin.rpc("complete_guest_payment_order",{p_reference:reference,p_transaction_id:verified.transactionId,p_amount_minor:verified.amountMinor,p_currency:verified.currency});
    if(completeError)return json(409,{error:"Payment was verified but ticket fulfillment is delayed. Retry status shortly."});
   }
  }
  const {data:latest,error:latestError}=await admin.from("guest_payment_orders").select("ticket_id,status,email_sent_at").eq("id",order.id).maybeSingle();
  if(latestError||!latest)return json(503,{error:"Payment status could not be refreshed."});
  if(latest.status!=="paid")return json(200,{status:latest.status});
  const {data:ticket,error:ticketError}=await admin.from("screening_tickets").select("ticket_code,watch_code,expires_at,screening_id,location,price").eq("id",latest.ticket_id).maybeSingle();
  if(ticketError||!ticket)return json(503,{error:"Your payment is confirmed, but ticket retrieval is delayed. Contact support with your reference."});
  let emailSent=Boolean(latest.email_sent_at);
  if(!latest.email_sent_at){
   const {data:claim}=await admin.from("guest_payment_orders").update({email_sent_at:new Date().toISOString()}).eq("id",order.id).is("email_sent_at",null).select("id").maybeSingle();
   if(claim){
    const {data:screening}=await admin.from("screenings").select("title").eq("id",ticket.screening_id).maybeSingle();
    const origin=await publicOrigin(admin);
    const watchUrl=origin?new URL("/watch/"+ticket.watch_code+"?email="+encodeURIComponent(order.email),origin).toString():null;
    emailSent=watchUrl?await dispatchTicketEmail(admin,url,service,{email:order.email,movieTitle:screening?.title||"Your DeGameTV screening",watchUrl,ticketCode:ticket.ticket_code,expiresAt:ticket.expires_at,location:ticket.location,price:Number(ticket.price),currency:order.currency}):false;
    if(!emailSent)await admin.from("guest_payment_orders").update({email_sent_at:null}).eq("id",order.id);
   }
  }
  return json(200,{status:"paid",email:order.email,location:ticket.location,price:Number(ticket.price),currency:order.currency,ticketCode:ticket.ticket_code,watchCode:ticket.watch_code,expiresAt:ticket.expires_at,screeningId:ticket.screening_id,emailSent});
 }catch(error){console.error("payment-status",error);return json(500,{error:"Payment status could not be retrieved. Retry shortly."});}
});
