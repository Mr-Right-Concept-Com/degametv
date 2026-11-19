import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@3.25.76";

const schema=z.object({
 screeningId:z.string().uuid(),
 ticketType:z.enum(["live","replay","combo"]),
 method:z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/).optional(),
 currency:z.string().regex(/^[A-Za-z]{3}$/),
 countryCode:z.string().regex(/^[A-Za-z]{2}$/).optional(),
 email:z.string().trim().email().max(254).optional(),
 cohortId:z.string().min(8).max(128).optional(),
}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type, cf-ipcountry","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
async function featureEnabled(db:ReturnType<typeof createClient>,key:string,subject:string):Promise<boolean>{
 const {data:flag,error}=await db.from("platform_feature_controls").select("enabled,rollout_percentage,release_state").eq("feature_key",key).maybeSingle();
 if(error||!flag)return false;
 if(!flag.enabled||["draft","paused","rolled_back"].includes(flag.release_state))return false;
 if(flag.release_state==="released")return flag.rollout_percentage===100;
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(subject+":"+key));
 return new DataView(digest).getUint32(0,false)%100<flag.rollout_percentage;
}
async function convertAmount(baseUrl:string,service:string,amount:number,from:string,to:string,country:string):Promise<number>{
 if(from===to)return amount;
 const response=await fetch(baseUrl+"/functions/v1/convert-currency",{method:"POST",headers:{Authorization:"Bearer "+service,apikey:service,"Content-Type":"application/json"},body:JSON.stringify({amount,fromCurrency:from,toCurrency:to,country}),signal:AbortSignal.timeout(12000)});
 const result=await response.json().catch(()=>null);
 if(!response.ok||!Number.isFinite(result?.converted))throw new Error("FX conversion is unavailable for the selected currency.");
 return Number(result.converted);
}
serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 const authorization=req.headers.get("Authorization")||"";
 if(!url||!service||!anon)return json(503,{error:"Checkout is unavailable."});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{error:"Invalid event checkout request."});
 let user:any=null;
 if(authorization){
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error:userError}=await userClient.auth.getUser();
  if(userError||!data.user)return json(401,{error:"Your sign-in session is invalid. Sign in again or use guest checkout."});
  user=data.user;
 }else if(!parsed.data.email)return json(400,{error:"Enter an email address for guest ticket delivery."});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const cohortSubject=parsed.data.cohortId??user?.id??parsed.data.email?.toLowerCase()??"guest";
 if(!await featureEnabled(db,"cinema.ticketing",cohortSubject))return json(403,{error:"Ticket checkout is paused for this release cohort."});
 try{
  const {screeningId,ticketType}=parsed.data;
  const {data:profile}=user?await db.from("profiles").select("preferred_country,preferred_currency").eq("user_id",user.id).maybeSingle():{data:null};
  const edgeCountry=req.headers.get("cf-ipcountry")?.toUpperCase();
  const countryCode=parsed.data.countryCode?.toUpperCase()??profile?.preferred_country?.toUpperCase()??(edgeCountry&&/^[A-Z]{2}$/.test(edgeCountry)?edgeCountry:null);
  if(!countryCode)return json(422,{error:"Choose your country before starting checkout."});
  const {data:countryRule,error:countryError}=await db.from("country_currency_rules").select("country_code,currency_code").eq("country_code",countryCode).eq("enabled",true).maybeSingle();
  if(countryError||!countryRule)return json(422,{error:"Ticket checkout is not enabled for this country."});
  const currency=(parsed.data.currency??profile?.preferred_currency??countryRule.currency_code).toUpperCase();
  const {count:currencyCount}=await db.from("country_currency_rules").select("country_code",{count:"exact",head:true}).eq("currency_code",currency).eq("enabled",true);
  if(!currencyCount)return json(422,{error:"The selected transaction currency is not enabled."});

  const {data:screening,error}=await db.from("screenings").select("id,tenant_id,content_id,title,slug,status,live_price_ngn,live_price_usd,replay_price_ngn,replay_price_usd,base_price,base_currency,replay_base_price,replay_access_hours,replay_access_model,access_model,live_recording_status,live_replay_ready_at").eq("id",screeningId).eq("status","published").maybeSingle();
  if(error||!screening)return json(404,{error:"Published event not found."});
  const {data:stream}=await db.from("live_streams").select("id,tenant_id,status,metadata").eq("tenant_id",screening.tenant_id).contains("metadata",{screening_id:screening.id}).maybeSingle();
  if(!stream)return json(409,{error:"Live event has not been provisioned."});
  if(["live","combo"].includes(ticketType)&&!["scheduled","live","starting"].includes(stream.status))return json(409,{error:"Live admission is not currently available."});
  if(ticketType==="live"&&screening.access_model==="FREE")return json(409,{error:"This event is free. Claim a free pass instead of checking out."});
  if(ticketType==="replay"&&screening.replay_access_model!=="SEPARATE_PRICE")return json(409,{error:"Replay access is included with the live ticket or available free; a separate replay purchase is not enabled."});
  if(ticketType==="replay"&&(!screening.live_replay_ready_at||screening.live_recording_status!=="ready"))return json(409,{error:"Replay is not ready yet."});

  const isNigeria=countryCode==="NG";
  const hasBasePrice=screening.base_price!==null&&screening.base_price!==undefined;
  const sourceCurrency=hasBasePrice?String(screening.base_currency||"").toUpperCase():(isNigeria?"NGN":"USD");
  const livePrice=Number(hasBasePrice?screening.base_price:(isNigeria?screening.live_price_ngn:screening.live_price_usd))||0;
  const replayPrice=Number(hasBasePrice?screening.replay_base_price:(isNigeria?screening.replay_price_ngn:screening.replay_price_usd))||0;
  const baseAmount=ticketType==="live"?livePrice:ticketType==="replay"?replayPrice:livePrice+(screening.replay_access_model==="SEPARATE_PRICE"?replayPrice:0);
  if(!/^[A-Z]{3}$/.test(sourceCurrency)||!Number.isFinite(baseAmount)||baseAmount<=0)return json(409,{error:"This ticket price is not configured in a supported currency."});

  const {data:providers,error:providerError}=await db.rpc("get_service_provider_runtime_config",{p_capability:"payments"});
  if(providerError||!Array.isArray(providers)||!providers.length)return json(503,{error:"No payment provider is enabled in Admin Provider Vault."});
  const usable=providers.filter((p:any)=>
   p.is_live===true&&p.credential&&Array.isArray(p.settings?.supported_currencies)&&p.settings.supported_currencies.includes(currency)
   &&typeof p.endpoints?.checkout_initialize==="string"&&p.endpoints.checkout_initialize.startsWith("/")&&!p.endpoints.checkout_initialize.startsWith("//")&&typeof p.endpoints?.payment_verify==="string"&&p.endpoints.payment_verify.startsWith("/")&&!p.endpoints.payment_verify.startsWith("//")&&typeof p.endpoints?.refund==="string"&&p.endpoints.refund.startsWith("/")&&!p.endpoints.refund.startsWith("//")
   &&(!parsed.data.method||p.provider_key===parsed.data.method)
  );
  if(!usable.length)return json(503,{error:"No live payment provider is enabled for this currency and payment method."});
  const {data:authUser}=user?await db.auth.admin.getUserById(user.id):{data:null};
  const email=user?.email||authUser?.user?.email||parsed.data.email;
  if(!email)return json(400,{error:"An email address is required for ticket delivery."});

  const {data:siteSetting,error:siteError}=await db.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
  const siteUrl=typeof siteSetting?.setting_value==="string"?siteSetting.setting_value:"";
  let siteOrigin:string;
  try{const site=new URL(siteUrl);if(siteError||siteSetting?.is_public!==true||site.protocol!=="https:"||site.username||site.password)throw new Error("invalid_site");siteOrigin=site.origin;}
  catch{return json(503,{error:"The canonical public return URL has not been published in God Mode."});}

  const convertedAmount=await convertAmount(url,service,baseAmount,sourceCurrency,currency,countryCode);
  const fractionDigits=new Intl.NumberFormat("en",{style:"currency",currency}).resolvedOptions().maximumFractionDigits;
  const minor=Math.round(convertedAmount*Math.pow(10,fractionDigits));
  const {data:commissionSetting,error:commissionError}=await db.from("platform_settings").select("setting_value").eq("setting_key","commission_rates").maybeSingle();
  const creatorCommissionRate=Number(commissionSetting?.setting_value?.creator);
  if(commissionError||!Number.isFinite(creatorCommissionRate)||creatorCommissionRate<0||creatorCommissionRate>0.5)return json(503,{error:"Creator commission policy is not configured safely."});
  const platformFeeMajor=Math.round(minor*creatorCommissionRate)/Math.pow(10,fractionDigits);
  if(!Number.isSafeInteger(minor)||minor<=0)return json(422,{error:"The converted ticket amount is invalid."});
  const reference="DTVL_"+crypto.randomUUID().replaceAll("-","");
  const candidate=usable[0];
  const {error:insertError}=await db.from("live_payment_orders").insert({
   tenant_id:screening.tenant_id,user_id:user?.id??null,guest_checkout:!user,screening_id:screening.id,stream_id:stream.id,
   ticket_type:ticketType,provider:candidate.provider_key,provider_reference:reference,provider_mode:"live",email,amount_minor:minor,amount_major:convertedAmount,platform_fee_major:platformFeeMajor,currency,
   metadata:{created_from:"viewer_checkout",guest_checkout:!user,provider_mode:"live",country_code:countryCode,source_currency:sourceCurrency,base_amount:baseAmount},
  });
  if(insertError)return json(503,{error:"Could not create a secure ticket order. No charge was made."});
  let checkoutUrl:string|null=null,selected:any=null,selectedCheckoutId:string|null=null;
  for(const provider of usable){
   try{
    const target=new URL(provider.endpoints.checkout_initialize,provider.base_url);
    if(target.origin!==new URL(provider.base_url).origin)continue;
    const header=provider.settings?.credential_header||"Authorization",prefix=provider.settings?.credential_prefix??"Bearer ";
    const callbackUrl=new URL("/payment/return?reference="+reference,siteOrigin).toString();
    const adapter=String(provider.settings?.checkout_adapter??provider.settings?.adapter??provider.provider_key).toLowerCase();
    const metadata={screening_id:screening.id,stream_id:stream.id,ticket_type:ticketType,country_code:countryCode,reference};
    let body:string,contentType="application/json";
    if(adapter==="stripe"){
     const form=new URLSearchParams({mode:"payment",success_url:callbackUrl+"&session_id={CHECKOUT_SESSION_ID}",cancel_url:callbackUrl,customer_email:email,client_reference_id:reference,
      "line_items[0][price_data][currency]":currency.toLowerCase(),"line_items[0][price_data][unit_amount]":String(minor),
      "line_items[0][price_data][product_data][name]":screening.title,"line_items[0][quantity]":"1",
      "metadata[reference]":reference,"metadata[screening_id]":screening.id,"metadata[stream_id]":stream.id,"metadata[ticket_type]":ticketType,"metadata[country_code]":countryCode});
     body=form.toString();contentType="application/x-www-form-urlencoded";
    }else if(adapter==="paystack"){
     body=JSON.stringify({email,amount:minor,currency,reference,callback_url:callbackUrl,metadata});
    }else if(adapter==="flutterwave"){
     body=JSON.stringify({tx_ref:reference,amount:convertedAmount,currency,redirect_url:callbackUrl,customer:{email},customizations:{title:"DeGameTV",description:screening.title},meta:metadata});
    }else{
     body=JSON.stringify({customer:{email},amount_minor:minor,currency,reference,callback_url:callbackUrl,metadata});
    }
    const response=await fetch(target,{method:"POST",headers:{[header]:prefix+provider.credential,"Content-Type":contentType,Accept:"application/json"},body,signal:AbortSignal.timeout(15000)});
    const result=await response.json().catch(()=>null);
    let checkoutValue:string|null=null,checkoutId:string|null=null;
    if(adapter==="paystack"&&result?.status===true){checkoutValue=typeof result.data?.authorization_url==="string"?result.data.authorization_url:null;checkoutId=typeof result.data?.reference==="string"?result.data.reference:reference;}
    else if(adapter==="stripe"&&response.ok){checkoutValue=typeof result?.url==="string"?result.url:null;checkoutId=typeof result?.id==="string"?result.id:null;}
    else if(adapter==="flutterwave"&&response.ok&&result?.status==="success"){checkoutValue=typeof result.data?.link==="string"?result.data.link:null;checkoutId=result.data?.id?String(result.data.id):null;}
    else if(adapter==="generic"&&response.ok&&result?.authorized===true){checkoutValue=typeof result.checkout_url==="string"?result.checkout_url:null;checkoutId=typeof result.provider_checkout_id==="string"?result.provider_checkout_id:null;}
    if(!response.ok||!checkoutValue)continue;
    const checkout=new URL(checkoutValue),allowed=provider.settings?.allowed_checkout_origins;
    if(checkout.protocol!=="https:"||!Array.isArray(allowed)||!allowed.includes(checkout.origin))continue;
    selected=provider;checkoutUrl=checkout.toString();selectedCheckoutId=checkoutId;break;
   }catch{continue;}
  }
  if(!selected||!checkoutUrl){await db.from("live_payment_orders").update({status:"failed"}).eq("provider_reference",reference);return json(502,{error:"No configured payment provider accepted checkout. No charge was made."});}
  const {error:updateError}=await db.from("live_payment_orders").update({provider:selected.provider_key,provider_checkout_id:selectedCheckoutId,provider_mode:"live",metadata:{created_from:"viewer_checkout",guest_checkout:!user,provider_mode:"live",country_code:countryCode,source_currency:sourceCurrency,base_amount:baseAmount,checkout_created_at:new Date().toISOString()}}).eq("provider_reference",reference);
  if(updateError)return json(503,{error:"Checkout was created but its order record could not be finalized. Contact support before retrying."});
  return json(200,{success:true,checkoutUrl,reference,screeningTitle:screening.title,amount:convertedAmount,currency,provider:selected.provider_key});
 }catch(error){
  console.error("process-live-payment",error);
  return json(503,{error:error instanceof Error?error.message:"Checkout is temporarily unavailable."});
 }
});
