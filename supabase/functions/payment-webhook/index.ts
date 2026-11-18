import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function hmac(secret:string,body:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-512"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(body)));}
function equal(a:string,b:string){if(a.length!==b.length)return false;let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;}
async function sendTicketEmail(admin:ReturnType<typeof createClient>,url:string,service:string,reference:string){
 const {data:order}=await admin.from("guest_payment_orders").select("id,ticket_id,email,currency,app_origin,email_sent_at").eq("provider_reference",reference).maybeSingle();
 if(!order||order.email_sent_at||!order.app_origin)return false;
 const {data:claim}=await admin.from("guest_payment_orders").update({email_sent_at:new Date().toISOString()}).eq("id",order.id).is("email_sent_at",null).select("id").maybeSingle();
 if(!claim)return false;
 const {data:ticket}=await admin.from("screening_tickets").select("ticket_code,watch_code,expires_at,screening_id,location,price").eq("id",order.ticket_id).maybeSingle();
 const {data:screening}=ticket?await admin.from("screenings").select("title").eq("id",ticket.screening_id).maybeSingle():{data:null};
 if(!ticket){await admin.from("guest_payment_orders").update({email_sent_at:null}).eq("id",order.id);return false;}
 const response=await fetch(url+"/functions/v1/send-watch-email",{method:"POST",headers:{"Authorization":"Bearer "+service,"apikey":service,"Content-Type":"application/json"},body:JSON.stringify({email:order.email,movieTitle:screening?.title||"Your DeGameTV screening",watchUrl:order.app_origin.replace(/\/$/,"")+"/watch/"+ticket.watch_code+"?email="+encodeURIComponent(order.email),ticketCode:ticket.ticket_code,expiresAt:ticket.expires_at,location:ticket.location,price:Number(ticket.price),currency:order.currency})}).catch(()=>null);
 if(!response?.ok)await admin.from("guest_payment_orders").update({email_sent_at:null}).eq("id",order.id);
 return Boolean(response?.ok);
}
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json(503,{error:"Webhook processor unavailable."});
 const raw=await req.text();
 try{
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:configs,error}=await admin.rpc("get_payment_provider_runtime_config",{p_provider:"paystack"});
  if(error||!Array.isArray(configs)||!configs.length||!configs[0].secret_key)return json(503,{error:"Webhook verification is not configured."});
  const signature=req.headers.get("x-paystack-signature")||"",expected=await hmac(configs[0].secret_key,raw);
  if(!equal(signature.toLowerCase(),expected.toLowerCase()))return json(401,{error:"Invalid webhook signature."});
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
  const emailSent=await sendTicketEmail(admin,url,service,reference);
  return json(200,{received:true,verified:true,fulfillment:completed,emailSent});
 }catch{return json(400,{error:"Invalid webhook payload."});}
});