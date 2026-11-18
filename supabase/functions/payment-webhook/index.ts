import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function hmac(secret:string,body:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-512"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(body)));}
function constantTimeEqual(a:string,b:string){if(a.length!==b.length)return false;let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;}
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json(503,{error:"Webhook processor unavailable."});
 const raw=await req.text();
 try{
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:configs,error}=await admin.rpc("get_payment_provider_runtime_config",{p_provider:"paystack"});
  if(error||!Array.isArray(configs)||!configs.length||!configs[0].webhook_secret)return json(503,{error:"Webhook verification is not configured."});
  const signature=req.headers.get("x-paystack-signature")||"";
  const expected=await hmac(configs[0].webhook_secret,raw);
  if(!constantTimeEqual(signature.toLowerCase(),expected.toLowerCase()))return json(401,{error:"Invalid webhook signature."});
  const event=JSON.parse(raw);
  if(event?.event!=="charge.success")return json(200,{received:true,ignored:true});
  const reference=event?.data?.reference;
  if(typeof reference!=="string"||!reference.startsWith("DTV_"))return json(400,{error:"Invalid payment reference."});
  const verification=await fetch("https://api.paystack.co/transaction/verify/"+encodeURIComponent(reference),{headers:{"Authorization":"Bearer "+configs[0].secret_key}});
  const result=await verification.json().catch(()=>null);
  if(!verification.ok||result?.status!==true||result?.data?.status!=="success")return json(202,{received:true,verified:false});
  const data=result.data;
  const {data:completed,error:completeError}=await admin.rpc("complete_guest_payment_order",{p_reference:reference,p_transaction_id:String(data.id),p_amount_minor:Number(data.amount),p_currency:String(data.currency)});
  if(completeError)return json(409,{error:"Payment verification did not match the pending order."});
  return json(200,{received:true,verified:true,fulfillment:completed});
 }catch{return json(400,{error:"Invalid webhook payload."});}
});