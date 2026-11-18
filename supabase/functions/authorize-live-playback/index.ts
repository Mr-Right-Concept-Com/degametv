import {serve} from "https://deno.land/std@0.168.0/http/server.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.87.1";
import {z} from "npm:zod@3.25.76";
const schema=z.object({streamId:z.string().uuid(),mode:z.enum(["live","replay"])}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,x-client-info,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const sha256=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,"0")).join("");
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed"});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),auth=req.headers.get("Authorization")||"";
 if(!url||!anon||!service||!auth.startsWith("Bearer "))return json(401,{error:"Authentication required"});
 const input=schema.safeParse(await req.json().catch(()=>null));if(!input.success)return json(400,{error:"Invalid playback request"});
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return json(401,{error:"Authentication required"});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:stream,error:streamError}=await db.from("live_streams").select("id,tenant_id,creator_id,status,playback_url,metadata").eq("id",input.data.streamId).maybeSingle();
  if(streamError||!stream)return json(404,{error:"Stream not found"});
  const screeningId=typeof stream.metadata?.screening_id==="string"?stream.metadata.screening_id:null;
  if(!screeningId)return json(409,{error:"This stream is not linked to a canonical screening"});
  const {data:screening,error:screeningError}=await db.from("screenings").select("id,status,live_recording_status,live_replay_ready_at").eq("id",screeningId).eq("tenant_id",stream.tenant_id).maybeSingle();
  if(screeningError||!screening)return json(404,{error:"Screening not found"});
  if(input.data.mode==="live"&&stream.status!=="live")return json(409,{error:"This stream is not live"});
  if(input.data.mode==="replay"&&(screening.live_recording_status!=="ready"||!screening.live_replay_ready_at))return json(409,{error:"Replay is not ready"});
  const {data:tickets,error:ticketError}=await db.from("tickets").select("id,ticket_type,valid_from,valid_until,revoked_at,stream_count").eq("stream_id",stream.id).eq("user_id",user.id).is("revoked_at",null).lte("valid_from",new Date().toISOString()).gt("valid_until",new Date().toISOString()).order("created_at",{ascending:false});
  if(ticketError)return json(503,{error:"Ticket entitlement could not be checked"});
  const entitlement=tickets?.find(ticket=>{
   const kind=String(ticket.ticket_type||"");
   const correct=input.data.mode==="live"?["live","combo","premiere"].includes(kind):["replay","combo","vod"].includes(kind);
   return correct&&new Date(ticket.valid_until).getTime()>Date.now();
  });
  if(!entitlement)return json(403,{error:"A valid paid ticket for this event is required"});
  const providerKey=typeof stream.metadata?.provider==="string"?stream.metadata.provider:"";
  if(!providerKey)return json(503,{error:"This stream has no pinned delivery provider"});
  const [{data:binding,error:bindingError},{data:secrets,error:secretError}]=await Promise.all([
   db.from("service_provider_bindings").select("provider_key,base_url,endpoints,settings").eq("capability","live_streaming").eq("provider_key",providerKey).maybeSingle(),
   db.rpc("get_service_provider_admin_secret",{p_capability:"live_streaming",p_provider_key:providerKey})
  ]);
  const vault=Array.isArray(secrets)?secrets[0]:null,mode=stream.metadata?.provider_mode==="live"?"live":"test";
  const credential=mode==="live"?vault?.live_credential:vault?.test_credential;
  if(bindingError||secretError||!binding||!credential)return json(503,{error:"The stream's pinned provider credentials are unavailable"});
  const path=binding.endpoints?.playback_authorize;
  if(typeof path!=="string"||!path.startsWith("/")||path.startsWith("//"))return json(503,{error:"Playback authorization adapter is incomplete"});
  const endpoint=new URL(path,binding.base_url);if(endpoint.origin!==new URL(binding.base_url).origin)return json(503,{error:"Invalid playback endpoint"});
  const header=typeof binding.settings?.credential_header==="string"?binding.settings.credential_header:"Authorization";
  const prefix=typeof binding.settings?.credential_prefix==="string"?binding.settings.credential_prefix:"Bearer ";
  const rawSession=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
  const tokenHash=await sha256(rawSession);
  const response=await fetch(endpoint,{method:"POST",headers:{[header]:prefix+credential,"Content-Type":"application/json"},body:JSON.stringify({entitlement:{ticket_id:entitlement.id,screening_id:screening.id,stream_id:stream.id,user_id:user.id,mode,valid_until:entitlement.valid_until},asset:{provider_reference:stream.metadata?.provider_reference,recording_asset_id:stream.metadata?.recording_asset_id??null,playback_url:stream.playback_url},session:{token_hash:tokenHash,issued_at:new Date().toISOString()},request:{country:req.headers.get("cf-ipcountry")||null}}),signal:AbortSignal.timeout(12000)});
  const grant=await response.json().catch(()=>null);
  if(!response.ok||grant?.authorized!==true||typeof grant.playback_url!=="string"||typeof grant.expires_at!=="string")return json(503,{error:"Provider refused playback authorization"});
  const playback=new URL(grant.playback_url),grantExpiry=new Date(grant.expires_at);
  const origins=Array.isArray(binding.settings?.allowed_playback_origins)?binding.settings.allowed_playback_origins:[];
  if(playback.protocol!=="https:"||!origins.includes(playback.origin)||!Number.isFinite(grantExpiry.getTime())||grantExpiry.getTime()<=Date.now()||grantExpiry.getTime()>Date.now()+3600000)return json(502,{error:"Provider returned an invalid playback grant"});
  const {data:sessions,error:sessionError}=await userClient.rpc("authorize_screening_ticket_playback",{p_screening_id:screening.id,p_session_token_hash:tokenHash,p_country_code:req.headers.get("cf-ipcountry")||null,p_mode:input.data.mode});
  if(sessionError||!Array.isArray(sessions)||!sessions[0])return json(403,{error:sessionError?.message||"Ticket access or playback limits prevented this session"});
  const session=sessions[0];
  if(grantExpiry.getTime()>new Date(session.session_expires_at).getTime())return json(502,{error:"Provider grant exceeds the authorized ticket session window"});
  return json(200,{success:true,playbackUrl:playback.toString(),expiresAt:grantExpiry.toISOString(),sessionToken:rawSession});
 }catch{return json(502,{error:"Playback authorization failed"});}
});
