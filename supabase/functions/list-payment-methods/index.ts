import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 if(req.method!=="GET")return json({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json({error:"Payment methods are temporarily unavailable."},503);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:providers,error}=await admin.rpc("get_service_provider_runtime_config",{p_capability:"payments"});
 if(error||!Array.isArray(providers))return json({error:"Payment methods are temporarily unavailable."},503);
 const methods=providers.filter((provider:any)=>{
  const supported=provider.settings?.supported_currencies;
  return provider.is_live===true&&Boolean(provider.credential)
   &&typeof provider.endpoints?.checkout_initialize==="string"
   &&provider.endpoints.checkout_initialize.startsWith("/")
   &&!provider.endpoints.checkout_initialize.startsWith("//")
   &&typeof provider.endpoints?.payment_verify==="string"&&provider.endpoints.payment_verify.startsWith("/")&&!provider.endpoints.payment_verify.startsWith("//")
   &&typeof provider.endpoints?.refund==="string"&&provider.endpoints.refund.startsWith("/")&&!provider.endpoints.refund.startsWith("//")
   &&Array.isArray(supported)&&supported.length>0;
 }).map((provider:any)=>({
  id:provider.provider_key,
  name:typeof provider.settings?.display_name==="string"?provider.settings.display_name:provider.provider_key,
  mode:"live",
  available:true,
  supportedCurrencies:provider.settings.supported_currencies,
  priority:provider.settings?.priority??100,
 }));
 return json({methods});
});
