import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"}});
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}});
 if(req.method!=="GET")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json(503,{error:"Payment methods are temporarily unavailable."});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.from("payment_provider_configs").select("provider,is_enabled,is_live,test_public_key,live_public_key,test_secret_ref,live_secret_ref,webhook_secret_ref").eq("is_enabled",true);
 if(error)return json(503,{error:"Payment methods are temporarily unavailable."});
 const methods=(data??[]).filter(row=>row.webhook_secret_ref&&((row.is_live&&row.live_secret_ref&&row.live_public_key)||(!row.is_live&&row.test_secret_ref&&row.test_public_key))).map(row=>({id:row.provider,name:row.provider==="paystack"?"Paystack":row.provider==="flutterwave"?"Flutterwave":"Credit/Debit Card",mode:row.is_live?"live":"test",available:row.provider==="paystack"}));
 return json(200,{methods:methods.filter(method=>method.available)});
});