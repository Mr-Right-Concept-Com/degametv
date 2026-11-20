import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
const Body=z.object({ticketId:z.string().uuid().optional(),contributionId:z.string().uuid().optional(),reason:z.string().trim().min(3).max(500)}).strict().refine(v=>Boolean(v.ticketId)!==Boolean(v.contributionId));
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY"),auth=req.headers.get("Authorization")||"";
 if(!url||!service||!anon||!auth.startsWith("Bearer "))return json(401,{error:"Sign in to request a refund."});
 const caller=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await caller.auth.getUser();
 if(userError||!user)return json(401,{error:"Your session is invalid."});
 const parsed=Body.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{error:"Invalid refund request."});
 const p=parsed.data,admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 if(p.contributionId){
  const {data:c,error}=await admin.from("event_contributions").select("id,creator_id,status").eq("id",p.contributionId).maybeSingle();
  if(error||!c)return json(404,{error:"Contribution not found."});
  if(c.creator_id!==user.id)return json(403,{error:"You cannot refund another creator's contribution."});
  if(c.status!=="paid")return json(409,{error:"Only paid contributions can be refunded."});
 }else{
  let screeningId:string|null=null;
  const {data:ticket}=await admin.from("tickets").select("id,metadata,content_id,revoked_at").eq("id",p.ticketId).maybeSingle();
  if(ticket){
   screeningId=typeof ticket.metadata?.screening_id==="string"?ticket.metadata.screening_id:null;
   if(ticket.revoked_at)return json(409,{error:"This ticket has already been revoked or refunded."});
   if(!screeningId)return json(409,{error:"This ticket is not linked to a creator event."});
  }else{
   const {data:legacy}=await admin.from("screening_tickets").select("id,screening_id,payment_status").eq("id",p.ticketId).maybeSingle();
   if(!legacy)return json(404,{error:"Ticket not found."});
   if(legacy.payment_status!=="completed")return json(409,{error:"Only completed ticket payments can be refunded."});
   screeningId=legacy.screening_id;
  }
  const {data:event}=await admin.from("screenings").select("id,content_id").eq("id",screeningId).maybeSingle();
  const {data:content}=event?await admin.from("content").select("creator_id").eq("id",event.content_id).maybeSingle():{data:null};
  if(!content||content.creator_id!==user.id)return json(403,{error:"You cannot refund tickets for another creator's event."});
 }
 const response=await fetch(url+"/functions/v1/process-refund",{method:"POST",headers:{Authorization:"Bearer "+service,apikey:service,"Content-Type":"application/json"},body:JSON.stringify({...p,requestedBy:user.id}),signal:AbortSignal.timeout(25000)}).catch(()=>null);
 const result=response?await response.json().catch(()=>null):null;
 if(!response?.ok||!result?.success)return json(response?.status===202?202:response?.status||503,{success:false,error:result?.error||"Refund request could not be completed.",pending:response?.status===202});
 return json(200,{success:true,refund:result});
});