import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
if(import.meta.main) serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return json(405,{error:"Method not allowed."});
 try{
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization");
  if(!url||!anon||!service||!authorization?.startsWith("Bearer ")) return json(503,{error:"Review service unavailable."});
  const auth=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:authData,error:authError}=await auth.auth.getUser(),actor=authData?.user;
  if(authError||!actor) return json(401,{error:"Sign in again."});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:roles,error:roleError}=await admin.from("user_roles").select("role").eq("user_id",actor.id);
  if(roleError||!roles?.some((r:any)=>["super_admin","platform_admin"].includes(r.role))) return json(403,{error:"You are not authorized to review identity applications."});
  const body=await req.json().catch(()=>null);
  const target=typeof body?.user_id==="string"?body.user_id:"";
  const decision=body?.decision;
  const reason=typeof body?.reason==="string"?body.reason.trim():"";
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(target)) return json(400,{error:"A valid applicant ID is required."});
  if(!["verified","rejected"].includes(decision)||reason.length<10||reason.length>1000) return json(400,{error:"Choose approve or reject and provide a review reason of at least 10 characters."});
  const {data:profile,error:readError}=await admin.from("profiles").select("kyc_status,kyc_id_url,kyc_selfie_url").eq("user_id",target).maybeSingle();
  if(readError||!profile) return json(404,{error:"Applicant not found."});
  if(profile.kyc_status!=="pending") return json(409,{error:"Only pending applications can be reviewed."});
  if(!profile.kyc_id_url||!profile.kyc_selfie_url) return json(409,{error:"The application is missing required identity evidence."});
  const now=new Date().toISOString();
  const {error:updateError}=await admin.from("profiles").update({kyc_status:decision,kyc_verified_at:decision==="verified"?now:null}).eq("user_id",target).eq("kyc_status","pending");
  if(updateError) return json(500,{error:"The review decision could not be saved."});
  const {error:auditError}=await admin.from("audit_logs").insert({
   user_id:actor.id,action:decision==="verified"?"identity.application.approved":"identity.application.rejected",
   entity_type:"profile",entity_id:target,old_data:{kyc_status:"pending"},
   new_data:{kyc_status:decision,reason,reviewed_by:actor.id,reviewed_at:now},
   ip_address:req.headers.get("cf-connecting-ip")||null,user_agent:req.headers.get("user-agent")||null
  });
  if(auditError) return json(500,{error:"Decision saved but audit recording failed. Escalate immediately; do not repeat the review."});
  return json(200,{success:true,status:decision,reviewed_at:now});
 }catch{return json(500,{error:"Identity review failed. Contact platform support."});}
});