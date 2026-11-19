import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("create_upload"),fileName:z.string().trim().min(1).max(240),contentType:z.string().min(1).max(120),sizeBytes:z.number().int().positive().max(20*1024*1024*1024),contentId:z.string().uuid().optional()}),
 z.object({action:z.literal("create_live"),screeningId:z.string().uuid(),title:z.string().trim().min(2).max(180),description:z.string().max(2000).optional(),scheduledStart:z.string().datetime({offset:true}).optional(),recordingEnabled:z.boolean().default(true)}),
 z.object({action:z.literal("stop_live"),streamId:z.string().uuid()}),
]);
async function featureEnabled(db: ReturnType<typeof createClient>, key: string, subject: string): Promise<boolean> {
 const {data:flag,error}=await db.from("platform_feature_controls").select("enabled,rollout_percentage,release_state").eq("feature_key",key).maybeSingle();
 if(error)return false;
 if(!flag)return true;
 if(!flag.enabled||["draft","paused","rolled_back"].includes(flag.release_state))return false;
 if(flag.release_state==="released")return flag.rollout_percentage===100;
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(subject+":"+key));
 return new DataView(digest).getUint32(0,false)%100<flag.rollout_percentage;
}
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
 if(p.action==="create_live"&&!await featureEnabled(db,"creator.live",user.id))return json({error:"Live creation is currently unavailable for this release cohort."},403);
 const capability=p.action==="create_live"||p.action==="stop_live"?"live_streaming":"video_delivery";
 const {data:providers,error:providerError}=await db.rpc("get_service_provider_runtime_config",{p_capability:capability});
 if(providerError||!Array.isArray(providers))return json({error:"Media provider registry is unavailable."},503);
 let provider=providers[0];
 const operation=p.action==="create_upload"?"upload_create":p.action==="create_live"?"live_create":"live_stop";
 let canonicalStream:any=null;
 if(p.action==="create_live"){
  const {data:screening,error:screeningError}=await db.from("screenings")
   .select("id,tenant_id,content_id,title,screening_date").eq("id",p.screeningId).eq("status","published").maybeSingle();
  if(screeningError||!screening)return json({error:"Published creator event not found."},404);
  const {data:ownedContent,error:contentError}=await db.from("content")
   .select("creator_id,tenant_id").eq("id",screening.content_id).maybeSingle();
  if(contentError||!ownedContent||ownedContent.creator_id!==user.id||ownedContent.tenant_id!==screening.tenant_id)return json({error:"You do not own this event in its tenant."},403);
  const {data:streamId,error:ensureError}=await db.rpc("ensure_screening_live_stream",{p_screening_id:p.screeningId});
  if(ensureError||!streamId)return json({error:"The canonical scheduled stream could not be prepared."},503);
  const {data:stream,error:streamError}=await db.from("live_streams").select("id,metadata,provider_stream_id,status").eq("id",streamId).eq("creator_id",user.id).maybeSingle();
  if(streamError||!stream)return json({error:"The canonical stream record could not be loaded."},503);
  if(stream.provider_stream_id||stream.metadata?.provider_reference)return json({error:"This event already has a provisioned encoder. Reconnect or rotate credentials through the stream controls instead of creating a second stream."},409);
  canonicalStream=stream;
 }
 try{
  if(p.action==="stop_live"){
   const {data:stream,error}=await db.from("live_streams").select("id,creator_id,metadata").eq("id",p.streamId).eq("creator_id",user.id).maybeSingle();
   if(error||!stream)return json({error:"Live stream not found."},404);
   const [{data:binding},{data:secrets}]=await Promise.all([
    db.from("service_provider_bindings").select("provider_key,base_url,endpoints,settings").eq("capability","live_streaming").eq("provider_key",stream.metadata?.provider).maybeSingle(),
    db.rpc("get_service_provider_admin_secret",{p_capability:"live_streaming",p_provider_key:stream.metadata?.provider})
   ]);
   const vault=Array.isArray(secrets)?secrets[0]:null,mode=stream.metadata?.provider_mode==="live"?"live":"test";
   const credential=mode==="live"?(vault?.live_credential||vault?.test_credential):(vault?.test_credential||vault?.live_credential);
   provider=binding?{...binding,credential}:null;
   if(!provider?.credential||!provider.endpoints?.live_stop)return json({error:"The provider that created this stream is no longer configured. Restore its Vault binding to stop it safely."},503);
   const response=await fetch(endpoint(provider.base_url,provider.endpoints.live_stop),{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+provider.credential},body:JSON.stringify({stream_id:p.streamId,provider_reference:stream.metadata?.provider_reference}),signal:AbortSignal.timeout(15000)});
   const result=await response.json().catch(()=>null);
   if(!response.ok||result?.stopped!==true)return json({error:"Provider could not confirm stream termination."},502);
   const endedAt=new Date().toISOString();
   const {data:endedStream,error:endError}=await db.from("live_streams")
    .update({status:"ended",lifecycle_status:"PROCESSING_REPLAY",actual_ended_at:endedAt,actual_end:endedAt,updated_at:endedAt})
    .eq("id",p.streamId).eq("creator_id",user.id)
    .select("id,tenant_id,creator_id,metadata").single();
   if(endError||!endedStream)return json({error:"Provider ended the stream, but DeGameTV could not reconcile its event record. Contact support before creating a replay."},503);

   // A confirmed end always creates a replay draft in the same creator catalogue.
   // Recording media is attached only when the provider returns a ready asset and
   // its URL origin is explicitly allowlisted by the provider binding.
   const screeningId=typeof endedStream.metadata?.screening_id==="string"?endedStream.metadata.screening_id:null;
   let replayDraft:{contentId:string;recordingStatus:string}|null=null;
   if(screeningId){
    const {data:screening}=await db.from("screenings").select("id,tenant_id,content_id")
     .eq("id",screeningId).eq("tenant_id",endedStream.tenant_id).maybeSingle();
    if(screening){
     const {data:content}=await db.from("content").select("id,creator_id,tenant_id,metadata")
      .eq("id",screening.content_id).eq("creator_id",user.id).eq("tenant_id",screening.tenant_id).maybeSingle();
     if(content){
      const providerAssetId=typeof result.recording_asset_id==="string"&&result.recording_asset_id.trim()?result.recording_asset_id.trim():null;
      const rawRecordingUrl=typeof result.recording_url==="string"?result.recording_url:null;
      let approvedRecordingUrl:string|null=null;
      if(rawRecordingUrl){
       try{
        const recordingUrl=new URL(rawRecordingUrl);
        const allowed=Array.isArray(binding?.settings?.allowed_recording_origins)?binding.settings.allowed_recording_origins:[];
        if(recordingUrl.protocol==="https:"&&allowed.includes(recordingUrl.origin))approvedRecordingUrl=recordingUrl.toString();
       }catch{/* untrusted provider URL is ignored */}
      }
      const recordingStatus=result.recording_status==="failed"?"failed":
       result.recording_status==="ready"&&approvedRecordingUrl?"ready":"processing";
      const {error:screeningUpdateError}=await db.from("screenings").update({
       lifecycle:"ended",live_ended_at:endedAt,live_recording_status:recordingStatus,
       live_provider_asset_id:providerAssetId,
       live_replay_ready_at:recordingStatus==="ready"?endedAt:null,updated_at:endedAt,
      }).eq("id",screening.id).eq("tenant_id",screening.tenant_id);
      if(recordingStatus==="ready"||recordingStatus==="failed"){
       const {error:replayLifecycleError}=await db.rpc("apply_stream_provider_event",{
        p_provider_key:String(endedStream.metadata?.provider||""),
        p_provider_reference:String(endedStream.metadata?.provider_reference||""),
        p_event_id:`stop-response:${endedStream.id}:${providerAssetId||endedAt}`,
        p_event_type:recordingStatus==="ready"?"recording.ready":"recording.failed",
        p_payload:recordingStatus==="ready"&&approvedRecordingUrl
         ? {replay_url:approvedRecordingUrl,source_event:"stop_live_response"}
         : {source_event:"stop_live_response"},
       });
       if(replayLifecycleError){
        console.error("live_replay_lifecycle_reconcile",replayLifecycleError);
        return json({error:"The provider stopped the stream, but replay lifecycle reconciliation failed. The event remains in processing."},503);
       }
      }
      const metadata={...(content.metadata&&typeof content.metadata==="object"?content.metadata:{}),
       content_context:"vod",release_strategy:"on_demand",
       replay_from_live:{source_screening_id:screening.id,source_stream_id:endedStream.id,
        provider:stream.metadata?.provider??null,provider_asset_id:providerAssetId,
        recording_status:recordingStatus,ended_at:endedAt}};
      const contentUpdate:{type:"vod";status:"draft";metadata:Record<string,unknown>;video_url?:string}={
       type:"vod",status:"draft",metadata,
      };
      if(approvedRecordingUrl)contentUpdate.video_url=approvedRecordingUrl;
      const {error:contentUpdateError}=await db.from("content").update(contentUpdate)
       .eq("id",content.id).eq("creator_id",user.id).eq("tenant_id",content.tenant_id);
      if(!screeningUpdateError&&!contentUpdateError)replayDraft={contentId:content.id,recordingStatus};
     }
    }
   }
   return json({success:true,status:"ended",replayDraft,
    message:replayDraft?"Replay draft added to your creator catalogue.":"Stream ended; replay draft could not be reconciled automatically."});
  }
  if(!providers.length)return json({error:"No active provider is configured for this media capability."},503);
  const payload=p.action==="create_upload"
   ? {owner_id:user.id,file_name:p.fileName,content_type:p.contentType,size_bytes:p.sizeBytes,content_id:p.contentId??null,transcode:true,delivery_profile:"adaptive"}
   : {owner_id:user.id,title:p.title,description:p.description??null,scheduled_start:p.scheduledStart??null,recording_enabled:p.recordingEnabled,screening_id:p.screeningId,stream_id:canonicalStream?.id??null};
  let response:Response|null=null,result:any=null;
  for(const candidate of providers){
   if(!candidate.credential||!candidate.endpoints?.[operation])continue;
   try{
    const attempt=await fetch(endpoint(candidate.base_url,candidate.endpoints[operation]),{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+candidate.credential},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
    const body=await attempt.json().catch(()=>null);
    if(attempt.ok&&body){provider=candidate;response=attempt;result=body;break;}
   }catch{continue;}
  }
  if(!response||!result)return json({error:"No configured media provider could provision this resource. Check provider health and contracts."},502);
  if(p.action==="create_upload"){
   let uploadUrl:URL;try{uploadUrl=new URL(result.upload_url);if(uploadUrl.protocol!=="https:")throw new Error();}catch{return json({error:"Media provider returned an invalid upload URL."},502);}
   const allowed=Array.isArray(provider.settings?.allowed_upload_origins)?provider.settings.allowed_upload_origins:[];
   if(!allowed.includes(uploadUrl.origin)||typeof result.asset_id!=="string"||!result.asset_id)return json({error:"Media provider upload origin or asset contract is not approved."},502);
   return json({success:true,assetId:result.asset_id,uploadUrl:uploadUrl.toString(),uploadHeaders:result.upload_headers&&typeof result.upload_headers==="object"?result.upload_headers:{},expiresAt:result.expires_at??null,transcoding:"provider_managed"});
  }
  if(typeof result.provider_reference!=="string"||typeof result.ingest_url!=="string"||typeof result.stream_key!=="string"||!result.stream_key.trim())return json({error:"Media provider returned an incomplete live-stream contract."},502);
  let ingest:URL;try{ingest=new URL(result.ingest_url);if(ingest.protocol!=="rtmp:"&&ingest.protocol!=="rtmps:")throw new Error();}catch{return json({error:"Provider returned an invalid ingest endpoint."},502);}
  if(!canonicalStream)return json({error:"The canonical scheduled stream record is missing."},503);
  const streamMetadata={...(canonicalStream.metadata&&typeof canonicalStream.metadata==="object"?canonicalStream.metadata:{}),
   provider:provider.provider_key,provider_mode:provider.is_live===true?"live":"test",
   provider_reference:result.provider_reference,screening_id:p.screeningId,
   provisioned_at:new Date().toISOString(),stream_key_delivery:"one_time"};
  const {data:stream,error:insertError}=await db.from("live_streams").update({
   status:"scheduled",lifecycle_status:"WAITING_FOR_ENCODER",provider_stream_id:result.provider_reference,
   stream_key:null,rtmp_url:ingest.toString(),rtmp_ingest_url:ingest.toString(),
   playback_url:typeof result.playback_url==="string"?result.playback_url:null,
   recording_enabled:p.recordingEnabled,metadata:streamMetadata,updated_at:new Date().toISOString(),
  }).eq("id",canonicalStream.id).eq("creator_id",user.id).select("id").single();
  if(insertError||!stream){console.error("live_stream_reconcile",insertError);return json({error:"The provider created an ingest, but DeGameTV could not reconcile it to the canonical event record. Contact support before retrying."},503);}
  return json({success:true,streamId:stream.id,ingestUrl:ingest.toString(),streamKey:result.stream_key,playbackUrl:result.playback_url??null,ingestProtocol:ingest.protocol.slice(0,-1),provider:provider.provider_key,credentialDelivery:"one_time"});
 }catch(e){console.error("media-provider-control",e);return json({error:"Media provider request failed."},502);}
});