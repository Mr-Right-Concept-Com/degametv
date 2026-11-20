import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const Apply=z.object({action:z.literal("apply"),entityType:z.enum(["INDIVIDUAL_CREATOR","STUDIO","PRODUCTION_COMPANY","BUSINESS"]),displayName:z.string().trim().min(2).max(180),legalName:z.string().trim().min(2).max(240),countryCode:z.string().regex(/^[A-Z]{2}$/),baseCurrency:z.string().regex(/^[A-Z]{3}$/),bio:z.string().trim().max(4000).optional(),rightsDeclaration:z.record(z.unknown()),identityVerificationId:z.string().uuid().optional(),businessVerificationId:z.string().uuid().optional(),taxIdentifier:z.string().trim().min(4).max(64).optional(),bankAccountNumber:z.string().trim().min(4).max(34).optional(),bankName:z.string().trim().min(2).max(180).optional(),bankCountry:z.string().regex(/^[A-Z]{2}$/).optional(),bankAccountName:z.string().trim().min(2).max(180).optional()}).strict();
const Invite=z.object({action:z.literal("invite"),studioAccountId:z.string().uuid(),email:z.string().email().max(254).optional(),userId:z.string().uuid().optional(),role:z.enum(["ADMIN","PRODUCER","BROADCASTER","FINANCE_VIEWER","MODERATOR"])}).strict().refine(v=>Boolean(v.email)!==Boolean(v.userId));
const InvitationAction=z.discriminatedUnion("action",[
 z.object({action:z.literal("list_invitations")}).strict(),
 z.object({action:z.literal("list_my_cases")}).strict(),
 z.object({action:z.literal("list_team"),studioAccountId:z.string().uuid()}).strict(),
 z.object({action:z.literal("accept_invitation"),token:z.string().min(20).max(200).optional(),invitationId:z.string().uuid().optional()}).strict().refine(v=>Boolean(v.token)!==Boolean(v.invitationId)),
 z.object({action:z.literal("reject_invitation"),token:z.string().min(20).max(200).optional(),invitationId:z.string().uuid().optional()}).strict().refine(v=>Boolean(v.token)!==Boolean(v.invitationId)),
 z.object({action:z.literal("revoke_invitation"),invitationId:z.string().uuid()}).strict(),
 z.object({action:z.literal("update_member_role"),membershipId:z.string().uuid(),role:z.enum(["ADMIN","PRODUCER","BROADCASTER","FINANCE_VIEWER","MODERATOR"])}).strict(),
 z.object({action:z.literal("revoke_member"),membershipId:z.string().uuid()}).strict(),
 z.object({action:z.literal("submit_appeal"),caseId:z.string().uuid(),reason:z.string().trim().min(20).max(4000)}).strict(),
 z.object({action:z.literal("record_content_rights"),contentId:z.string().uuid(),declaration:z.object({rightsType:z.string().min(1).max(120),ownershipType:z.enum(["SOLE_OWNER","CO_OWNED","LICENSED","PUBLIC_DOMAIN","COMMISSIONED"]),rightsHolder:z.string().trim().min(2).max(240),exclusivity:z.enum(["EXCLUSIVE","NON_EXCLUSIVE"]),distributionScope:z.string().min(1).max(120),territories:z.array(z.string().regex(/^(WORLD|[A-Z]{2})$/)).max(250),contentFormat:z.string().min(1).max(40),attestedAt:z.string().datetime(),statement:z.string().trim().min(10).max(4000)}).strict()}).strict(),
]);
const hash=async(v:string)=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)))].map(x=>x.toString(16).padStart(2,"0")).join("");
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY"),auth=req.headers.get("Authorization");
 if(!url||!service||!anon||!auth?.startsWith("Bearer "))return json(401,{error:"Authentication required."});
 const caller=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await caller.auth.getUser();
 if(authError||!user)return json(401,{error:"Your session is invalid."});
 const input=await req.json().catch(()=>null),a=Apply.safeParse(input),i=Invite.safeParse(input),x=InvitationAction.safeParse(input);
 if(!a.success&&!i.success&&!x.success)return json(400,{error:"Invalid creator onboarding request.",issues:a.error.flatten()});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 if(x.success){
  const p=x.data;
  if(p.action==="list_invitations"){
   const {data,error}=await db.from("studio_invitations").select("id,studio_account_id,email,role,expires_at").eq("email",String(user.email??"").toLowerCase()).is("accepted_at",null).is("revoked_at",null).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(50);
   return error?json(503,{error:"Pending invitations could not be loaded."}):json(200,{success:true,invitations:data??[]});
  }
  if(p.action==="list_my_cases"){
   const {data,error}=await db.from("creator_verification_cases").select("id,entity_type,status,submitted_at,appeal_reason,reviewed_at").eq("user_id",user.id).order("submitted_at",{ascending:false}).limit(20);
   return error?json(503,{error:"Creator applications could not be loaded."}):json(200,{success:true,cases:data??[]});
  }
  if(p.action==="list_team"||p.action==="update_member_role"||p.action==="revoke_member"){
   const studioAccountId=p.action==="list_team"?p.studioAccountId:undefined;
   let membershipQuery=db.from("studio_memberships").select("id,studio_account_id,user_id,role,accepted_at,revoked_at");
   if(p.action!=="list_team")membershipQuery=membershipQuery.eq("id",p.membershipId);
   const {data:membershipRows}=await membershipQuery;
   const target=p.action==="list_team"?null:membershipRows?.[0];
   const targetStudio=studioAccountId??target?.studio_account_id;
   if(!targetStudio)return json(404,{error:"Studio membership not found."});
   const {data:studio}=await db.from("studio_accounts").select("id,user_id").eq("id",targetStudio).maybeSingle();
   const {data:actorMembership}=await db.from("studio_memberships").select("role").eq("studio_account_id",targetStudio).eq("user_id",user.id).is("revoked_at",null).not("accepted_at","is",null).maybeSingle();
   if(studio?.user_id!==user.id&&![ "OWNER","ADMIN" ].includes(actorMembership?.role))return json(403,{error:"Studio owner or administrator permission is required."});
   if(p.action==="list_team"){
    const [{data:members,error:membersError},{data:invitations,error:invitationError}]=await Promise.all([
     db.from("studio_memberships").select("id,user_id,role,accepted_at,revoked_at,created_at").eq("studio_account_id",targetStudio).is("revoked_at",null).not("accepted_at","is",null).order("created_at",{ascending:true}),
     db.from("studio_invitations").select("id,email,role,expires_at,created_at").eq("studio_account_id",targetStudio).is("accepted_at",null).is("revoked_at",null).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false})
    ]);
    if(membersError||invitationError)return json(503,{error:"Studio team could not be loaded."});
    return json(200,{success:true,members:members??[],invitations:invitations??[]});
   }
   if(!target||target.role==="OWNER")return json(409,{error:"The studio owner membership cannot be changed."});
   if(p.action==="update_member_role"){
    const {error}=await db.from("studio_memberships").update({role:p.role}).eq("id",target.id).eq("studio_account_id",targetStudio).is("revoked_at",null);
    if(error)return json(503,{error:"Studio member role could not be updated."});
    await db.from("audit_logs").insert({user_id:user.id,action:"studio.member.role_updated",entity_type:"studio_membership",entity_id:target.id,new_data:{role:p.role}});
    return json(200,{success:true,status:"UPDATED",role:p.role});
   }
   const {error}=await db.from("studio_memberships").update({revoked_at:new Date().toISOString()}).eq("id",target.id).eq("studio_account_id",targetStudio).is("revoked_at",null);
   if(error)return json(503,{error:"Studio membership could not be revoked."});
   await db.from("audit_logs").insert({user_id:user.id,action:"studio.member.revoked",entity_type:"studio_membership",entity_id:target.id});
   return json(200,{success:true,status:"REVOKED"});
  }
  if(p.action==="accept_invitation"||p.action==="reject_invitation"){
   let invitationQuery=db.from("studio_invitations").select("id,studio_account_id,email,invited_user_id,role,invited_by,expires_at,accepted_at,revoked_at");
   if(p.token)invitationQuery=invitationQuery.eq("token_hash",await hash(p.token));else if(p.invitationId)invitationQuery=invitationQuery.eq("id",p.invitationId);else return json(400,{error:"Invitation token or ID is required."});
   const {data:inv,error}=await invitationQuery.maybeSingle();
   if(error||!inv||inv.revoked_at||inv.accepted_at||Date.parse(inv.expires_at)<Date.now())return json(404,{error:"Invitation is invalid, expired, or already used."});
   if(inv.invited_user_id&&inv.invited_user_id!==user.id)return json(403,{error:"This invitation belongs to another account."});
   if(inv.email.toLowerCase()!==String(user.email??"").toLowerCase())return json(403,{error:"Sign in using the invited email address."});
   if(p.action==="reject_invitation"){
    const {error:updateError}=await db.from("studio_invitations").update({revoked_at:new Date().toISOString()}).eq("id",inv.id).is("accepted_at",null).is("revoked_at",null);
    return updateError?json(503,{error:"Invitation could not be declined."}):json(200,{success:true,status:"DECLINED"});
   }
   const {data:accepted,error:acceptError}=await db.rpc("accept_studio_invitation",{p_invitation_id:inv.id,p_user_id:user.id,p_email:String(user.email??"")});
   if(acceptError)return json(acceptError.code==="23514"?409:acceptError.code==="42501"?403:503,{error:acceptError.message==="studio_seat_limit_reached"?"The studio has no remaining team seats.":acceptError.message==="invitation_expired_or_revoked"?"The invitation has expired or been revoked.":"Invitation acceptance could not be finalized."});
   return json(200,accepted??{success:true,status:"ACCEPTED",studioAccountId:inv.studio_account_id,role:inv.role});
  }
  if(p.action==="revoke_invitation"){
   const {data:inv}=await db.from("studio_invitations").select("id,studio_account_id").eq("id",p.invitationId).is("accepted_at",null).is("revoked_at",null).maybeSingle();
   if(!inv)return json(404,{error:"Pending invitation not found."});
   const {data:studio}=await db.from("studio_accounts").select("user_id").eq("id",inv.studio_account_id).maybeSingle();
   const {data:membership}=await db.from("studio_memberships").select("role").eq("studio_account_id",inv.studio_account_id).eq("user_id",user.id).is("revoked_at",null).not("accepted_at","is",null).maybeSingle();
   if(studio?.user_id!==user.id&&!["OWNER","ADMIN"].includes(membership?.role))return json(403,{error:"Studio owner or administrator permission is required."});
   const {error}=await db.from("studio_invitations").update({revoked_at:new Date().toISOString()}).eq("id",inv.id);
   return error?json(503,{error:"Invitation could not be revoked."}):json(200,{success:true,status:"REVOKED"});
  }
  if(p.action==="record_content_rights"){
   const {data:content,error:contentError}=await db.from("content").select("id,creator_id,metadata").eq("id",p.contentId).eq("creator_id",user.id).maybeSingle();
   if(contentError||!content)return json(404,{error:"Production not found or not owned by this creator."});
   const {data:studio}=await db.from("studio_accounts").select("base_currency,status").eq("user_id",user.id).eq("status","approved").maybeSingle();
   if(!studio?.base_currency)return json(403,{error:"An approved creator account with an immutable base currency is required."});
   const declarationHash=await hash(JSON.stringify({...p.declaration,territories:[...p.declaration.territories].sort()}));
   const {error:insertError}=await db.from("content_rights_declarations").insert({content_id:content.id,creator_id:user.id,declaration:p.declaration,declaration_hash:declarationHash});
   if(insertError)return json(409,{error:"Immutable rights declaration could not be recorded."});
   const metadata={...(content.metadata??{}),creator_rights:p.declaration};
   const {error:updateError}=await db.from("content").update({creator_base_currency:studio.base_currency,content_format:p.declaration.contentFormat,territory_rights:{territories:p.declaration.territories,rightsType:p.declaration.rightsType},rights_status:"DECLARED",metadata}).eq("id",content.id).eq("creator_id",user.id);
   if(updateError)return json(503,{error:"Rights declaration was recorded but content metadata requires reconciliation."});
   return json(200,{success:true,rightsStatus:"DECLARED",baseCurrency:studio.base_currency,declarationHash});
  }
  const {data:caseRow}=await db.from("creator_verification_cases").select("id,user_id,status").eq("id",p.caseId).eq("user_id",user.id).maybeSingle();
  if(!caseRow||!["REJECTED","SUSPENDED"].includes(caseRow.status))return json(409,{error:"Only rejected or suspended creator cases can be appealed."});
  const now=new Date().toISOString();
  const {error:updateError}=await db.from("creator_verification_cases").update({status:"APPEAL_PENDING",appeal_reason:p.reason,updated_at:now}).eq("id",caseRow.id).eq("user_id",user.id);
  if(updateError)return json(503,{error:"Appeal could not be submitted."});
  const {error:studioError}=await db.from("studio_accounts").update({verification_status:"APPEAL_PENDING"}).eq("user_id",user.id);
  if(studioError)return json(503,{error:"Appeal was saved but creator account status needs reconciliation."});
  const {error:auditError}=await db.from("creator_verification_audit").insert({case_id:caseRow.id,actor_id:user.id,action:"appeal_submitted",from_status:caseRow.status,to_status:"APPEAL_PENDING",details:{reason:p.reason}});
  if(auditError)return json(503,{error:"Appeal saved but audit append failed."});
  return json(202,{success:true,status:"APPEAL_PENDING",caseId:caseRow.id});
 }
 if(i.success){
  const p=i.data,{data:studio,error}=await db.from("studio_accounts").select("id,user_id,status,seats").eq("id",p.studioAccountId).maybeSingle();
  if(error||!studio)return json(404,{error:"Studio account not found."});
  const {data:membership}=await db.from("studio_memberships").select("role").eq("studio_account_id",studio.id).eq("user_id",user.id).is("revoked_at",null).not("accepted_at","is",null).maybeSingle();
  if(studio.user_id!==user.id&&!["OWNER","ADMIN"].includes(membership?.role))return json(403,{error:"Only a studio owner or administrator can invite members."});
  if(studio.status!=="approved")return json(409,{error:"Studio must be approved before team invitations can be issued."});
  let invitedUserId=p.userId??null,email=p.email?.toLowerCase()??null;
  if(invitedUserId){const {data:target,error:targetError}=await db.auth.admin.getUserById(invitedUserId);if(targetError||!target.user?.email)return json(404,{error:"The invited account could not be found."});email=target.user.email.toLowerCase();}
  else if(email){const {data:users}=await db.auth.admin.listUsers({page:1,perPage:1000});invitedUserId=users?.users.find(u=>u.email?.toLowerCase()===email)?.id??null;}
  if(!email)return json(422,{error:"A valid invitee email is required."});
  const {data:duplicate}=await db.from("studio_invitations").select("id").eq("studio_account_id",studio.id).eq("email",email).is("accepted_at",null).is("revoked_at",null).gt("expires_at",new Date().toISOString()).maybeSingle();
  if(duplicate)return json(409,{error:"A pending invitation already exists for this email."});
  const [{count:memberCount},{count:pendingCount}]=await Promise.all([
   db.from("studio_memberships").select("id",{count:"exact",head:true}).eq("studio_account_id",studio.id).is("revoked_at",null).not("accepted_at","is",null),
   db.from("studio_invitations").select("id",{count:"exact",head:true}).eq("studio_account_id",studio.id).is("accepted_at",null).is("revoked_at",null).gt("expires_at",new Date().toISOString())
  ]);
  if(Number(memberCount??0)+Number(pendingCount??0)>=Number(studio.seats??1))return json(409,{error:"The studio has no unallocated team seats. Upgrade its seat allowance before inviting another member."});
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
 if(p.identityVerificationId){const {data:identity}=await db.from("identity_verifications").select("id,status").eq("id",p.identityVerificationId).eq("user_id",user.id).maybeSingle();if(!identity||identity.status!=="verified")return json(422,{error:"A verified identity record belonging to this account is required."});}
 if(p.businessVerificationId){const {data:business}=await db.from("business_verifications").select("id,status").eq("id",p.businessVerificationId).eq("user_id",user.id).maybeSingle();if(!business||!["pending","processing","verified"].includes(business.status))return json(422,{error:"The KYB evidence record does not belong to this account or is not active."});}
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