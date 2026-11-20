import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const Apply=z.object({action:z.literal("apply"),entityType:z.enum(["INDIVIDUAL_CREATOR","STUDIO","PRODUCTION_COMPANY","BUSINESS"]),displayName:z.string().trim().min(2).max(180),legalName:z.string().trim().min(2).max(240),countryCode:z.string().regex(/^[A-Z]{2}$/),baseCurrency:z.string().regex(/^[A-Z]{3}$/),bio:z.string().trim().max(4000).optional(),rightsDeclaration:z.record(z.unknown()),identityVerificationId:z.string().uuid().optional(),businessVerificationId:z.string().uuid().optional(),taxIdentifier:z.string().trim().min(4).max(64).optional(),bankAccountNumber:z.string().trim().min(4).max(34).optional(),bankName:z.string().trim().min(2).max(180).optional(),bankCountry:z.string().regex(/^[A-Z]{2}$/).optional(),bankAccountName:z.string().trim().min(2).max(180).optional()}).strict();
const Invite=z.object({action:z.literal("invite"),studioAccountId:z.string().uuid(),email:z.string().email().max(254).optional(),userId:z.string().uuid().optional(),role:z.enum(["ADMIN","PRODUCER","BROADCASTER","FINANCE_VIEWER","MODERATOR"])}).strict().refine(v=>Boolean(v.email)!==Boolean(v.userId));
const hash=async(v:string)=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)))].map(x=>x.toString(16).padStart(2,"0")).join("");
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY"),auth=req.headers.get("Authorization");
 if(!url||!service||!anon||!auth?.startsWith("Bearer "))return json(401,{error:"Authentication required."});
 const caller=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await caller.auth.getUser();
 if(authError||!user)return json(401,{error:"Your session is invalid."});
 const input=await req.json().catch(()=>null),a=Apply.safeParse(input),i=Invite.safeParse(input);
 if(!a.success&&!i.success)return json(400,{error:"Invalid creator onboarding request.",issues:a.error.flatten()});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 if(i.success){
  const p=i.data,{data:studio,error}=await db.from("studio_accounts").select("id,user_id,status").eq("id",p.studioAccountId).maybeSingle();
  if(error||!studio)return json(404,{error:"Studio account not found."});
  const {data:membership}=await db.from("studio_memberships").select("role").eq("studio_account_id",studio.id).eq("user_id",user.id).is("revoked_at",null).not("accepted_at","is",null).maybeSingle();
  if(studio.user_id!==user.id&&!["OWNER","ADMIN"].includes(membership?.role))return json(403,{error:"Only a studio owner or administrator can invite members."});
  if(studio.status!=="approved")return json(409,{error:"Studio must be approved before team invitations can be issued."});
  let invitedUserId=p.userId??null,email=p.email?.toLowerCase()??null;
  if(invitedUserId){const {data:target,error:targetError}=await db.auth.admin.getUserById(invitedUserId);if(targetError||!target.user?.email)return json(404,{error:"The invited account could not be found."});email=target.user.email.toLowerCase();}
  else if(email){const {data:users}=await db.auth.admin.listUsers({page:1,perPage:1000});invitedUserId=users?.users.find(u=>u.email?.toLowerCase()===email)?.id??null;}
  const token=crypto.randomUUID()+"."+crypto.randomUUID(),tokenHash=await hash(token);
  const {data:invite,error:inviteError}=await db.from("studio_invitations").insert({studio_account_id:studio.id,email,invited_user_id:invitedUserId,role:p.role,token_hash:tokenHash,invited_by:user.id,expires_at:new Date(Date.now()+7*86400000).toISOString()}).select("id,email,role,expires_at").single();
  if(inviteError)return json(409,{error:"Invitation could not be created."});
  await db.from("audit_logs").insert({user_id:user.id,action:"studio.member.invited",entity_type:"studio_invitation",entity_id:invite.id,new_data:{studio_account_id:studio.id,role:p.role,email}});
  return json(200,{success:true,invitation:{...invite,acceptanceToken:token}});
 }
 const p=a.data;
 const {data:country,error:countryError}=await db.from("country_currency_rules").select("country_code").eq("country_code",p.countryCode).eq("enabled",true).maybeSingle();
 if(countryError||!country)return json(422,{error:"The selected country is not in the active country registry."});
 const {data:currency,error:currencyError}=await db.from("country_currency_rules").select("currency_code").eq("currency_code",p.baseCurrency).eq("enabled",true).limit(1);
 if(currencyError||!currency?.length)return json(422,{error:"The selected base currency is not supported by the active currency registry."});
 if(p.entityType==="INDIVIDUAL_CREATOR"&&!p.identityVerificationId)return json(422,{error:"Individual creators require an existing identity verification record."});
 if(p.entityType!=="INDIVIDUAL_CREATOR"&&!p.businessVerificationId)return json(422,{error:"Studio and business entities require an existing KYB evidence record."});
 const {data:existing}=await db.from("creator_verification_cases").select("id,status").eq("user_id",user.id).in("status",["DRAFT","SUBMITTED","UNDER_REVIEW","ADDITIONAL_INFO_REQUIRED","APPEAL_PENDING"]).maybeSingle();
 if(existing)return json(409,{error:"An active creator application already exists.",caseId:existing.id,status:existing.status});
 const {error:accountError}=await db.rpc("submit_my_studio_account",{p_tier:p.entityType==="INDIVIDUAL_CREATOR"?"creator":"business"});
 if(accountError)return json(409,{error:accountError.message});
 const {data:studio,error:studioError}=await db.from("studio_accounts").select("id").eq("user_id",user.id).single();
 if(studioError||!studio)return json(503,{error:"Creator account was submitted but could not be loaded."});
 const {data:caseRow,error:caseError}=await db.from("creator_verification_cases").insert({user_id:user.id,studio_account_id:studio.id,entity_type:p.entityType,status:"SUBMITTED",country_code:p.countryCode,requirements_snapshot:{country:p.countryCode,identityRequired:p.entityType==="INDIVIDUAL_CREATOR",businessRequired:p.entityType!=="INDIVIDUAL_CREATOR",profile:{displayName:p.displayName,legalName:p.legalName,bio:p.bio??null}},rights_declaration:p.rightsDeclaration,identity_verification_id:p.identityVerificationId??null,business_verification_id:p.businessVerificationId??null,submitted_at:new Date().toISOString()}).select("id,status").single();
 if(caseError||!caseRow)return json(503,{error:"Verification case could not be created; studio account remains pending."});
 const {error:updateError}=await db.from("studio_accounts").update({entity_type:p.entityType,country_code:p.countryCode,base_currency:p.baseCurrency,verification_status:"SUBMITTED",rights_declaration:p.rightsDeclaration,tax_country:p.countryCode,payout_bank_country:p.bankCountry??null,payout_bank_name:p.bankName??null,payout_account_name:p.bankAccountName??null,verification_submitted_at:new Date().toISOString()}).eq("id",studio.id).eq("user_id",user.id);
 if(updateError)return json(503,{error:"Application was created but profile details need reconciliation.",caseId:caseRow.id});
 if(p.bankAccountNumber||p.taxIdentifier){const {error:secretError}=await db.rpc("store_creator_vault_material",{p_user_id:user.id,p_bank_account_number:p.bankAccountNumber??null,p_tax_identifier:p.taxIdentifier??null});if(secretError)return json(503,{error:"Application saved, but sensitive details could not be stored in Vault.",caseId:caseRow.id});}
 const {error:auditError}=await db.from("creator_verification_audit").insert({case_id:caseRow.id,actor_id:user.id,action:"submitted",from_status:"DRAFT",to_status:"SUBMITTED",details:{entity_type:p.entityType,country_code:p.countryCode,has_payout_details:Boolean(p.bankAccountNumber),has_tax_details:Boolean(p.taxIdentifier)}});
 if(auditError)return json(503,{error:"Application submitted but audit reconciliation failed.",caseId:caseRow.id});
 await db.from("audit_logs").insert({user_id:user.id,action:"creator.application.submitted",entity_type:"creator_verification_case",entity_id:caseRow.id,new_data:{entity_type:p.entityType,country_code:p.countryCode}});
 return json(202,{success:true,caseId:caseRow.id,status:"SUBMITTED",creatorAccountId:studio.id,providerVerification:"EXISTING_KYC_KYB_EVIDENCE_LINKED"});
});