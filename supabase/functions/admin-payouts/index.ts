import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";

const corsHeaders={
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
 "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("list")}),
 z.object({action:z.literal("transition"),id:z.string().uuid(),transition:z.enum(["approve","reject"]),adminNote:z.string().trim().max(1000).optional()}),
]);

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL");
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const authorization=req.headers.get("Authorization")??"";
 if(!url||!serviceKey||!authorization.startsWith("Bearer "))return json({error:"Service unavailable or authentication missing."},503);
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await admin.auth.getUser(authorization.slice(7));
 if(userError||!user)return json({error:"Authentication required."},401);
 const {data:adminRole,error:roleError}=await admin.from("user_roles").select("user_id")
  .eq("user_id",user.id).eq("role","super_admin").maybeSingle();
 if(roleError||!adminRole)return json({error:"Super administrator access required."},403);
 let raw:unknown;
 try{raw=await req.json();}catch{return json({error:"A valid JSON request body is required."},400);}
 const parsed=schema.safeParse(raw);
 if(!parsed.success)return json({error:"Invalid payout administration request.",issues:parsed.error.flatten()},400);
 if(parsed.data.action==="list"){
  const {data,error}=await admin.from("withdrawal_requests")
   .select("id,user_id,amount,currency,bank_name,account_number,account_name,bank_country,status,admin_note,created_at,updated_at,approved_at,rejected_at,processing_at,payout_reference,payout_provider_key,paid_at,failure_reason")
   .order("created_at",{ascending:false}).limit(200);
  if(error)return json({error:"Withdrawal requests could not be loaded."},503);
  const withdrawals=(data??[]).map(row=>{
   const normalizedAccount=String(row.account_number??"").replace(/[^A-Za-z0-9]/g,"");
   const safe=Object.fromEntries(Object.entries(row).filter(([key])=>key!=="account_number"));
   return {...safe,account_last4:normalizedAccount.length>=4?normalizedAccount.slice(-4):null};
  });
  return json({withdrawals});
 }
 const transition=parsed.data;
 if(transition.transition==="reject"&&(!transition.adminNote||transition.adminNote.length<5)){
  return json({error:"A rejection reason of at least five characters is required."},422);
 }
 const {data:withdrawal,error:transitionError}=await admin.rpc("transition_withdrawal_request",{
  p_request_id:transition.id,p_transition:transition.transition,p_actor_id:user.id,p_admin_note:transition.adminNote??null,
 });
 if(transitionError){
  const message=transitionError.message??"";
  if(message.includes("withdrawal_request_state_conflict"))return json({error:"The request is no longer pending. Refresh the payout queue before acting."},409);
  if(message.includes("withdrawal_rejection_reason_required"))return json({error:"A rejection reason of at least five characters is required."},422);
  if(message.includes("super_admin_required"))return json({error:"Super administrator access required."},403);
  return json({error:"Withdrawal transition and audit could not be committed."},503);
 }
 return json({withdrawal});
});
