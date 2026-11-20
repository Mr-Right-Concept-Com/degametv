import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
const Body=z.object({
 screeningId:z.string().uuid().optional(),
 liveStreamId:z.string().uuid().optional(),
 contributionType:z.enum(["tip","gift"]),
 giftCatalogKey:z.string().trim().min(1).max(80).optional(),
 amount:z.number().finite().positive().max(10000000),
 currency:z.string().regex(/^[A-Za-z]{3}$/),
 countryCode:z.string().regex(/^[A-Za-z]{2}$/).optional(),
 message:z.string().trim().max(500).optional(),
 contributorName:z.string().trim().max(100).optional(),
 isAnonymous:z.boolean().default(false),
 method:z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/).optional()
}).strict().refine(v=>Boolean(v.screeningId)!==Boolean(v.liveStreamId),"Choose exactly one event.");
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type, cf-ipcountry","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
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
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await userClient.auth.getUser();
 if(userError||!user||!user.email)return json(401,{error:"Your sign-in session is invalid."});
 const parsed=Body.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{error:"Invalid contribution details."});
 const p=parsed.data,db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:profile}=await db.from("profiles").select("preferred_country,preferred_currency").eq("user_id",user.id).maybeSingle();
  const edgeCountry=req.headers.get("cf-ipcountry")?.toUpperCase();
  const country=p.countryCode?.toUpperCase()??profile?.preferred_country?.toUpperCase()??(edgeCountry&&/^[A-Z]{2}$/.test(edgeCountry)?edgeCountry:null);
  if(!country)return json(422,{error:"Choose your country before sending a contribution."});
  const {data:countryRule}=await db.from("country_currency_rules").select("currency_code").eq("country_code",country).eq("enabled",true).maybeSingle();
  if(!countryRule)return json(422,{error:"Contributions are not enabled for this country."});
  const currency=p.currency.toUpperCase();
  const {count:currencyCount}=await db.from("country_currency_rules").select("country_code",{count:"exact",head:true}).eq("currency_code",currency).eq("enabled",true);
  if(!currencyCount)return json(422,{error:"This contribution currency is not enabled."});
  let tenantId:string,creatorId:string,screeningId:string|null=p.screeningId??null,liveStreamId:string|null=p.liveStreamId??null,eventTitle:string;
  if(p.screeningId){
   const {data:event,error}=await db.from("screenings").select("id,tenant_id,content_id,title,status,event_visibility,invite_only").eq("id",p.screeningId).eq("status","published").maybeSingle();
   if(error||!event)return json(404,{error:"Event not found."});
   const {data:content}=await db.from("content").select("creator_id").eq("id",event.content_id).maybeSingle();
   if(!content?.creator_id)return json(409,{error:"The event creator is not configured."});
   if(event.event_visibility==="private"||event.invite_only){
    const {data:invite}=await db.from("event_access_invites").select("id").eq("screening_id",event.id).eq("invited_user_id",user.id).eq("status","accepted").or("expires_at.is.null,expires_at.gt."+new Date().toISOString()).maybeSingle();
    if(!invite)return json(403,{error:"An accepted event invitation is required."});
   }
   tenantId=event.tenant_id;creatorId=content.creator_id;eventTitle=event.title;
  }else{
   const {data:stream,error}=await db.from("live_streams").select("id,tenant_id,creator_id,status,title").eq("id",p.liveStreamId).maybeSingle();
   if(error||!stream||!["scheduled","starting","live"].includes(stream.status))return json(404,{error:"Live event is not accepting contributions."});
   tenantId=stream.tenant_id;creatorId=stream.creator_id;eventTitle=stream.title||"Live event";
  }
  const amount=await convert(url,service,p.amount,currency,currency,country);
  const scale=minorScale(currency),amountMinor=Math.round(amount*scale);
  if(!Number.isSafeInteger(amountMinor)||amountMinor<=0)return json(422,{error:"Contribution amount is invalid."});
  const {data:providers,error:providerError}=await db.rpc("get_service_provider_runtime_config",{p_capability:"payments"});
  if(providerError||!Array.isArray(providers))return json(503,{error:"No payment provider is configured."});
  const usable=providers.filter((v:any)=>v.is_live===true&&v.credential&&Array.isArray(v.settings?.supported_currencies)&&v.settings.supported_currencies.includes(currency)&&typeof v.endpoints?.checkout_initialize==="string"&&v.endpoints.checkout_initialize.startsWith("/")&&!v.endpoints.checkout_initialize.startsWith("//")&&typeof v.endpoints?.payment_verify==="string"&&v.endpoints.payment_verify.startsWith("/")&&!v.endpoints.payment_verify.startsWith("//")&&(!p.method||v.provider_key===p.method));
  if(!usable.length)return json(503,{error:"No live payment provider is available for this currency."});
  const {data:commissionSetting,error:commissionError}=await db.from("platform_settings").select("setting_value").eq("setting_key","commission_rates").maybeSingle();
  const rate=Number(commissionSetting?.setting_value?.creator);
  if(commissionError||!Number.isFinite(rate)||rate<0||rate>0.5)return json(503,{error:"Creator commission policy is not configured safely."});
  const amountMajor=amountMinor/scale,feeMajor=Math.round(amountMajor*rate*scale)/scale;
  const reference="DTVG_"+crypto.randomUUID().replaceAll("-","");
  const {data:siteSetting}=await db.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
  let origin:string;try{const site=new URL(String(siteSetting?.setting_value||""));if(siteSetting?.is_public!==true||site.protocol!=="https:")throw new Error();origin=site.origin;}catch{return json(503,{error:"The canonical return URL is not configured."});}
  const {error:insertError}=await db.from("event_contributions").insert({
   tenant_id:tenantId,creator_id:creatorId,screening_id:screeningId,live_stream_id:liveStreamId,
   contributor_user_id:user.id,contributor_name:p.isAnonymous?null:(p.contributorName||user.user_metadata?.full_name||user.email),
   contributor_email:user.email,contribution_type:p.contributionType,gift_catalog_key:p.contributionType==="gift"?p.giftCatalogKey??"standard":null,
   message:p.message??null,amount_minor:amountMinor,amount_major:amountMajor,platform_fee_major:feeMajor,currency,
   provider_key:usable[0].provider_key,provider_reference:reference,provider_mode:"live",status:"pending",is_anonymous:p.isAnonymous
  });
  if(insertError)return json(503,{error:"Could not create contribution order. No charge was made."});
  let checkoutUrl:string|null=null,selected:any=null,checkoutId:string|null=null;
  for(const provider of usable){
   try{
    const target=new URL(provider.endpoints.checkout_initialize,provider.base_url);if(target.origin!==new URL(provider.base_url).origin)continue;
    const header=provider.settings?.credential_header||"Authorization",prefix=provider.settings?.credential_prefix??"Bearer ";
    const callback=new URL("/payment/return?reference="+reference,origin).toString();
    const adapter=String(provider.settings?.checkout_adapter??provider.settings?.adapter??provider.provider_key).toLowerCase();
    const metadata={reference,contribution_id:reference,contribution_type:p.contributionType,screening_id:screeningId,live_stream_id:liveStreamId};
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
    if(!response.ok||typeof candidateUrl!=="string")continue;
    const checkout=new URL(candidateUrl),allowed=provider.settings?.allowed_checkout_origins;
    if(checkout.protocol!=="https:"||!Array.isArray(allowed)||!allowed.includes(checkout.origin))continue;
    checkoutUrl=checkout.toString();selected=provider;checkoutId=candidateId;break;
   }catch{continue;}
  }
  if(!selected||!checkoutUrl){await db.from("event_contributions").update({status:"failed"}).eq("provider_reference",reference);return json(502,{error:"Payment provider did not accept this contribution. No charge was made."});}
  const {error:updateError}=await db.from("event_contributions").update({provider_key:selected.provider_key,provider_checkout_id:checkoutId}).eq("provider_reference",reference);
  if(updateError)return json(503,{error:"Checkout started but contribution order reconciliation is pending. Contact support before retrying."});
  return json(200,{success:true,checkoutUrl,reference,amount:amountMajor,currency,contributionType:p.contributionType});
 }catch(error){console.error("process-event-contribution",error);return json(503,{error:error instanceof Error?error.message:"Contribution checkout unavailable."});}
});