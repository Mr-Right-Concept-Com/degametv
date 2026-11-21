import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const Body=z.discriminatedUnion("action",[
 z.object({action:z.literal("list"),status:z.enum(["SUBMITTED","UNDER_REVIEW","APPEAL_PENDING","REJECTED","SUSPENDED"]).optional()}).strict(),
 z.object({caseId:z.string().uuid(),action:z.enum(["approve","reject","request_information","suspend","resolve_appeal"]),reason:z.string().trim().min(3).max(2000),decision:z.enum(["approve","reject"]).optional()}).strict()
]).superRefine((v,c)=>{if(v.action==="resolve_appeal"&&!v.decision)c.addIssue({code:"custom",path:["decision"],message:"Appeal resolution requires a decision."});});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY"),auth=req.headers.get("Authorization");
 if(!url||!service||!anon||!auth?.startsWith("Bearer "))return json(401,{error:"Authentication required."});
 const caller=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await caller.auth.getUser();if(authError||!user)return json(401,{error:"Invalid session."});
 const parsed=Body.safeParse(await req.json().catch(()=>null));if(!parsed.success)return json(400,{error:"Invalid review request.",issues:parsed.error.flatten()});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:admin,error:adminError}=await db.from("user_roles").select("role").eq("user_id",user.id).in("role",["super_admin","platform_admin"]).limit(1);
 if(adminError||!admin?.length)return json(403,{error:"God Mode administrator permission is required."});
 const p=parsed.data;
 if(p.action==="list"){
  let query=db.from("creator_verification_cases").select("id,user_id,studio_account_id,entity_type,status,country_code,submitted_at,reviewed_at,appeal_reason,requirements_snapshot,identity_verification_id,business_verification_id").order("submitted_at",{ascending:false}).limit(100);
  if(p.status)query=query.eq("status",p.status);
  const {data,error}=await query;
  return error?json(503,{error:"Creator review queue could not be loaded."}):json(200,{success:true,cases:data??[]});
 }
 const {data:record,error:readError}=await db.from("creator_verification_cases").select("*").eq("id",p.caseId).maybeSingle();
 if(readError||!record)return json(404,{error:"Creator application not found."});
 if(["APPROVED","REJECTED","SUSPENDED"].includes(record.status)&&p.action!=="resolve_appeal")return json(409,{error:"This application is already in a terminal review state."});
 const next=p.action==="approve"?"APPROVED":p.action==="reject"?"REJECTED":p.action==="request_information"?"ADDITIONAL_INFO_REQUIRED":p.action==="suspend"?"SUSPENDED":p.decision==="approve"?"APPROVED":"REJECTED";
 if(p.action==="approve"||p.action==="resolve_appeal"&&p.decision==="approve"){
  if(record.entity_type==="INDIVIDUAL_CREATOR"&&!record.identity_verification_id)return json(409,{error:"Verified identity evidence is required before creator approval."});
  if(record.entity_type!=="INDIVIDUAL_CREATOR"&&!record.business_verification_id)return json(409,{error:"Verified business evidence is required before studio approval."});
  if(record.identity_verification_id){const {data:v}=await db.from("identity_verifications").select("status").eq("id",record.identity_verification_id).eq("user_id",record.user_id).maybeSingle();if(v?.status!=="verified")return json(409,{error:"Identity provider or manual verification has not marked the evidence verified."});}
  if(record.business_verification_id){const {data:v}=await db.from("business_verifications").select("status").eq("id",record.business_verification_id).eq("user_id",record.user_id).maybeSingle();if(v?.status!=="verified")return json(409,{error:"KYB evidence is not verified."});}
 }
 const now=new Date().toISOString();
 const {error:updateCaseError}=await db.from("creator_verification_cases").update({status:next,reviewed_at:now,reviewed_by:user.id,updated_at:now,appeal_reason:p.action==="resolve_appeal"?record.appeal_reason:record.appeal_reason}).eq("id",record.id);
 if(updateCaseError)return json(503,{error:"Review status could not be saved."});
 const {error:studioError}=await db.from("studio_accounts").update({
  verification_status:next,verification_reviewed_at:now,verification_reviewed_by:user.id,verification_reason:p.reason,
  ...(next==="APPROVED"?{status:"approved"}:next==="REJECTED"?{status:"rejected"}:{}),
 }).eq("user_id",record.user_id);
 if(studioError)return json(503,{error:"Case was updated but creator account reconciliation failed."});
 if(next==="APPROVED"){
  const {data:role}=await db.from("user_roles").select("user_id").eq("user_id",record.user_id).eq("role","creator").maybeSingle();
  if(!role){const {error}=await db.from("user_roles").insert({user_id:record.user_id,role:"creator"});if(error)return json(503,{error:"Approval saved but creator role provisioning failed."});}
  const {data:studio}=await db.from("studio_accounts").select("id").eq("user_id",record.user_id).single();
  if(studio){const {error}=await db.from("studio_memberships").upsert({studio_account_id:studio.id,user_id:record.user_id,role:"OWNER",invited_by:user.id,accepted_at:now,revoked_at:null},{onConflict:"studio_account_id,user_id"});if(error)return json(503,{error:"Creator role was granted but owner membership provisioning failed."});}
 }
 if(next==="SUSPENDED"){await db.from("user_roles").delete().eq("user_id",record.user_id).eq("role","creator");}
 const action=p.action==="resolve_appeal"?"appeal_resolved":p.action==="approve"?"approved":p.action==="reject"?"rejected":p.action==="suspend"?"suspended":p.action==="request_information"?"additional_info_requested":"review_started";
 const {error:auditError}=await db.from("creator_verification_audit").insert({case_id:record.id,actor_id:user.id,action,from_status:record.status,to_status:next,details:{reason:p.reason,decision:p.decision??null}});
 if(auditError)return json(503,{error:"Decision was applied but immutable audit append failed."});
 const securityAction=next==="SUSPENDED"?"creator.verification.suspended":next==="APPROVED"&&record.status==="SUSPENDED"?"creator.verification.override_approved":"creator.verification.reviewed";
 await db.from("audit_logs").insert({user_id:user.id,action:securityAction,entity_type:"creator_verification_case",entity_id:record.id,old_data:{status:record.status},new_data:{status:next,subject_user_id:record.user_id,reason:p.reason}});
 return json(200,{success:true,caseId:record.id,status:next,creatorRoleProvisioned:next==="APPROVED"});
});