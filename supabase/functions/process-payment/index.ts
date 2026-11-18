import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@3.25.76";
const schema=z.object({method:z.literal("paystack"),email:z.string().trim().email().max(254).transform(value=>value.toLowerCase()),screeningId:z.string().uuid(),location:z.enum(["nigeria","international"])}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const randomCode=(bytes:number)=>{const data=crypto.getRandomValues(new Uint8Array(bytes));return Array.from(data,b=>b.toString(16).padStart(2,"0")).join("");};
if(import.meta.main) serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{success:false,error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json(503,{success:false,error:"Checkout is temporarily unavailable."});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{success:false,error:"Check your email, screening and payment method."});
 const {method,email,screeningId,location}=parsed.data;
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:configs,error:configError}=await admin.rpc("get_payment_provider_runtime_config",{p_provider:method});
  if(configError||!Array.isArray(configs)||!configs.length)return json(503,{success:false,error:"This payment method is not enabled or its secure credentials are incomplete."});
  const config=configs[0];
  if(!config.secret_key||!config.public_key)return json(503,{success:false,error:"Payment provider credentials or webhook verification are incomplete."});
  const {data:screening,error:screeningError}=await admin.from("screenings").select("id,tenant_id,title,slug,status,location_pricing,screening_date,lifecycle").eq("id",screeningId).eq("status","published").maybeSingle();
  if(screeningError||!screening)return json(404,{success:false,error:"This screening is no longer available."});
  if(screening.screening_date&&new Date(screening.screening_date).getTime()<Date.now()&&screening.lifecycle!=="replay")return json(409,{success:false,error:"Ticket sales for this screening have closed."});
  const pricing=typeof screening.location_pricing==="string"?JSON.parse(screening.location_pricing):screening.location_pricing;
  const major=Number(location==="nigeria"?pricing?.nigeria:pricing?.international);
  if(!Number.isFinite(major)||major<=0)return json(409,{success:false,error:"Ticket pricing is not configured for this location."});
  const currency=location==="nigeria"?"NGN":"USD";
  const amountMinor=Math.round(major*100);
  const reference="DTV_"+crypto.randomUUID().replaceAll("-","");
  const ticketCode=randomCode(8).toUpperCase(),watchCode=randomCode(20);
  const {data:ticketId,error:orderError}=await admin.rpc("create_guest_payment_order",{
   p_provider:method,p_reference:reference,p_screening_id:screening.id,p_tenant_id:screening.tenant_id,
   p_email:email,p_amount_minor:amountMinor,p_currency:currency,p_location:location,p_ticket_code:ticketCode,p_watch_code:watchCode
  });
  if(orderError||!ticketId)return json(503,{success:false,error:"A secure ticket order could not be created. No charge was made."});
  const origin=req.headers.get("origin");
  const callback=origin&&new URL(origin).protocol==="https:"?new URL("/buy/"+encodeURIComponent(screening.slug),origin).toString():null;
  if(!callback){await admin.from("guest_payment_orders").update({status:"failed"}).eq("provider_reference",reference);await admin.from("screening_tickets").update({payment_status:"failed"}).eq("id",ticketId);return json(503,{success:false,error:"Secure checkout return URL is unavailable."});}
  const response=await fetch("https://api.paystack.co/transaction/initialize",{
   method:"POST",headers:{"Authorization":"Bearer "+config.secret_key,"Content-Type":"application/json"},
   body:JSON.stringify({email,amount:amountMinor,currency,reference,callback_url:callback,metadata:{screening_id:screening.id,ticket_id:ticketId,platform:"degame_tv"}}),
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.status!==true||typeof result?.data?.authorization_url!=="string"){
   await admin.from("guest_payment_orders").update({status:"failed"}).eq("provider_reference",reference);
   await admin.from("screening_tickets").update({payment_status:"failed"}).eq("id",ticketId);
   return json(502,{success:false,error:"The payment provider could not start checkout. You have not been charged."});
  }
  await admin.from("guest_payment_orders").update({checkout_url:result.data.authorization_url}).eq("provider_reference",reference);
  return json(200,{success:true,authorizationUrl:result.data.authorization_url,reference,screeningTitle:screening.title});
 }catch{return json(500,{success:false,error:"Checkout could not be started. Please retry or contact support."});}
});