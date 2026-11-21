import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
const Body=z.object({amount:z.number().finite().positive().max(10000000),currency:z.string().regex(/^[A-Za-z]{3}$/),idempotencyKey:z.string().uuid()}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type, cf-ipcountry","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
type PaymentProvider={id:string;provider_key:string;is_live:boolean;credential:string;settings:Record<string,unknown>;endpoints:Record<string,unknown>;base_url:string};
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null&&!Array.isArray(value);
const isProvider=(value:unknown):value is PaymentProvider=>isRecord(value)&&typeof value.id==="string"&&typeof value.provider_key==="string"&&value.is_live===true&&typeof value.credential==="string"&&isRecord(value.settings)&&isRecord(value.endpoints)&&typeof value.base_url==="string";
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{success:false,error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY"),auth=req.headers.get("Authorization")||"";
 if(!url||!service||!anon||!auth.startsWith("Bearer "))return json(401,{success:false,error:"Sign in to top up your Personal Wallet."});
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await userClient.auth.getUser();
 if(userError||!user)return json(401,{success:false,error:"Your sign-in session is invalid."});
 const parsed=Body.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{success:false,error:"Enter a valid top-up amount and currency."});
 const p=parsed.data,currency=p.currency.toUpperCase();
 let scale:number;
 try{scale=new Intl.NumberFormat("en",{style:"currency",currency}).resolvedOptions().maximumFractionDigits ?? 2;}catch{return json(422,{success:false,error:"Choose a supported ISO currency."});}
 const amountMinor=Math.round(p.amount*Math.pow(10,scale)),amountMajor=amountMinor/Math.pow(10,scale);
 if(!Number.isSafeInteger(amountMinor)||amountMinor<=0||Math.abs(amountMajor-p.amount)>0.0000001)return json(422,{success:false,error:"The top-up amount has too many decimal places for this currency."});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {count:currencyCount,error:currencyError}=await db.from("country_currency_rules").select("country_code",{count:"exact",head:true}).eq("currency_code",currency).eq("enabled",true);
  if(currencyError||!currencyCount)return json(422,{success:false,error:"This currency is not enabled for wallet top-ups."});
  const {data:existing,error:existingError}=await db.from("wallet_topup_orders").select("provider_reference,status,checkout_url,amount_major,currency").eq("user_id",user.id).eq("idempotency_key",p.idempotencyKey).maybeSingle();
  if(existingError)return json(503,{success:false,error:"Could not confirm the previous wallet top-up."});
  if(existing){
   if(existing.status==="pending"&&existing.checkout_url)return json(200,{success:true,checkoutUrl:existing.checkout_url,reference:existing.provider_reference,amount:existing.amount_major,currency:existing.currency,reused:true});
   if(existing.status==="pending")return json(409,{success:false,error:"Wallet top-up checkout is still being initialized. Retry shortly."});
   if(existing.status==="paid")return json(200,{success:true,paid:true,reference:existing.provider_reference,amount:existing.amount_major,currency:existing.currency,reused:true});
   return json(409,{success:false,error:"The previous top-up attempt failed. Start a new top-up.",retryable:true});
  }
  const {data:providers,error:providerError}=await db.rpc("get_service_provider_runtime_config",{p_capability:"payments"});
  if(providerError||!Array.isArray(providers))return json(503,{success:false,error:"No live payment provider is configured."});
  const provider=providers.find((item:unknown):item is PaymentProvider=>isProvider(item)&&Array.isArray(item.settings.supported_currencies)&&item.settings.supported_currencies.includes(currency)&&typeof item.endpoints.checkout_initialize==="string"&&item.endpoints.checkout_initialize.startsWith("/")&&!item.endpoints.checkout_initialize.startsWith("//")&&typeof item.endpoints.payment_verify==="string"&&item.endpoints.payment_verify.startsWith("/")&&!item.endpoints.payment_verify.startsWith("//"));
  if(!provider)return json(503,{success:false,error:"No active payment provider supports this wallet currency."});
  const {data:siteSetting,error:siteError}=await db.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
  let siteOrigin:string;
  try{const site=new URL(String(siteSetting?.setting_value||""));if(siteError||siteSetting?.is_public!==true||site.protocol!=="https:"||site.username||site.password)throw new Error("invalid_origin");siteOrigin=site.origin;}
  catch{return json(503,{success:false,error:"The secure wallet return URL is not configured."});}
  const reference="DTVW_"+crypto.randomUUID().replaceAll("-","");
  const {error:insertError}=await db.from("wallet_topup_orders").insert({user_id:user.id,provider_key:provider.provider_key,provider_reference:reference,amount_minor:amountMinor,amount_major:amountMajor,currency,provider_mode:"live",status:"pending",idempotency_key:p.idempotencyKey});
  if(insertError){
   const {data:duplicate}=await db.from("wallet_topup_orders").select("provider_reference,status,checkout_url,amount_major,currency").eq("user_id",user.id).eq("idempotency_key",p.idempotencyKey).maybeSingle();
   if(duplicate?.status==="pending"&&duplicate.checkout_url)return json(200,{success:true,checkoutUrl:duplicate.checkout_url,reference:duplicate.provider_reference,amount:duplicate.amount_major,currency:duplicate.currency,reused:true});
   return json(503,{success:false,error:"A secure wallet top-up order could not be created."});
  }
  try{
   const target=new URL(String(provider.endpoints.checkout_initialize),provider.base_url);
   if(target.origin!==new URL(provider.base_url).origin)throw new Error("invalid_checkout_endpoint");
   const adapter=String(provider.settings.checkout_adapter??provider.settings.adapter??provider.provider_key).toLowerCase();
   const authHeader=typeof provider.settings.credential_header==="string"?provider.settings.credential_header:"Authorization";
   const authPrefix=typeof provider.settings.credential_prefix==="string"?provider.settings.credential_prefix:"Bearer ";
   const callback=new URL("/payment/return?reference="+encodeURIComponent(reference),siteOrigin).toString();
   const metadata={reference,order_type:"personal_wallet_topup",user_id:user.id};
   let requestBody:string,contentType="application/json";
   if(adapter==="stripe"){
    const form=new URLSearchParams({mode:"payment",success_url:callback+"&session_id={CHECKOUT_SESSION_ID}",cancel_url:callback,customer_email:user.email||"",client_reference_id:reference,
     "line_items[0][price_data][currency]":currency.toLowerCase(),"line_items[0][price_data][unit_amount]":String(amountMinor),
     "line_items[0][price_data][product_data][name]":"DeGameTV Personal Wallet top-up","line_items[0][quantity]":"1","metadata[reference]":reference,"metadata[order_type]":"personal_wallet_topup"});
    requestBody=form.toString();contentType="application/x-www-form-urlencoded";
   }else if(adapter==="paystack")requestBody=JSON.stringify({email:user.email,amount:amountMinor,currency,reference,callback_url:callback,metadata});
   else if(adapter==="flutterwave")requestBody=JSON.stringify({tx_ref:reference,amount:amountMajor,currency,redirect_url:callback,customer:{email:user.email},customizations:{title:"DeGameTV",description:"Personal Wallet top-up"},meta:metadata});
   else if(adapter==="generic")requestBody=JSON.stringify({customer:{email:user.email},amount_minor:amountMinor,currency,reference,callback_url:callback,metadata});
   else throw new Error("unsupported_checkout_adapter");
   const response=await fetch(target,{method:"POST",headers:{[authHeader]:authPrefix+provider.credential,"Content-Type":contentType,Accept:"application/json"},body:requestBody,signal:AbortSignal.timeout(15000)});
   const result:unknown=await response.json().catch(()=>null),data=isRecord(result)&&isRecord(result.data)?result.data:{};
   let checkoutUrl:string|null=null,checkoutId:string|null=null;
   if(adapter==="paystack"&&isRecord(result)&&result.status===true){checkoutUrl=typeof data.authorization_url==="string"?data.authorization_url:null;checkoutId=typeof data.reference==="string"?data.reference:reference;}
   else if(adapter==="stripe"&&response.ok&&isRecord(result)){checkoutUrl=typeof result.url==="string"?result.url:null;checkoutId=typeof result.id==="string"?result.id:null;}
   else if(adapter==="flutterwave"&&response.ok&&isRecord(result)&&result.status==="success"){checkoutUrl=typeof data.link==="string"?data.link:null;checkoutId=data.id===undefined?null:String(data.id);}
   else if(adapter==="generic"&&response.ok&&isRecord(result)&&result.authorized===true){checkoutUrl=typeof result.checkout_url==="string"?result.checkout_url:null;checkoutId=typeof result.provider_checkout_id==="string"?result.provider_checkout_id:null;}
   if(!response.ok||!checkoutUrl)throw new Error("checkout_initialization_failed");
   const returned=new URL(checkoutUrl),allowed=provider.settings.allowed_checkout_origins;
   if(returned.protocol!=="https:"||!Array.isArray(allowed)||!allowed.includes(returned.origin))throw new Error("untrusted_checkout_origin");
   const {error:updateError}=await db.from("wallet_topup_orders").update({checkout_url:returned.toString(),provider_checkout_id:checkoutId}).eq("provider_reference",reference).eq("status","pending");
   if(updateError)throw new Error("checkout_order_update_failed");
   await db.from("service_provider_bindings").update({health_status:"healthy",health_checked_at:new Date().toISOString(),health_error:null}).eq("capability","payments").eq("provider_key",provider.provider_key);
   return json(200,{success:true,checkoutUrl:returned.toString(),reference,amount:amountMajor,currency});
  }catch{
   await db.from("wallet_topup_orders").update({status:"failed",updated_at:new Date().toISOString()}).eq("provider_reference",reference).eq("status","pending");
   await db.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:"Personal wallet top-up checkout initialization failed."}).eq("capability","payments").eq("provider_key",provider.provider_key);
   return json(502,{success:false,error:"The payment provider could not start wallet top-up checkout. No wallet credit was made.",retryable:true});
  }
 }catch(error:unknown){
  console.error("personal-wallet-topup",error);
  return json(503,{success:false,error:"Wallet top-up is temporarily unavailable."});
 }
});
