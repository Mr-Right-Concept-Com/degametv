import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders={
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, cf-ipcountry",
 "Access-Control-Allow-Methods":"POST,OPTIONS",
 "Content-Type":"application/json",
};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:corsHeaders});
type PlaybackProvider = {
 id: string;
 provider_key: string;
 base_url: string;
 credential: string;
 endpoints: Record<string, unknown>;
 settings: Record<string, unknown>;
};
const isRecord=(value:unknown):value is Record<string,unknown> =>
 value!==null&&typeof value==="object"&&!Array.isArray(value);
const isStringArray=(value:unknown):value is string[] =>
 Array.isArray(value)&&value.every((item:unknown)=>typeof item==="string");
const isPlaybackProvider=(value:unknown):value is PlaybackProvider =>
 isRecord(value)&&typeof value.id==="string"&&typeof value.provider_key==="string"&&
 typeof value.base_url==="string"&&typeof value.credential==="string"&&
 isRecord(value.endpoints)&&isRecord(value.settings);

const sha256=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,"0")).join("");

if(import.meta.main)serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json(405,{success:false,error:"Method not allowed"});
 try{
  const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!service)return json(503,{success:false,error:"Playback authorization is temporarily unavailable."});
  const body=await req.json().catch(()=>null);
  const watchCode=typeof body?.watchCode==="string"?body.watchCode.trim():"";
  const email=typeof body?.email==="string"?body.email.trim().toLowerCase():"";
  const sessionId=typeof body?.sessionId==="string"?body.sessionId.trim():"";
  if(!watchCode||!email||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId))
   return json(400,{success:false,error:"Watch code, ticket email and playback session are required."});

  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const country=(req.headers.get("cf-ipcountry")||"").toUpperCase().slice(0,2)||null;
  const {data:ticket,error}=await db.from("screening_tickets")
   .select("id,user_id,payment_status,refunded_at,expires_at,screening_id,email,stream_count,first_played_at,access_hours,screening:screenings(id,status,lifecycle,title,poster_url,content_id,allowed_countries,blocked_countries,event_visibility,invite_only,max_streams_per_ticket,max_concurrent_streams)")
   .eq("watch_code",watchCode).maybeSingle();
  if(error)return json(503,{success:false,error:"Playback authorization could not be checked. Please retry."});
  if(!ticket)return json(404,{success:false,error:"Ticket not found or payment not confirmed."});
  const {data:paymentOrder,error:orderError}=await db.from("guest_payment_orders").select("status").eq("ticket_id",ticket.id).maybeSingle();
  if(orderError)return json(503,{success:false,error:"Ticket payment status could not be verified."});
  if(ticket.payment_status==="refunded"||ticket.refunded_at||paymentOrder?.status==="refunded")return json(403,{success:false,error:"This ticket has been refunded."});
  if(ticket.payment_status!=="completed")return json(404,{success:false,error:"Ticket not found or payment not confirmed."});
  if(String(ticket.email||"").trim().toLowerCase()!==email)return json(403,{success:false,error:"Email does not match this ticket."});
  if(!ticket.expires_at||new Date(ticket.expires_at).getTime()<=Date.now())return json(403,{success:false,error:"This ticket has expired."});
  const screeningValue=Array.isArray(ticket.screening)?ticket.screening[0]:ticket.screening;
  if(!isRecord(screeningValue)||typeof screeningValue.status!=="string"||
     screeningValue.status!=="published"||
     (typeof screeningValue.lifecycle==="string"&&["cancelled","archived"].includes(screeningValue.lifecycle)))
   return json(410,{success:false,error:"This screening is no longer available."});
  const screening=screeningValue;
  if(screening.event_visibility==="private"||screening.invite_only===true){
   let invitationQuery=db.from("event_access_invites").select("id,expires_at")
    .eq("screening_id",ticket.screening_id).eq("invited_email",email)
    .eq("status","accepted").not("accepted_at","is",null);
   invitationQuery=ticket.user_id
    ?invitationQuery.or("invited_user_id.is.null,invited_user_id.eq."+ticket.user_id)
    :invitationQuery.is("invited_user_id",null);
   const {data:invitation,error:invitationError}=await invitationQuery.maybeSingle();
   if(invitationError)return json(503,{success:false,error:"Private screening invitation status could not be verified."});
   if(!invitation||(invitation.expires_at&&new Date(invitation.expires_at).getTime()<=Date.now()))
    return json(403,{success:false,code:"PRIVATE_SCREENING_INVITATION_REQUIRED",error:"An accepted, unexpired invitation is required to watch this private screening."});
  }
  if(country){
   if(isStringArray(screening.blocked_countries)&&screening.blocked_countries.includes(country))return json(451,{success:false,error:"This screening is not available in your territory."});
   if(isStringArray(screening.allowed_countries)&&screening.allowed_countries.length>0&&!screening.allowed_countries.includes(country))return json(451,{success:false,error:"This screening is not available in your territory."});
  }
  if(ticket.first_played_at&&ticket.access_hours){
   const end=new Date(ticket.first_played_at).getTime()+Number(ticket.access_hours)*3600000;
   if(Date.now()>end)return json(403,{success:false,error:"Your viewing window has ended."});
  }

  const {data:delivery,error:providerError}=await db.rpc("get_service_provider_runtime_config",{p_capability:"video_delivery"});
  if(providerError||!Array.isArray(delivery)||!delivery.length)
   return json(503,{success:false,code:"PLAYBACK_PROVIDER_NOT_CONFIGURED",error:"Secure playback is not configured. Your ticket remains valid."});
  const sessionTokenHash=await sha256(sessionId);
  let provider:PlaybackProvider|null=null;
  let playbackUrl:URL|null=null;
  let expiresAt:Date|null=null;
  const candidates:unknown[]=delivery;
  for(const candidateValue of candidates){
   if(!isPlaybackProvider(candidateValue))continue;
   const candidate=candidateValue;
   const endpoint=candidate.endpoints.playback_authorize;
   if(!candidate.credential||typeof endpoint!=="string"||!endpoint.startsWith("/")||endpoint.startsWith("//"))continue;
   try{
    const providerUrl=new URL(endpoint,candidate.base_url);
    if(providerUrl.origin!==new URL(candidate.base_url).origin)continue;
    const header=typeof candidate.settings?.credential_header==="string"?candidate.settings.credential_header:"Authorization";
    const prefix=typeof candidate.settings?.credential_prefix==="string"?candidate.settings.credential_prefix:"Bearer ";
    const providerResponse=await fetch(providerUrl,{
     method:"POST",
     headers:{"Content-Type":"application/json",[header]:prefix+candidate.credential},
     body:JSON.stringify({
      entitlement:{ticket_id:ticket.id,screening_id:ticket.screening_id,email,expires_at:ticket.expires_at},
      session:{session_id:sessionId,token_hash:sessionTokenHash,issued_at:new Date().toISOString()},
      request:{country}
     }),
     signal:AbortSignal.timeout(10000)
    });
    const resultValue:unknown=await providerResponse.json().catch(()=>null);
    const result=isRecord(resultValue)?resultValue:null;
    if(!providerResponse.ok||!result||result.authorized!==true||typeof result.playback_url!=="string"||typeof result.expires_at!=="string"){
     await db.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:"Playback authorization endpoint failed."}).eq("id",candidate.id);
     continue;
    }
    const candidateUrl=new URL(result.playback_url);
    const candidateExpiry=new Date(result.expires_at);
    const configuredOrigins=candidate.settings.allowed_playback_origins;
    const allowedOrigins=isStringArray(configuredOrigins)?configuredOrigins:[];
    if(candidateUrl.protocol!=="https:"||Number.isNaN(candidateExpiry.getTime())||candidateExpiry.getTime()<=Date.now()||
       candidateExpiry.getTime()>Date.now()+4*60*60*1000||candidateExpiry.getTime()>new Date(ticket.expires_at).getTime()||
       !allowedOrigins.includes(candidateUrl.origin)){
     await db.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:"Provider returned an invalid playback grant."}).eq("id",candidate.id);
     continue;
    }
    provider=candidate;playbackUrl=candidateUrl;expiresAt=candidateExpiry;
    await db.from("service_provider_bindings").update({health_status:"healthy",health_checked_at:new Date().toISOString(),health_error:null}).eq("id",candidate.id);
    break;
   }catch{
    await db.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:"Playback provider did not respond."}).eq("id",candidate.id);
   }
  }
  if(!provider||!playbackUrl||!expiresAt)
   return json(503,{success:false,code:"PLAYBACK_PROVIDER_UNAVAILABLE",error:"No healthy video delivery provider could authorize this ticket. Your ticket remains valid."});
  const {data:session,error:sessionError}=await db.rpc("authorize_legacy_screening_ticket_playback",{
   p_watch_code:watchCode,p_email:email,p_session_token_hash:sessionTokenHash,
   p_country_code:country,p_provider_expires_at:expiresAt.toISOString()
  });
  if(sessionError||!session){
   const message=String(sessionError?.message||"playback_session_denied");
   const code=message.includes("ticket_already_streaming")?"TICKET_ALREADY_STREAMING":
    message.includes("ticket_stream_limit_reached")?"TICKET_STREAM_LIMIT_REACHED":
    message.includes("screening_concurrency_limit_reached")?"SCREENING_CONCURRENCY_LIMIT_REACHED":
    message.includes("territory_not_permitted")?"TERRITORY_NOT_PERMITTED":
    message.includes("viewing_window_expired")?"VIEWING_WINDOW_EXPIRED":
    message.includes("private_screening_invitation_required")?"PRIVATE_SCREENING_INVITATION_REQUIRED":
    message.includes("screening_unavailable")?"SCREENING_UNAVAILABLE":"PLAYBACK_SESSION_DENIED";
   return json(code==="SCREENING_UNAVAILABLE"?410:403,{success:false,code,error:code==="TICKET_ALREADY_STREAMING"?"This ticket is already playing in another active session.":code==="TICKET_STREAM_LIMIT_REACHED"?"This ticket has reached its allowed number of playback sessions.":code==="SCREENING_CONCURRENCY_LIMIT_REACHED"?"This screening has reached its concurrent viewer limit. Please retry shortly.":"Ticket playback authorization was denied."});
  }
  return json(200,{success:true,playbackUrl:playbackUrl.toString(),expiresAt:expiresAt.toISOString(),sessionId,contentId:screening.content_id,screeningId:screening.id,provider:provider.provider_key});
 }catch(error){console.error("get-playback-url",error);return json(500,{success:false,error:"Playback authorization failed. Please retry or contact support."});}
});
