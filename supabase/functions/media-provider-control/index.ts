import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("create_upload"),fileName:z.string().trim().min(1).max(240),contentType:z.string().min(1).max(120),sizeBytes:z.number().int().positive().max(20*1024*1024*1024),contentId:z.string().uuid().optional()}),
 z.object({action:z.literal("create_live"),screeningId:z.string().uuid(),title:z.string().trim().min(2).max(180),description:z.string().max(2000).optional(),scheduledStart:z.string().datetime({offset:true}).optional(),recordingEnabled:z.boolean().default(true)}),
 z.object({action:z.literal("stop_live"),streamId:z.string().uuid()}),
]);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
const endpoint=(base:string,path:unknown)=>{if(typeof path!=="string"||!path.startsWith("/")||path.startsWith("//"))throw new Error("provider_endpoint_missing");const u=new URL(path,base);if(u.origin!==new URL(base).origin)throw new Error("provider_endpoint_invalid");return u;};
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization");
 if(!url||!anon||!service||!authorization?.startsWith("Bearer "))return json({error:"Media service unavailable."},503);
 const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await caller.auth.getUser();
 if(authError||!user)return json({error:"Authentication required."},401);
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json({error:"Invalid media operation.",details:parsed.error.flatten()},400);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:approved}=await db.rpc("is_approved_creator",{p_user_id:user.id});
 if(!approved)return json({error:"Approved creator access is required."},403);
 const p=parsed.data;
 const capability=p.action==="create_live"||p.action==="stop_live"?"live_streaming":"video_delivery";
 const {data:providers,error:providerError}=await db.rpc("get_service_provider_runtime_config",{p_capability:capability});
 if(providerError||!Array.isArray(providers)||!providers.length)return json({error:"No active provider is configured for this media capability."},503);
 const provider=providers[0];
 const operation=p.action==="create_upload"?"upload_create":p.action==="create_live"?"live_create":"live_stop";
 if(!provider.credential||!provider.endpoints?.[operation])return json({error:"The active provider is missing the required operation contract."},503);
 try{
  if(p.action==="stop_live"){
   const {data:stream,error}=await db.from("live_streams").select("id,creator_id,metadata").eq("id",p.streamId).eq("creator_id",user.id).maybeSingle();
   if(error||!stream)return json({error:"Live stream not found."},404);
   const response=await fetch(endpoint(provider.base_url,provider.endpoints.live_stop),{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+provider.credential},body:JSON.stringify({stream_id:p.streamId,provider_reference:stream.metadata?.provider_reference}),signal:AbortSignal.timeout(15000)});
   const result=await response.json().catch(()=>null);
   if(!response.ok||result?.stopped!==true)return json({error:"Provider could not confirm stream termination."},502);
   await db.from("live_streams").update({status:"ended",actual_end:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",p.streamId);
   return json({success:true,status:"ended"});
  }
  const payload=p.action==="create_upload"
   ? {owner_id:user.id,file_name:p.fileName,content_type:p.contentType,size_bytes:p.sizeBytes,content_id:p.contentId??null,transcode:true,delivery_profile:"adaptive"}
   : {owner_id:user.id,title:p.title,description:p.description??null,scheduled_start:p.scheduledStart??null,recording_enabled:p.recordingEnabled};
  const response=await fetch(endpoint(provider.base_url,provider.endpoints[operation]),{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+provider.credential},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result)return json({error:"Media provider could not provision the requested resource."},502);
  if(p.action==="create_upload"){
   let uploadUrl:URL;try{uploadUrl=new URL(result.upload_url);if(uploadUrl.protocol!=="https:")throw new Error();}catch{return json({error:"Media provider returned an invalid upload URL."},502);}
   const allowed=Array.isArray(provider.settings?.allowed_upload_origins)?provider.settings.allowed_upload_origins:[];
   if(!allowed.includes(uploadUrl.origin)||typeof result.asset_id!=="string"||!result.asset_id)return json({error:"Media provider upload origin or asset contract is not approved."},502);
   return json({success:true,assetId:result.asset_id,uploadUrl:uploadUrl.toString(),uploadHeaders:result.upload_headers&&typeof result.upload_headers==="object"?result.upload_headers:{},expiresAt:result.expires_at??null,transcoding:"provider_managed"});
  }
  if(typeof result.provider_reference!=="string"||typeof result.ingest_url!=="string"||typeof result.stream_key!=="string"||!result.stream_key.trim())return json({error:"Media provider returned an incomplete live-stream contract."},502);
  let ingest:URL;try{ingest=new URL(result.ingest_url);if(ingest.protocol!=="rtmp:"&&ingest.protocol!=="rtmps:")throw new Error();}catch{return json({error:"Provider returned an invalid ingest endpoint."},502);}
  const {data:screening,error:screeningError}=await db.from("screenings").select("id,tenant_id,content:content!inner(creator_id)").eq("id",p.screeningId).maybeSingle();
  if(screeningError||!screening)return json({error:"Creator event not found."},404);
  const ownedContent=screening.content as unknown as {creator_id:string|null};
  if(ownedContent?.creator_id!==user.id)return json({error:"You do not own this event."},403);
  const {data:membership,error:membershipError}=await db.from("user_roles").select("tenant_id").eq("user_id",user.id).eq("role","creator").eq("tenant_id",screening.tenant_id).maybeSingle();
  if(membershipError||!membership?.tenant_id)return json({error:"Your creator account is not authorized for this event tenant."},403);
  const {data:stream,error:insertError}=await db.from("live_streams").insert({
   tenant_id:screening.tenant_id,creator_id:user.id,title:p.title,description:p.description??null,status:"scheduled",
   stream_key:null,rtmp_url:ingest.toString(),playback_url:typeof result.playback_url==="string"?result.playback_url:null,
   scheduled_start:p.scheduledStart??null,recording_enabled:p.recordingEnabled,
   monetization:"free",ticket_price:0,is_ticketed:false,
   metadata:{provider:provider.provider_key,provider_reference:result.provider_reference,screening_id:p.screeningId,provisioned_at:new Date().toISOString(),stream_key_delivery:"one_time"},
  }).select("id").single();
  if(insertError||!stream){console.error("live_stream_insert",insertError);return json({error:"Live stream was provisioned but could not be reconciled to the creator account."},503);}
  return json({success:true,streamId:stream.id,ingestUrl:ingest.toString(),streamKey:result.stream_key,playbackUrl:result.playback_url??null,ingestProtocol:ingest.protocol.slice(0,-1),provider:provider.provider_key,credentialDelivery:"one_time"});
 }catch(e){console.error("media-provider-control",e);return json({error:"Media provider request failed."},502);}
});