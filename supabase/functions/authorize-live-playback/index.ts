import {serve} from "https://deno.land/std@0.168.0/http/server.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.87.1";
import {z} from "npm:zod@3.25.76";
const schema=z.object({streamId:z.string().uuid(),mode:z.enum(["live","replay"])}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,x-client-info,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
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
  const {data:stream,error}=await db.from("live_streams").select("id,tenant_id,creator_id,status,playback_url,metadata").eq("id",input.data.streamId).maybeSingle();
  if(error||!stream)return json(404,{error:"Stream not found"});
  const {data:tickets,error:ticketError}=await db.from("tickets").select("id,ticket_type,valid_from,valid_until,revoked_at,metadata").eq("user_id",user.id).eq("tenant_id",stream.tenant_id).eq("stream_id",stream.id).is("revoked_at",null).lte("valid_from",new Date().toISOString()).gt("valid_until",new Date().toISOString());
  if(ticketError)return json(503,{error:"Ticket entitlement could not be checked"});
  const entitlement=tickets?.find(t=>input.data.mode==="live"?["live","combo"].includes(t.ticket_type):["replay","combo"].includes(t.ticket_type));
  if(!entitlement)return json(403,{error:"A valid paid ticket is required"});
  if(input.data.mode==="live"&&stream.status!=="live")return json(409,{error:"This stream is not live"});
  if(input.data.mode==="replay"){
   const {data:screening}=await db.from("screenings").select("live_recording_status,live_replay_ready_at").eq("id",stream.metadata?.screening_id).maybeSingle();
   if(screening?.live_recording_status!=="ready"||!screening.live_replay_ready_at)return json(409,{error:"Replay is not ready"});
  }
  const {data:providers,error:providerError}=await db.rpc("get_service_provider_runtime_config",{p_capability:"video_delivery"});
  if(providerError||!Array.isArray(providers)||!providers.length)return json(503,{error:"Video delivery provider is not configured"});
  const p=providers[0],path=p.endpoints?.playback_authorize;
  if(!p.credential||typeof path!=="string"||!path.startsWith("/")||path.startsWith("//"))return json(503,{error:"Playback authorization adapter is incomplete"});
  const endpoint=new URL(path,p.base_url);if(endpoint.origin!==new URL(p.base_url).origin)return json(503,{error:"Invalid playback endpoint"});
  const header=p.settings?.credential_header||"Authorization",prefix=p.settings?.credential_prefix??"Bearer ";
  const response=await fetch(endpoint,{method:"POST",headers:{[header]:prefix+p.credential,"Content-Type":"application/json"},body:JSON.stringify({entitlement:{ticket_id:entitlement.id,stream_id:stream.id,user_id:user.id,mode:input.data.mode,valid_until:entitlement.valid_until},asset:{provider_reference:stream.metadata?.provider_reference,playback_url:stream.playback_url}}),signal:AbortSignal.timeout(12000)});
  const grant=await response.json().catch(()=>null);
  if(!response.ok||grant?.authorized!==true||typeof grant.playback_url!=="string"||typeof grant.expires_at!=="string")return json(503,{error:"Provider refused playback authorization"});
  const playback=new URL(grant.playback_url),expires=new Date(grant.expires_at);
  const origins=p.settings?.allowed_playback_origins;
  if(playback.protocol!=="https:"||!Array.isArray(origins)||!origins.includes(playback.origin)||!Number.isFinite(expires.getTime())||expires.getTime()<=Date.now()||expires.getTime()>Date.now()+3600000)return json(502,{error:"Provider returned an invalid playback grant"});
  return json(200,{success:true,playbackUrl:playback.toString(),expiresAt:expires.toISOString()});
 }catch{return json(502,{error:"Playback authorization failed"});}
});