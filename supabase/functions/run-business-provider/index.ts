import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null&&!Array.isArray(value);
type VerificationProvider={provider_key:string;credential:string;base_url:string;endpoints:Record<string,unknown>};
const isVerificationProvider=(value:unknown):value is VerificationProvider=>isRecord(value)&&typeof value.provider_key==="string"&&typeof value.credential==="string"&&typeof value.base_url==="string"&&isRecord(value.endpoints);
const endpoint=(base:string,path:unknown)=>{if(typeof path!=="string"||!path.startsWith("/")||path.startsWith("//"))throw new Error("provider_endpoint_missing");const u=new URL(path,base);if(u.origin!==new URL(base).origin)throw new Error("provider_endpoint_invalid");return u;};
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization");
 if(!url||!anon||!service||!authorization?.startsWith("Bearer "))return json({error:"Business verification is unavailable."},503);
 const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await caller.auth.getUser();
 if(authError||!user)return json({error:"Authentication required."},401);
 const body:unknown=await req.json().catch(()=>null),id=isRecord(body)&&typeof body.verificationId==="string"?body.verificationId:"";
 if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:"A valid business verification ID is required."},400);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:material,error:materialError}=await db.rpc("get_business_verification_material",{p_verification_id:id});
 const recordValue:unknown=Array.isArray(material)?material[0]:null;
 const record=isRecord(recordValue)?recordValue:null;
 if(materialError||!record||record.user_id!==user.id||typeof record.registration_document_path!=="string")return json({error:"Business verification application not found."},404);
 const {data:current,error:currentError}=await db.from("business_verifications").select("status").eq("id",id).maybeSingle();
 if(currentError||!current)return json({error:"Business verification application not found."},404);
 if(current.status!=="pending"&&current.status!=="processing")return json({status:current.status},409);
 const {data:businessProviders}=await db.rpc("get_service_provider_runtime_config",{p_capability:"identity"});
 const {data:bankProviders}=await db.rpc("get_service_provider_runtime_config",{p_capability:"bank_verification"});
 if(!Array.isArray(businessProviders)||!businessProviders.length||!Array.isArray(bankProviders)||!bankProviders.length)
   return json({status:"pending",providerConfigured:false,message:"Business and bank checks remain queued for manual review."});
 const businessProviderValue:unknown=businessProviders[0],bankProviderValue:unknown=bankProviders[0];
 const businessProvider=isVerificationProvider(businessProviderValue)?businessProviderValue:null;
 const bankProvider=isVerificationProvider(bankProviderValue)?bankProviderValue:null;
 if(!businessProvider||!bankProvider)return json({status:"pending",providerConfigured:false,message:"Business or bank provider contract is incomplete; manual review remains available."});
 if(!businessProvider.credential||!businessProvider.endpoints?.business_verify||!bankProvider.credential||!bankProvider.endpoints?.bank_verify)
   return json({status:"pending",providerConfigured:false,message:"Business or bank provider contract is incomplete; manual review remains available."});
 try{
  const {data:doc,error:docError}=await db.storage.from("kyb-docs").createSignedUrl(record.registration_document_path,600);
  if(docError||!doc?.signedUrl)return json({error:"Registration evidence could not be securely shared with the provider."},503);
  const auth=(provider:VerificationProvider):Record<string,string>=>({"Content-Type":"application/json","Authorization":"Bearer "+provider.credential});
  const [businessResponse,bankResponse]=await Promise.all([
   fetch(endpoint(businessProvider.base_url,businessProvider.endpoints.business_verify),{method:"POST",headers:auth(businessProvider),body:JSON.stringify({
    country:record.registration_country,registration_number:record.registration_number,legal_business_name:record.legal_business_name,
    address:record.business_address,city:record.business_city,registration_document_url:doc.signedUrl,
   }),signal:AbortSignal.timeout(20000)}),
   fetch(endpoint(bankProvider.base_url,bankProvider.endpoints.bank_verify),{method:"POST",headers:auth(bankProvider),body:JSON.stringify({
    country:record.bank_country,bank_name:record.bank_name,account_number:record.bank_account_number,
    expected_account_name:record.bank_account_name,legal_identity_name:record.identity_legal_name,
   }),signal:AbortSignal.timeout(20000)}),
  ]);
  const [business,bank]=await Promise.all([businessResponse.json().catch(()=>null),bankResponse.json().catch(()=>null)]);
  if(!businessResponse.ok||!bankResponse.ok||!isRecord(business)||!isRecord(bank))return json({error:"Verification providers could not complete the checks. Application remains pending."},502);
  const checks={
   registration_valid:business.registration_valid===true,
   business_name_match:business.business_name_match===true,
   address_verified:business.address_verified===true,
   bank_account_valid:bank.account_valid===true,
   bank_account_name_match:bank.account_name_match===true,
   bank_owner_matches_identity:bank.identity_name_match===true,
  };
  const passed=Object.values(checks).every(Boolean),automatic=passed&&(record.verification_mode==="automatic"||record.verification_mode==="hybrid");
  const now=new Date().toISOString(),status=automatic?"verified":"pending";
  const providerResult={business_provider:businessProvider.provider_key,bank_provider:bankProvider.provider_key,checks,checked_at:now,automatic_approval:automatic};
  const {error:updateError}=await db.from("business_verifications").update({
   status,verification_provider:businessProvider.provider_key,
   verification_reference:typeof business.reference==="string"?business.reference.slice(0,200):null,
   provider_result:providerResult,reviewed_at:automatic?now:null,updated_at:now,
  }).eq("id",id).eq("user_id",user.id);
  if(updateError)return json({error:"Provider results could not be reconciled."},503);
  if(automatic){
   const {error:studioError}=await db.from("studio_accounts").update({status:"approved",reviewed_at:now,review_notes:"Automatically approved after provider-verified identity, business and bank checks."}).eq("user_id",user.id).eq("tier","business");
   if(studioError)return json({error:"Business verification passed but Studio activation needs reconciliation."},503);
  }
  await db.from("audit_logs").insert({user_id:user.id,action:automatic?"business.provider.auto_verified":"business.provider.review_required",entity_type:"business_verification",entity_id:id,new_data:{business_provider:businessProvider.provider_key,bank_provider:bankProvider.provider_key,checks,mode:record.verification_mode}});
  return json({status,providerConfigured:true,checks,studioActivated:automatic});
 }catch(e:unknown){console.error("run-business-provider",e);return json({error:"Business verification provider request failed. Application remains pending."},502);}
});