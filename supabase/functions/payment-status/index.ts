import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@3.25.76";
const schema=z.object({reference:z.string().min(20).max(80).regex(/^DTV_[A-Za-z0-9]+$/),email:z.string().trim().email().max(254)}).strict();
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"}});
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{error:"A valid payment reference and email are required."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json(503,{error:"Payment status is temporarily unavailable."});
 try{
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:order,error}=await admin.from("guest_payment_orders").select("id,ticket_id,status,email,provider_reference").eq("provider_reference",parsed.data.reference).eq("email",parsed.data.email.toLowerCase()).maybeSingle();
  if(error||!order)return json(404,{error:"No payment could be found for those details."});
  if(order.status!=="paid")return json(200,{status:order.status});
  const {data:ticket,error:ticketError}=await admin.from("screening_tickets").select("ticket_code,watch_code,expires_at,screening_id").eq("id",order.ticket_id).maybeSingle();
  if(ticketError||!ticket)return json(503,{error:"Your payment is confirmed, but ticket retrieval is delayed. Contact support with your reference."});
  return json(200,{status:"paid",ticketCode:ticket.ticket_code,watchCode:ticket.watch_code,expiresAt:ticket.expires_at,screeningId:ticket.screening_id});
 }catch{return json(500,{error:"Payment status could not be retrieved. Retry shortly."});}
});