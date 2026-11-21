import { createServiceClient, createUserClient, type TypedSupabaseClient } from "../_shared/supabase.ts";
import { z } from "npm:zod@3";
const Body=z.object({
 screeningId:z.string().uuid().optional(),
 liveStreamId:z.string().uuid().optional(),
 contentId:z.string().uuid().optional(),
 contributionType:z.enum(["tip","gift"]),
 giftCatalogKey:z.string().trim().min(1).max(80).optional(),
 amount:z.number().finite().positive().max(10000000).optional(),
 currency:z.string().regex(/^[A-Za-z]{3}$/),
 countryCode:z.string().regex(/^[A-Za-z]{2}$/).optional(),
 message:z.string().trim().max(500).optional(),
 contributorName:z.string().trim().max(100).optional(),
 isAnonymous:z.boolean().default(false),
 method:z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/).optional(),
 paymentMethod:z.enum(["provider","personal_wallet"]).default("provider"),
 idempotencyKey:z.string().uuid().optional()
}).strict().refine(v=>[v.screeningId,v.liveStreamId,v.contentId].filter(Boolean).length===1,"Choose exactly one support target.").refine(v=>v.contributionType==="tip"?v.amount!==undefined:Boolean(v.giftCatalogKey),"Tips require an amount; gifts require a catalogue item.");
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type, cf-ipcountry","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const markProviderHealth=async(db:TypedSupabaseClient,id:string,status:'healthy'|'unhealthy',error:string|null=null)=>{await db.from('service_provider_bindings').update({health_status:status,health_checked_at:new Date().toISOString(),health_error:error}).eq('id',id);};
type PaymentProvider={id:string;provider_key:string;is_live:boolean;credential:string;settings:Record<string,unknown>;endpoints:Record<string,unknown>;base_url:string};
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null&&!Array.isArray(value);
const isPaymentProvider=(value:unknown):value is PaymentProvider=>isRecord(value)&&typeof value.id==="string"&&typeof value.provider_key==="string"&&value.is_live===true&&typeof value.credential==="string"&&isRecord(value.settings)&&isRecord(value.endpoints)&&typeof value.base_url==="string";
const minorScale=(currency:string)=>["BIF","CLP","DJF","GNF","ISK","JPY","KMF","KRW","PYG","RWF","UGX","VND","VUV","XAF","XOF","XPF"].includes(currency)?1:["BHD","IQD","JOD","KWD","LYD","OMR","TND"].includes(currency)?1000:100;
async function convert(base:string,service:string,amount:number,from:string,to:string,country:string){
 if(from===to)return amount;
 const r=await fetch(base+"/functions/v1/convert-currency",{method:"POST",headers:{Authorization:"Bearer "+service,apikey:service,"Content-Type":"application/json"},body:JSON.stringify({amount,fromCurrency:from,toCurrency:to,country}),signal:AbortSignal.timeout(12000)});
 const d=await r.json().catch(()=>null);if(!r.ok||!Number.isFinite(d?.converted))throw new Error("Currency conversion is unavailable.");return Number(d.converted);
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY"),auth=req.headers.get("Authorization")||"";
 if(!url||!service||!anon||!auth.startsWith("Bearer "))return json(401,{error:"Sign in before sending a tip or gift."});
 const userClient=createUserClient(url,anon,auth);
 const {data:{user},error:userError}=await userClient.auth.getUser();
 if(userError||!user||!user.email)return json(401,{error:"Your sign-in session is invalid."});
 const parsed=Body.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{error:"Invalid contribution details."});
 const p=parsed.data,db=createServiceClient(url,service);
 try{
  if(p.idempotencyKey){
   const {data:existing,error:existingError}=await db.from("event_contributions")
    .select("id,provider_reference,status,checkout_url,amount_major,currency,contribution_type,provider_mode")
    .eq("contributor_user_id",user.id).eq("idempotency_key",p.idempotencyKey).maybeSingle();
   if(existingError)return json(503,{error:"Could not confirm the previous contribution request."});
   if(existing){
    if(existing.status==="pending"&&existing.checkout_url)return json(200,{success:true,checkoutUrl:existing.checkout_url,reference:existing.provider_reference,amount:existing.amount_major,currency:existing.currency,contributionType:existing.contribution_type,reused:true});
    if(existing.status==="paid"&&existing.provider_mode==="wallet")return json(200,{success:true,paid:true,reference:existing.provider_reference,contributionType:existing.contribution_type,reused:true});
    if(existing.status==="paid")return json(409,{error:"This contribution has already been paid.",alreadyPaid:true});
    if(existing.status==="pending"&&existing.provider_mode==="wallet"){
     const {data:spent,error:spendError}=await db.rpc("spend_personal_wallet_for_contribution",{p_contribution_id:existing.id});
     if(!spendError)return json(200,{success:true,paid:true,reference:existing.provider_reference,contributionType:existing.contribution_type,reused:true,balanceMinor:spent?.balance_minor});
     return json(spendError.message.includes("insufficient_personal_wallet_funds")?402:409,{error:spendError.message.includes("insufficient_personal_wallet_funds")?"Insufficient Personal Wallet balance. Top up your wallet or use external checkout.":"The wallet contribution could not be completed. Please retry.",retryable:!spendError.message.includes("insufficient_personal_wallet_funds")});
    }
    if(["failed","refunded"].includes(existing.status))return json(409,{error:"The previous attempt did not complete. Start a new contribution attempt.",retryable:true});
    return json(409,{error:"This contribution request is already being processed. Please wait before retrying."});
   }
  }
  const {data:profile}=await db.from("profiles").select("preferred_country,preferred_currency").eq("user_id",user.id).maybeSingle();
  const edgeCountry=req.headers.get("cf-ipcountry")?.toUpperCase();
  const country=p.countryCode?.toUpperCase()??profile?.preferred_country?.toUpperCase()??(edgeCountry&&/^[A-Z]{2}$/.test(edgeCountry)?edgeCountry:null);
  if(!country)return json(422,{error:"Choose your country before sending a contribution."});
  const {data:countryRule}=await db.from("country_currency_rules").select("currency_code").eq("country_code",country).eq("enabled",true).maybeSingle();
  if(!countryRule)return json(422,{error:"Contributions are not enabled for this country."});
  const currency=p.currency.toUpperCase();
  const {count:currencyCount}=await db.from("country_currency_rules").select("country_code",{count:"exact",head:true}).eq("currency_code",currency).eq("enabled",true);
  if(!currencyCount)return json(422,{error:"This contribution currency is not enabled."});
  let tenantId:string|null=null,creatorId:string|null=null,eventTitle:string|null=null;const screeningId:string|null=p.screeningId??null,liveStreamId:string|null=p.liveStreamId??null,contentId:string|null=p.contentId??null;
  if(p.screeningId){
   const {data:event,error}=await db.from("screenings").select("id,tenant_id,content_id,title,status,lifecycle,event_visibility,invite_only").eq("id",p.screeningId).eq("status","published").maybeSingle();
   if(error||!event)return json(404,{error:"Event not found."});
   if(event.lifecycle==="cancelled"||event.lifecycle==="archived")return json(410,{error:"This event is no longer accepting contributions."});
   const {data:content}=await db.from("content").select("creator_id").eq("id",event.content_id).maybeSingle();
   if(!content?.creator_id)return json(409,{error:"The event creator is not configured."});
   if(event.event_visibility==="private"||event.invite_only){
    const {data:invite}=await db.from("event_access_invites").select("id").eq("screening_id",event.id).eq("invited_user_id",user.id).eq("status","accepted").or("expires_at.is.null,expires_at.gt."+new Date().toISOString()).maybeSingle();
    if(!invite)return json(403,{error:"An accepted event invitation is required."});
   }
   tenantId=event.tenant_id;creatorId=content.creator_id;eventTitle=event.title;
  }else if(p.liveStreamId){
   const {data:stream,error}=await db.from("live_streams").select("id,tenant_id,creator_id,status,title,metadata").eq("id",p.liveStreamId).maybeSingle();
   if(error||!stream||!["scheduled","starting","live"].includes(stream.status))return json(404,{error:"Live event is not accepting contributions."});
   const streamScreeningId=typeof stream.metadata?.screening_id==="string"?stream.metadata.screening_id:null;
   const privateStream=stream.metadata?.invite_only===true||stream.metadata?.event_visibility==="private";
   if(streamScreeningId){
    const {data:event}=await db.from("screenings").select("event_visibility,invite_only").eq("id",streamScreeningId).maybeSingle();
    if(event&&(event.event_visibility==="private"||event.invite_only)) {
     const {data:invite}=await db.from("event_access_invites").select("id").eq("screening_id",streamScreeningId).eq("invited_user_id",user.id).eq("status","accepted").or("expires_at.is.null,expires_at.gt."+new Date().toISOString()).maybeSingle();
     if(!invite)return json(403,{error:"An accepted event invitation is required."});
    }
   }else if(privateStream){
    const {data:invite}=await db.from("event_access_invites").select("id").eq("live_stream_id",stream.id).eq("invited_user_id",user.id).eq("status","accepted").or("expires_at.is.null,expires_at.gt."+new Date().toISOString()).maybeSingle();
    if(!invite)return json(403,{error:"An accepted event invitation is required."});
   }
   tenantId=stream.tenant_id;creatorId=stream.creator_id;eventTitle=stream.title||"Live event";
  }else if(p.contentId){
   const {data:content,error}=await db.from("content").select("id,tenant_id,creator_id,title,status,availability_start,availability_end").eq("id",p.contentId).maybeSingle();
   if(error||!content||content.status!=="published")return json(404,{error:"Published content not found."});
   const now=Date.now();
   if(content.availability_start&&new Date(content.availability_start).getTime()>now)return json(403,{error:"This content is not available yet."});
   if(content.availability_end&&new Date(content.availability_end).getTime()<=now)return json(410,{error:"This content is no longer available."});
   if(!content.creator_id)return json(409,{error:"The content creator is not configured."});
   tenantId=content.tenant_id;creatorId=content.creator_id;eventTitle=content.title||"Content";
  }
  if(!tenantId||!creatorId||!eventTitle)return json(400,{error:"A valid contribution target is required."});
  if(creatorId===user.id)return json(403,{error:"You cannot send a gift or tip to your own content."});
  let giftAmount:number|undefined;
  if(p.contributionType==="gift"){
   const {data:gift,error:giftError}=await db.from("creator_gift_catalog").select("gift_key,amount_minor,currency,is_enabled").eq("gift_key",p.giftCatalogKey).eq("currency",currency).eq("is_enabled",true).maybeSingle();
   if(giftError||!gift||gift.currency!==currency)return json(422,{error:"This gift is unavailable in the selected currency."});
   giftAmount=Number(gift.amount_minor)/minorScale(currency);
  }
  const requestedAmount=p.contributionType==="gift"?giftAmount!:p.amount!;
  const amount=await convert(url,service,requestedAmount,currency,currency,country);
  const scale=minorScale(currency),amountMinor=Math.round(amount*scale);
  if(!Number.isSafeInteger(amountMinor)||amountMinor<=0)return json(422,{error:"Contribution amount is invalid."});
  let usable:PaymentProvider[]=[];
  if(p.paymentMethod==="provider"){
   const {data:providers,error:providerError}=await db.rpc("get_service_provider_runtime_config",{p_capability:"payments"});
   if(providerError||!Array.isArray(providers))return json(503,{error:"No payment provider is configured."});
   usable=providers.filter((value:unknown):value is PaymentProvider=>isPaymentProvider(value)&&Array.isArray(value.settings.supported_currencies)&&value.settings.supported_currencies.includes(currency)&&typeof value.endpoints.checkout_initialize==="string"&&value.endpoints.checkout_initialize.startsWith("/")&&!value.endpoints.checkout_initialize.startsWith("//")&&typeof value.endpoints.payment_verify==="string"&&value.endpoints.payment_verify.startsWith("/")&&!value.endpoints.payment_verify.startsWith("//")&&(!p.method||value.provider_key===p.method));
   if(!usable.length)return json(503,{error:"No live payment provider is available for this currency."});
  }
  const {data:commissionSetting,error:commissionError}=await db.from("platform_settings").select("setting_value").eq("setting_key","commission_rates").maybeSingle();
  const rate=Number(commissionSetting?.setting_value?.creator);
  if(commissionError||!Number.isFinite(rate)||rate<0||rate>0.5)return json(503,{error:"Creator commission policy is not configured safely."});
  const amountMajor=amountMinor/scale,feeMajor=Math.round(amountMajor*rate*scale)/scale;
  const reference="DTVG_"+crypto.randomUUID().replaceAll("-","");
  const {data:siteSetting}=await db.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
  let origin:string;try{const site=new URL(String(siteSetting?.setting_value||""));if(siteSetting?.is_public!==true||site.protocol!=="https:")throw new Error();origin=site.origin;}catch{return json(503,{error:"The canonical return URL is not configured."});}
  const {data:createdContribution,error:insertError}=await db.from("event_contributions").insert({
   tenant_id:tenantId,creator_id:creatorId,screening_id:screeningId,live_stream_id:liveStreamId,content_id:contentId,target_kind:contentId?"content":"event",
   contributor_user_id:user.id,idempotency_key:p.idempotencyKey??null,contributor_name:p.isAnonymous?null:(p.contributorName||user.user_metadata?.full_name||user.email),
   contributor_email:user.email,contribution_type:p.contributionType,gift_catalog_key:p.contributionType==="gift"?p.giftCatalogKey??"standard":null,
   message:p.message??null,amount_minor:amountMinor,amount_major:amountMajor,platform_fee_major:feeMajor,currency,
   provider_key:p.paymentMethod==="personal_wallet"?"personal_wallet":usable[0].provider_key,provider_reference:reference,provider_mode:p.paymentMethod==="personal_wallet"?"wallet":"live",status:"pending",is_anonymous:p.isAnonymous
  }).select("id").single();
  if(insertError){
   if(p.idempotencyKey){
    const {data:existing}=await db.from("event_contributions").select("provider_reference,status,checkout_url,amount_major,currency,contribution_type").eq("contributor_user_id",user.id).eq("idempotency_key",p.idempotencyKey).maybeSingle();
    if(existing?.status==="pending"&&existing.checkout_url)return json(200,{success:true,checkoutUrl:existing.checkout_url,reference:existing.provider_reference,amount:existing.amount_major,currency:existing.currency,contributionType:existing.contribution_type,reused:true});
    if(existing)return json(409,{error:"This contribution request is already being processed. Please wait before retrying."});
   }
   return json(503,{error:"Could not create contribution order. No charge was made."});
  }
  if(p.paymentMethod==="personal_wallet"){
   if(!createdContribution?.id)return json(503,{error:"Could not create wallet contribution record."});
   const {data:spent,error:spendError}=await db.rpc("spend_personal_wallet_for_contribution",{p_contribution_id:createdContribution.id});
   if(spendError){
    if(!spendError.message.includes("insufficient_personal_wallet_funds"))await db.from("event_contributions").update({status:"failed"}).eq("id",createdContribution.id).eq("status","pending");
    return json(spendError.message.includes("insufficient_personal_wallet_funds")?402:409,{error:spendError.message.includes("insufficient_personal_wallet_funds")?"Insufficient Personal Wallet balance. Top up your wallet or use external checkout.":"The wallet contribution could not be completed. Please retry."});
   }
   return json(200,{success:true,paid:true,reference,contributionId:createdContribution.id,contributionType:p.contributionType,balanceMinor:spent?.balance_minor});
  }
  let checkoutUrl:string|null=null,selected:PaymentProvider|null=null,checkoutId:string|null=null;
  for(const provider of usable){
   try{
    const checkoutEndpoint=provider.endpoints.checkout_initialize;if(typeof checkoutEndpoint!=="string")continue;const target=new URL(checkoutEndpoint,provider.base_url);if(target.origin!==new URL(provider.base_url).origin){await markProviderHealth(db,provider.id,"unhealthy","Checkout endpoint host mismatch.");continue;}
    const header=typeof provider.settings?.credential_header==="string"?provider.settings.credential_header:"Authorization",prefix=typeof provider.settings?.credential_prefix==="string"?provider.settings.credential_prefix:"Bearer ";
    const callback=new URL("/payment/return?reference="+reference,origin).toString();
    const adapter=String(provider.settings?.checkout_adapter??provider.settings?.adapter??provider.provider_key).toLowerCase();
    const metadata={reference,contribution_id:reference,contribution_type:p.contributionType,screening_id:screeningId,live_stream_id:liveStreamId,content_id:contentId};
    let body:string,contentType="application/json";
    if(adapter==="stripe"){
     const form=new URLSearchParams({mode:"payment",success_url:callback+"&session_id={CHECKOUT_SESSION_ID}",cancel_url:callback,customer_email:user.email,client_reference_id:reference,
      "line_items[0][price_data][currency]":currency.toLowerCase(),"line_items[0][price_data][unit_amount]":String(amountMinor),
      "line_items[0][price_data][product_data][name]":p.contributionType==="tip"?"Creator tip":"Creator gift",
      "line_items[0][quantity]":"1","metadata[reference]":reference,"metadata[contribution_type]":p.contributionType});
     body=form.toString();contentType="application/x-www-form-urlencoded";
    }else if(adapter==="paystack")body=JSON.stringify({email:user.email,amount:amountMinor,currency,reference,callback_url:callback,metadata});
    else if(adapter==="flutterwave")body=JSON.stringify({tx_ref:reference,amount:amountMajor,currency,redirect_url:callback,customer:{email:user.email},customizations:{title:"DeGameTV",description:eventTitle},meta:metadata});
    else body=JSON.stringify({customer:{email:user.email},amount_minor:amountMinor,currency,reference,callback_url:callback,metadata});
    const response=await fetch(target,{method:"POST",headers:{[header]:prefix+provider.credential,"Content-Type":contentType,Accept:"application/json"},body,signal:AbortSignal.timeout(15000)});
    const result=await response.json().catch(()=>null);
    let candidateUrl:string|null=null,candidateId:string|null=null;
    if(adapter==="paystack"&&result?.status===true){candidateUrl=result.data?.authorization_url??null;candidateId=result.data?.reference??reference;}
    else if(adapter==="stripe"&&response.ok){candidateUrl=result?.url??null;candidateId=result?.id??null;}
    else if(adapter==="flutterwave"&&response.ok&&result?.status==="success"){candidateUrl=result.data?.link??null;candidateId=result.data?.id?String(result.data.id):null;}
    else if(adapter==="generic"&&response.ok&&result?.authorized===true){candidateUrl=result.checkout_url??null;candidateId=result.provider_checkout_id??null;}
    if(!response.ok||typeof candidateUrl!=="string"){await markProviderHealth(db,provider.id,"unhealthy","Checkout initialization failed.");continue;}
    const checkout=new URL(candidateUrl),allowed=provider.settings?.allowed_checkout_origins;
    if(checkout.protocol!=="https:"||!Array.isArray(allowed)||!allowed.includes(checkout.origin)){await markProviderHealth(db,provider.id,"unhealthy","Provider returned an untrusted checkout URL.");continue;}
    checkoutUrl=checkout.toString();selected=provider;checkoutId=candidateId;await markProviderHealth(db,provider.id,'healthy',null);break;
   }catch{await markProviderHealth(db,provider.id,'unhealthy','Checkout provider did not respond.');continue;}
  }
  if(!selected||!checkoutUrl){await db.from("event_contributions").update({status:"failed"}).eq("provider_reference",reference);return json(502,{error:"Payment provider did not accept this contribution. No charge was made."});}
  const {error:updateError}=await db.from("event_contributions").update({provider_key:selected.provider_key,provider_checkout_id:checkoutId,checkout_url:checkoutUrl}).eq("provider_reference",reference);
  if(updateError)return json(503,{error:"Checkout started but contribution order reconciliation is pending. Contact support before retrying."});
  return json(200,{success:true,checkoutUrl,reference,amount:amountMajor,currency,contributionType:p.contributionType});
 }catch(error:unknown){console.error("process-event-contribution",error);return json(503,{error:error instanceof Error?error.message:"Contribution checkout unavailable."});}
});