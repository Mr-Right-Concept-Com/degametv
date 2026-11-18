import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@3.25.76";
const schema=z.object({reference:z.string().min(20).max(80).regex(/^DTV_[A-Za-z0-9]+$/),email:z.string().trim().email().max(254).transform(value=>value.toLowerCase())}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{error:"A valid payment reference and email are required."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json(503,{error:"Payment status is temporarily unavailable."});
 try{
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:order,error}=await admin.from("guest_payment_orders").select("id,ticket_id,status,email,provider_reference,provider,amount_minor,currency").eq("provider_reference",parsed.data.reference).eq("email",parsed.data.email).maybeSingle();
  if(error||!order)return json(404,{error:"No payment could be found for those details."});
  if(order.status==="pending"&&order.provider==="paystack"){
   const {data:configs,error:configError}=await admin.rpc("get_payment_provider_runtime_config",{p_provider:"paystack"});
   if(!configError&&Array.isArray(configs)&&configs.length&&configs[0].secret_key){
    const verification=await fetch("https://api.paystack.co/transaction/verify/"+encodeURIComponent(order.provider_reference),{headers:{"Authorization":"Bearer "+configs[0].secret_key}});
    const result=await verification.json().catch(()=>null);
    if(verification.ok&&result?.status===true&&result?.data?.status==="success"&&Number(result.data.amount)===Number(order.amount_minor)&&String(result.data.currency)===order.currency){
     await admin.rpc("complete_guest_payment_order",{p_reference:order.provider_reference,p_transaction_id:String(result.data.id),p_amount_minor:Number(result.data.amount),p_currency:String(result.data.currency)});
    }else if(verification.ok&&result?.status===true&&["failed","abandoned"].includes(String(result?.data?.status))){
     await admin.from("guest_payment_orders").update({status:"failed"}).eq("id",order.id).eq("status","pending");
     await admin.from("screening_tickets").update({payment_status:"failed"}).eq("id",order.ticket_id).eq("payment_status","pending");
    }
   }
  }
  const {data:latest,error:latestError}=await admin.from("guest_payment_orders").select("ticket_id,status").eq("id",order.id).maybeSingle();
  if(latestError||!latest)return json(503,{error:"Payment status could not be refreshed."});
  if(latest.status!=="paid")return json(200,{status:latest.status});
  const {data:ticket,error:ticketError}=await admin.from("screening_tickets").select("ticket_code,watch_code,expires_at,screening_id,location,price").eq("id",latest.ticket_id).maybeSingle();
  if(ticketError||!ticket)return json(503,{error:"Your payment is confirmed, but ticket retrieval is delayed. Contact support with your reference."});
  const {data:emailClaim}=await admin.from("guest_payment_orders").update({email_sent_at:new Date().toISOString()}).eq("id",order.id).is("email_sent_at",null).select("id").maybeSingle();
  let emailSent=false;
  if(emailClaim){
   const {data:screening}=await admin.from("screenings").select("title").eq("id",ticket.screening_id).maybeSingle();
   const mailResponse=await fetch(url+"/functions/v1/send-watch-email",{method:"POST",headers:{"Authorization":"Bearer "+service,"apikey":service,"Content-Type":"application/json"},body:JSON.stringify({email:order.email,movieTitle:screening?.title||"Your DeGameTV screening",watchUrl:(req.headers.get("origin")||"").replace(/\/$/,"")+"/watch/"+ticket.watch_code+"?email="+encodeURIComponent(order.email),ticketCode:ticket.ticket_code,expiresAt:ticket.expires_at,location:ticket.location,price:Number(ticket.price),currency:order.currency})}).catch(()=>null);
   emailSent=Boolean(mailResponse?.ok);
   if(!emailSent)await admin.from("guest_payment_orders").update({email_sent_at:null}).eq("id",order.id);
  }
  return json(200,{status:"paid",ticketCode:ticket.ticket_code,watchCode:ticket.watch_code,expiresAt:ticket.expires_at,screeningId:ticket.screening_id,emailSent});
 }catch{return json(500,{error:"Payment status could not be retrieved. Retry shortly."});}
});