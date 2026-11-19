import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
const Body=z.object({ticketId:z.string().uuid(),reason:z.string().trim().min(3).max(500)}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization");
 if(!url||!anon||!service||!authorization?.startsWith("Bearer "))return json({error:"Authentication required."},401);
 const parsed=Body.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json({error:"A ticket id and refund reason are required."},400);
 const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await caller.auth.getUser();
 if(authError||!user)return json({error:"Your session has expired."},401);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:isAdmin,error:roleError}=await admin.rpc("is_super_admin",{_user_id:user.id});
 if(roleError)return json({error:"Refund authorization could not be verified."},503);
 try{
  let ticket:any=null,liveTicket:any=null,order:any=null,liveOrder=false,screening:any=null,creatorId:string|null=null;
  const screeningTicket=await admin.from("screening_tickets").select("id,screening_id,payment_status,refunded_at,price,currency").eq("id",parsed.data.ticketId).maybeSingle();
  if(screeningTicket.data){
   ticket=screeningTicket.data;
   const screeningResult=await admin.from("screenings").select("id,content_id,status,lifecycle,refund_policy,cancelled_at").eq("id",ticket.screening_id).maybeSingle();
   screening=screeningResult.data;
   if(screening?.content_id){
    const owner=await admin.from("content").select("creator_id").eq("id",screening.content_id).maybeSingle();
    creatorId=owner.data?.creator_id??null;
   }
   if(!screening)return json({error:"The screening associated with this ticket could not be found."},404);
   if(ticket.refunded_at||ticket.payment_status==="refunded")return json({error:"This ticket has already been refunded."},409);
   if(ticket.payment_status!=="completed")return json({error:"Only completed ticket payments can be refunded."},409);
   const found=await admin.from("guest_payment_orders").select("id,provider,provider_mode,provider_reference,provider_transaction_id,amount_minor,currency,status").eq("ticket_id",ticket.id).maybeSingle();
   order=found.data;
   if(found.error||!order)return json({error:"The original payment order could not be found."},404);
  }else{
   const foundTicket=await admin.from("tickets").select("id,revoked_at,price,currency,metadata").eq("id",parsed.data.ticketId).maybeSingle();
   liveTicket=foundTicket.data;
   if(!liveTicket)return json({error:"Ticket not found."},404);
   if(liveTicket.revoked_at)return json({error:"This live ticket has already been refunded or revoked."},409);
   const screeningId=typeof liveTicket.metadata?.screening_id==="string"?liveTicket.metadata.screening_id:null;
   const screeningResult=screeningId?await admin.from("screenings").select("id,content_id,status,lifecycle,refund_policy,cancelled_at").eq("id",screeningId).maybeSingle():{data:null,error:null};
   screening=screeningResult.data;
   if(!screening)return json({error:"The screening associated with this live ticket could not be found."},404);
   const owner=await admin.from("content").select("creator_id").eq("id",screening.content_id).maybeSingle();
   creatorId=owner.data?.creator_id??null;
   const reference=liveTicket.metadata?.payment_reference;
   if(typeof reference!=="string")return json({error:"The original live payment reference is missing."},404);
   const foundOrder=await admin.from("live_payment_orders").select("id,provider,provider_mode,provider_reference,provider_transaction_id,amount_minor,amount_major,currency,status").eq("provider_reference",reference).maybeSingle();
   order=foundOrder.data;liveOrder=true;
   if(foundOrder.error||!order)return json({error:"The original live payment order could not be found."},404);
  }
  if(!isAdmin && creatorId!==user.id)return json({error:"You can only refund tickets for your own creator events."},403);
  const refundPolicy=String(screening?.refund_policy??"standard").trim().toLowerCase();
  const eventCancelled=screening?.lifecycle==="cancelled"||Boolean(screening?.cancelled_at);
  if(!isAdmin && !eventCancelled && ["no_refunds","non_refundable","non-refundable","final_sale"].includes(refundPolicy)){
   return json({error:"This event's published refund policy does not permit creator-initiated refunds."},403);
  }
  if(order.status!=="paid")return json({error:"Only verified paid transactions can be refunded."},409);
  const bindingResult=await admin.from("service_provider_bindings").select("base_url,endpoints,settings,is_live").eq("capability","payments").eq("provider_key",order.provider).maybeSingle();
  const {data:secretRows,error:secretError}=await admin.rpc("get_service_provider_admin_secret",{p_capability:"payments",p_provider_key:order.provider});
  const secret=Array.isArray(secretRows)?secretRows[0]:null;
  const credential=order.provider_mode==="live"?secret?.live_credential:secret?.test_credential;
  const binding=bindingResult.data;
  const refundPath=binding?.endpoints?.refund;
  if(bindingResult.error||secretError||!binding?.base_url||!credential||typeof refundPath!=="string"||!refundPath.startsWith("/")||refundPath.startsWith("//"))return json({error:"The original provider has no retained refund adapter or Vault credential. No ticket access was changed."},503);

  const {data:existing}=await admin.from("payment_refunds").select("id,status,provider_refund_id").eq("payment_reference",order.provider_reference).in("status",["pending","provider_confirmed","succeeded"]).maybeSingle();
  if(existing?.status==="succeeded")return json({success:true,alreadyRefunded:true,refundId:existing.id});
  if(existing?.status==="provider_confirmed"){
   const {data:finalized,error:finalizeError}=await admin.rpc("complete_payment_refund",{p_refund_id:existing.id,p_provider_refund_id:existing.provider_refund_id});
   if(finalizeError)return json({error:"Provider confirmed the refund; local reconciliation will retry.",refundId:existing.id},503);
   return json({success:true,refund:finalized});
  }
  let refundId:string;
  if(existing?.status==="pending")refundId=existing.id;
  else{
   const {data:refund,error:refundError}=await admin.from("payment_refunds").insert({
    ticket_id:ticket?.id??null,live_ticket_id:liveTicket?.id??null,payment_reference:order.provider_reference,
    provider:order.provider,provider_mode:order.provider_mode,amount_minor:order.amount_minor,currency:order.currency,
    reason:parsed.data.reason,requested_by:user.id,status:"pending",
   }).select("id").single();
   if(refundError||!refund)return json({error:"The refund request could not be recorded."},409);
   refundId = refund.id;
  }

  const adapter=String(binding.settings?.refund_adapter??binding.settings?.adapter??order.provider).toLowerCase();
  const transactionId=order.provider_transaction_id||order.provider_reference;
  const targetPath=refundPath.replace("{transaction_id}",encodeURIComponent(transactionId)).replace("{reference}",encodeURIComponent(order.provider_reference));
  const target=new URL(targetPath,binding.base_url);
  if(target.origin!==new URL(binding.base_url).origin){await admin.from("payment_refunds").update({status:"failed",error_code:"refund_host_mismatch"}).eq("id",refundId);return json({error:"Refund endpoint host mismatch."},400);}
  const header=typeof binding.settings?.credential_header==="string"?binding.settings.credential_header:"Authorization";
  const prefix=typeof binding.settings?.credential_prefix==="string"?binding.settings.credential_prefix:"Bearer ";
  const amountMajor=liveOrder?Number(order.amount_major??(Number(order.amount_minor)/100)):Number(ticket.price);
  let requestBody:Record<string,unknown>;
  if(adapter==="paystack")requestBody={transaction:transactionId,amount:order.amount_minor,customer_note:parsed.data.reason};
  else if(adapter==="stripe")requestBody={payment_intent:transactionId,amount:order.amount_minor,reason:"requested_by_customer",metadata:{degame_ticket_id:parsed.data.ticketId,reason:parsed.data.reason}};
  else if(adapter==="flutterwave")requestBody={amount:amountMajor,reason:parsed.data.reason};
  else requestBody={reference:order.provider_reference,transaction_id:transactionId,amount_minor:order.amount_minor,currency:order.currency,reason:parsed.data.reason};
  const response=await fetch(target,{method:"POST",headers:{[header]:prefix+credential,"Content-Type":"application/json",Accept:"application/json","Idempotency-Key":refundId},body:JSON.stringify(requestBody),signal:AbortSignal.timeout(20000)}).catch(()=>null);
  if(!response){await admin.from("payment_refunds").update({error_code:"provider_outcome_unknown"}).eq("id",refundId);return json({error:"Refund provider timed out. The request remains safely pending with the same idempotency key; retry reconciliation before issuing another refund."},202);}
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload){
   await admin.from("payment_refunds").update({status:"failed",error_code:"provider_http_"+response.status}).eq("id",refundId);
   return json({error:"Refund provider rejected the request. Ticket access was not changed."},502);
  }
  let succeeded=false,pending=false,providerRefundId:string|null=null;
  if(adapter==="paystack"){
   const state=String(payload.data?.status??"").toLowerCase();
   succeeded=payload.status===true&&state==="processed";pending=payload.status===true&&state==="pending";
   providerRefundId=payload.data?.id?String(payload.data.id):null;
  }else if(adapter==="stripe"){
   succeeded=payload.status==="succeeded";pending=payload.status==="pending";
   providerRefundId=typeof payload.id==="string"?payload.id:null;
  }else if(adapter==="flutterwave"){
   const state=String(payload.data?.status??payload.status??"").toLowerCase();
   succeeded=payload.status==="success"&&state==="success";pending=state==="pending";
   providerRefundId=payload.data?.id?String(payload.data.id):null;
  }else{
   succeeded=payload.refunded===true&&payload.status==="succeeded";pending=payload.status==="pending";
   providerRefundId=typeof payload.refund_id==="string"?payload.refund_id:null;
  }
  if(pending){
   await admin.from("payment_refunds").update({provider_refund_id:providerRefundId}).eq("id",refundId);
   return json({success:false,pending:true,refundId:refundId,message:"Provider accepted the refund for processing. Ticket access remains active until the refund is confirmed."},202);
  }
  if(!succeeded){
   await admin.from("payment_refunds").update({status:"failed",provider_refund_id:providerRefundId,error_code:"provider_refund_not_confirmed"}).eq("id",refundId);
   return json({error:"Provider did not confirm the refund. Ticket access was not changed."},502);
  }
  await admin.from("payment_refunds").update({status:"provider_confirmed",provider_refund_id:providerRefundId}).eq("id",refundId);
  const {data:completed,error:completeError}=await admin.rpc("complete_payment_refund",{p_refund_id:refundId,p_provider_refund_id:providerRefundId});
  if(completeError)return json({error:"Provider confirmed the refund, but local ticket and ledger reconciliation is pending. Retry this refund reference.",refundId:refundId},503);
  return json({success:true,refund:completed});
 }catch(error){console.error("process-refund",error);return json({error:"Refund processing failed safely. Ticket access was not changed."},500);}
});
