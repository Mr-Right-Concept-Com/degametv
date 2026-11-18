import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
const endpoint=(base:string,path:unknown)=>{if(typeof path!=="string"||!path.startsWith("/")||path.startsWith("//"))throw new Error("provider_endpoint_missing");const u=new URL(path,base);if(u.origin!==new URL(base).origin)throw new Error("provider_endpoint_invalid");return u;};

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const authorization=req.headers.get("Authorization");
 if(!url||!anon||!service||!authorization?.startsWith("Bearer "))return json({error:"Identity verification is unavailable."},503);
 const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await caller.auth.getUser();
 if(authError||!user)return json({error:"Authentication required."},401);
 const body=await req.json().catch(()=>null),verificationId=typeof body?.verificationId==="string"?body.verificationId:"";
 if(!/^[0-9a-f-]{36}$/i.test(verificationId))return json({error:"A valid verification ID is required."},400);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:record,error:recordError}=await db.from("identity_verifications").select("*").eq("id",verificationId).eq("user_id",user.id).maybeSingle();
 if(recordError||!record)return json({error:"Identity application not found."},404);
 if(record.status!=="pending"&&record.status!=="processing")return json({status:record.status},409);
 const {data:providers,error:providerError}=await db.rpc("get_service_provider_runtime_config",{p_capability:"identity"});
 if(providerError||!Array.isArray(providers)||!providers.length)return json({status:"pending",providerConfigured:false,message:"Your application is safely queued for manual review."});
 const provider=providers[0];
 if(!provider.credential||!provider.endpoints?.identity_verify||!provider.endpoints?.liveness_verify)return json({status:"pending",providerConfigured:false,message:"Identity provider contract is incomplete; manual review remains available."});
 try{
  const [doc,selfie]=await Promise.all([
   db.storage.from("identity-documents").createSignedUrl(record.document_object_path,600),
   db.storage.from("identity-documents").createSignedUrl(record.selfie_video_object_path,600),
  ]);
  if(doc.error||selfie.error||!doc.data?.signedUrl||!selfie.data?.signedUrl)return json({error:"Evidence could not be securely shared with the verification provider."},503);
  const headers={"Content-Type":"application/json","Authorization":"Bearer "+provider.credential};
  const [identityResponse,livenessResponse]=await Promise.all([
   fetch(endpoint(provider.base_url,provider.endpoints.identity_verify),{method:"POST",headers,body:JSON.stringify({country_code:record.country_code,document_type:record.document_type,legal_name:record.legal_name,date_of_birth:record.date_of_birth,document_url:doc.data.signedUrl}),signal:AbortSignal.timeout(20000)}),
   fetch(endpoint(provider.base_url,provider.endpoints.liveness_verify),{method:"POST",headers,body:JSON.stringify({country_code:record.country_code,legal_name:record.legal_name,selfie_video_url:selfie.data.signedUrl,document_url:doc.data.signedUrl}),signal:AbortSignal.timeout(20000)}),
  ]);
  const [identity,liveness]=await Promise.all([identityResponse.json().catch(()=>null),livenessResponse.json().catch(()=>null)]);
  if(!identityResponse.ok||!livenessResponse.ok||!identity||!liveness)return json({error:"Identity provider could not complete verification. Your application remains pending."},502);
  const checks={document_valid:identity.document_valid===true,identity_verified:identity.identity_verified===true,name_match:identity.name_match===true,liveness_passed:liveness.liveness_passed===true,face_match:liveness.face_match===true};
  const passed=Object.values(checks).every(Boolean);
  const mode=record.verification_mode;
  const automatic=passed&&(mode==="automatic"||mode==="hybrid");
  const nextStatus=automatic?"verified":"pending";
  const reference=typeof identity.reference==="string"?identity.reference.slice(0,200):null;
  const result={provider:provider.provider_key,checks,identity_status:identity.status??null,liveness_status:liveness.status??null,checked_at:new Date().toISOString(),automatic_approval:automatic};
  const {error:updateError}=await db.from("identity_verifications").update({
    status:nextStatus,identity_provider:provider.provider_key,liveness_provider:provider.provider_key,
    identity_reference:reference,liveness_reference:typeof liveness.reference==="string"?liveness.reference.slice(0,200):null,
    provider_result:result,reviewed_at:automatic?new Date().toISOString():null,
    updated_at:new Date().toISOString(),
  }).eq("id",verificationId).eq("user_id",user.id);
  if(updateError)return json({error:"Provider result could not be reconciled to the application."},503);
  if(automatic){
    const {error:profileError}=await db.from("profiles").update({kyc_status:"verified",kyc_verified_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("user_id",user.id);
    if(profileError)return json({error:"Identity passed but account activation needs reconciliation."},503);
    const {data:role}=await db.from("user_roles").select("id").eq("user_id",user.id).eq("role","creator").maybeSingle();
    if(!role){const {error:roleError}=await db.from("user_roles").insert({user_id:user.id,role:"creator"});if(roleError)return json({error:"Identity passed but creator role activation needs reconciliation."},503);}
  }
  await db.from("audit_logs").insert({user_id:user.id,action:automatic?"identity.provider.auto_verified":"identity.provider.review_required",entity_type:"identity_verification",entity_id:verificationId,new_data:{provider:provider.provider_key,checks,mode}});
  return json({status:nextStatus,providerConfigured:true,checks,creatorActivated:automatic});
 }catch(e){
  console.error("run-identity-provider",e);
  return json({error:"Identity provider request failed. Your application remains pending."},502);
 }
});