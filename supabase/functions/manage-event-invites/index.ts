import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body=z.discriminatedUnion("action",[
 z.object({action:z.literal("create"),screeningId:z.string().uuid(),email:z.string().trim().email().max(254),role:z.enum(["guest","press","reviewer","vip","crew"]).default("guest"),expiresAt:z.string().datetime({offset:true}).optional()}).strict(),
 z.object({action:z.literal("accept"),token:z.string().min(32).max(128)}).strict(),
 z.object({action:z.literal("revoke"),screeningId:z.string().uuid(),inviteId:z.string().uuid()}).strict(),
 z.object({action:z.literal("list"),screeningId:z.string().uuid()}).strict(),
 z.object({action:z.literal("my_invitations")}).strict(),
]);
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,"0")).join("");
const hash=async(v:string)=>hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)));
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,"0")).join("");
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]??c));

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 const auth=req.headers.get("Authorization")||"";
 if(!url||!service||!anon||!auth.startsWith("Bearer "))return json(401,{error:"Sign in to manage event invitations."});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await admin.auth.getUser(auth.slice(7));
 if(userError||!user||!user.email)return json(401,{error:"Your sign-in session is invalid."});
 const parsed=Body.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{error:"Invalid event invitation request."});
 const p=parsed.data;

 if(p.action==="accept"){
  const digest=await hash(p.token);
  const {data:invite,error}=await admin.from("event_access_invites").select("id,screening_id,live_stream_id,invited_email,status,expires_at").eq("token_hash",digest).maybeSingle();
  if(error||!invite)return json(404,{error:"Invitation not found or no longer valid."});
  if(invite.status==="revoked"||invite.status==="expired"||(invite.expires_at&&Date.parse(invite.expires_at)<=Date.now()))return json(410,{error:"This invitation has expired or was revoked."});
  if(invite.status==="accepted")return json(200,{success:true,alreadyAccepted:true,screeningId:invite.screening_id});
  if(invite.invited_email.toLowerCase()!==user.email.toLowerCase())return json(403,{error:"Sign in with the email address that received this invitation."});
  const {data:accepted,error:acceptError}=await admin.from("event_access_invites").update({status:"accepted",invited_user_id:user.id,accepted_at:new Date().toISOString()}).eq("id",invite.id).in("status",["pending","sent"]).select("id").maybeSingle();
  if(acceptError||!accepted)return json(409,{error:"Invitation could not be accepted. It may have already changed."});
  return json(200,{success:true,screeningId:invite.screening_id,liveStreamId:invite.live_stream_id});
 }

 if(p.action==="my_invitations"){
  const [byUser,byEmail]=await Promise.all([
   admin.from("event_access_invites").select("id,screening_id,live_stream_id,invite_role,status,expires_at,accepted_at,created_at").eq("invited_user_id",user.id).in("status",["pending","sent","accepted"]).order("created_at",{ascending:false}).limit(100),
   admin.from("event_access_invites").select("id,screening_id,live_stream_id,invite_role,status,expires_at,accepted_at,created_at").eq("invited_email",user.email.toLowerCase()).in("status",["pending","sent","accepted"]).order("created_at",{ascending:false}).limit(100)
  ]);
  if(byUser.error||byEmail.error)return json(503,{error:"Your invitations could not be loaded."});
  const rows=[...new Map([...(byUser.data||[]),...(byEmail.data||[])].map(r=>[r.id,r])).values()];
  const ids=rows.map(r=>r.screening_id).filter(Boolean);
  const {data:events}=ids.length?await admin.from("screenings").select("id,title,slug,poster_url,screening_date,event_timezone,event_visibility").in("id",ids):{data:[]};
  const byId=new Map((events||[]).map(e=>[e.id,e]));
  return json(200,{invitations:rows.map(r=>({...r,event:r.screening_id?byId.get(r.screening_id)||null:null}))});
 }

 const {data:screening,error:screeningError}=await admin.from("screenings").select("id,tenant_id,title,slug,content_id,status").eq("id",p.screeningId).maybeSingle();
 if(screeningError||!screening)return json(404,{error:"Event not found."});
 const {data:content}=await admin.from("content").select("creator_id").eq("id",screening.content_id).maybeSingle();
 const {data:isAdmin}=await admin.rpc("is_super_admin",{_user_id:user.id});
 if(!isAdmin&&content?.creator_id!==user.id)return json(403,{error:"Only the event owner or an authorized administrator can manage invitations."});

 if(p.action==="list"){
  const {data:rows,error}=await admin.from("event_access_invites").select("id,invited_email,invited_user_id,invite_role,status,expires_at,accepted_at,created_at").eq("screening_id",p.screeningId).order("created_at",{ascending:false});
  if(error)return json(503,{error:"Event invitations could not be loaded."});
  return json(200,{invitations:rows||[]});
 }
 if(p.action==="revoke"){
  const {data:row,error}=await admin.from("event_access_invites").update({status:"revoked"}).eq("id",p.inviteId).eq("screening_id",p.screeningId).in("status",["pending","sent","accepted"]).select("id").maybeSingle();
  if(error||!row)return json(404,{error:"Active invitation not found."});
  await admin.from("audit_logs").insert({user_id:user.id,action:"event_invitation_revoked",entity_type:"event_access_invite",entity_id:p.inviteId,new_data:{screening_id:p.screeningId}});
  return json(200,{success:true,revoked:true});
 }

 const normalizedEmail=p.email.toLowerCase();
 const expiresAt=p.expiresAt?new Date(p.expiresAt):new Date(Date.now()+30*24*60*60*1000);
 if(expiresAt.getTime()<=Date.now()||expiresAt.getTime()>Date.now()+365*24*60*60*1000)return json(422,{error:"Invitation expiry must be in the future and within one year."});
 const {data:siteSetting}=await admin.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
 let origin:string;
 try{const site=new URL(String(siteSetting?.setting_value||""));if(siteSetting?.is_public!==true||site.protocol!=="https:"||site.username||site.password)throw new Error();origin=site.origin;}catch{return json(503,{error:"The canonical public site URL is not configured."});}
 const rawToken=token(),tokenHash=await hash(rawToken);
 const {data:invite,error:insertError}=await admin.from("event_access_invites").insert({
  tenant_id:screening.tenant_id,screening_id:screening.id,invited_email:normalizedEmail,
  invite_role:p.role,token_hash:tokenHash,status:"pending",invited_by:user.id,expires_at:expiresAt.toISOString()
 }).select("id,invited_email,invite_role,status,expires_at").single();
 if(insertError||!invite)return json(503,{error:"Invitation could not be created."});
 const acceptUrl=new URL("/event-invite/accept?token="+encodeURIComponent(rawToken),origin).toString();
 const subject="You are invited to "+screening.title+" on DeGameTV";
 const html="<p>You have been invited to <strong>"+escape(screening.title)+"</strong> as a "+escape(p.role)+".</p><p><a href=\""+escape(acceptUrl)+"\">Accept your invitation</a></p><p>This invitation expires "+escape(expiresAt.toISOString())+".</p>";
 const idempotencyKey="event-invite-"+invite.id;
 const {error:outboxError}=await admin.from("event_notification_outbox").insert({
  tenant_id:screening.tenant_id,screening_id:screening.id,recipient_email:normalizedEmail,
  notification_type:"event_invitation",idempotency_key:idempotencyKey,
  payload:{invite_id:invite.id,subject,html,text:"Accept your DeGameTV invitation: "+acceptUrl},
  scheduled_for:new Date().toISOString(),status:"pending"
 });
 if(outboxError){
  await admin.from("event_access_invites").update({status:"revoked"}).eq("id",invite.id);
  return json(503,{error:"Invitation was not queued for delivery."});
 }
 const dispatch=await fetch(url+"/functions/v1/dispatch-email",{method:"POST",headers:{Authorization:"Bearer "+service,apikey:service,"Content-Type":"application/json"},body:JSON.stringify({messages:[{to:normalizedEmail,subject,html,text:"Accept your DeGameTV invitation: "+acceptUrl,idempotencyKey}]}),signal:AbortSignal.timeout(20000)}).catch(()=>null);
 const result=dispatch?await dispatch.json().catch(()=>null):null;
 const sent=Boolean(dispatch?.ok&&result?.sent===1);
 if(sent){
  await admin.from("event_access_invites").update({status:"sent"}).eq("id",invite.id).eq("status","pending");
  await admin.from("event_notification_outbox").update({status:"sent",sent_at:new Date().toISOString()}).eq("idempotency_key",idempotencyKey);
 }
 await admin.from("audit_logs").insert({user_id:user.id,action:"event_invitation_created",entity_type:"event_access_invite",entity_id:invite.id,new_data:{screening_id:screening.id,invite_role:p.role,delivery:sent?"sent":"queued"}});
 return json(200,{success:true,invitation:invite,delivery:sent?"sent":"queued"});
});