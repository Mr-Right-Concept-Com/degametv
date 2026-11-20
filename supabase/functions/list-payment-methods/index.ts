import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
type PaymentProvider = {
 provider_key:string; is_live:boolean; credential:string;
 endpoints:Record<string,unknown>; settings:Record<string,unknown>;
};
const isRecord=(value:unknown):value is Record<string,unknown> =>
 value!==null&&typeof value==="object"&&!Array.isArray(value);
const isPaymentProvider=(value:unknown):value is PaymentProvider =>
 isRecord(value)&&typeof value.provider_key==="string"&&value.is_live===true&&
 typeof value.credential==="string"&&isRecord(value.endpoints)&&isRecord(value.settings);

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 if(req.method!=="GET")return json({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json({error:"Payment methods are temporarily unavailable."},503);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:providers,error}=await admin.rpc("get_service_provider_runtime_config",{p_capability:"payments"});
 if(error||!Array.isArray(providers))return json({error:"Payment methods are temporarily unavailable."},503);
 const candidates:unknown[]=providers;
 const methods=candidates.filter(isPaymentProvider).filter((provider)=>{
  const supported=provider.settings.supported_currencies;
  const checkout=provider.endpoints.checkout_initialize;
  const verify=provider.endpoints.payment_verify;
  const refund=provider.endpoints.refund;
  return Boolean(provider.credential)
   &&typeof checkout==="string"&&checkout.startsWith("/")&&!checkout.startsWith("//")
   &&typeof verify==="string"&&verify.startsWith("/")&&!verify.startsWith("//")
   &&typeof refund==="string"&&refund.startsWith("/")&&!refund.startsWith("//")
   &&Array.isArray(supported)&&supported.length>0;
 }).map((provider)=>({
  id:provider.provider_key,
  name:typeof provider.settings.display_name==="string"?provider.settings.display_name:provider.provider_key,
  mode:"live",
  available:true,
  supportedCurrencies:provider.settings.supported_currencies,
  priority:provider.settings.priority??100,
 }));
 return json({methods});
});
