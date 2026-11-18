import {createClient} from "npm:@supabase/supabase-js@2";
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,"0")).join("");
async function sign(secret:string,raw:string,hash:"SHA-256"|"SHA-512"){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw)));}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
Deno.serve(async req=>{
 if(req.method!=="POST")return json(405,{error:"Method not allowed"});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!service)return json(503,{error:"Webhook unavailable"});
 const raw=await req.text();
 try{
  const event=JSON.parse(raw),reference=event?.provider_reference;
  if(typeof reference!=="string"||reference.length<8||reference.length>240)return json(400,{error:"Invalid provider reference"});
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:stream,error}=await db.from("live_streams").select("id,tenant_id,metadata,status").eq("metadata->>provider_reference",reference).maybeSingle();
  if(error||!stream)return json(404,{error:"Stream not found"});
  const providerKey=stream.metadata?.provider;
  const [{data:binding,error:bindingError},{data:secrets,error:secretError}]=await Promise.all([
   db.from("service_provider_bindings").select("provider_key,settings").eq("capability","live_streaming").eq("provider_key",providerKey).maybeSingle(),
   db.rpc("get_service_provider_admin_secret",{p_capability:"live_streaming",p_provider_key:providerKey})
  ]);
  const vault=Array.isArray(secrets)?secrets[0]:null,mode=stream.metadata?.provider_mode==="live"?"live":"test";
  const webhookSecret=mode==="live"?(vault?.live_webhook_secret||vault?.test_webhook_secret):(vault?.test_webhook_secret||vault?.live_webhook_secret);
  if(bindingError||secretError||!binding||!webhookSecret)return json(503,{error:"Webhook secret unavailable for stream provider"});
  const provider={settings:binding.settings,webhook_secret:webhookSecret};
  const settings=provider.settings||{},header=typeof settings.signature_header==="string"?settings.signature_header:"x-provider-signature";
  const algorithm=settings.signature_algorithm==="SHA-256"?"SHA-256":"SHA-512";
  const supplied=(req.headers.get(header)||"").toLowerCase().replace(/^sha256=/,"").replace(/^sha512=/,"");
  const expected=await sign(provider.webhook_secret,raw,algorithm);if(!safeEqual(supplied,expected))return json(401,{error:"Invalid provider signature"});
  const state=event?.status;
  const screeningId=stream.metadata?.screening_id;
  if(state==="live"){
   if(stream.status==="ended"||stream.status==="cancelled")return json(409,{error:"Stream is already terminal"});
   const now=new Date().toISOString();
   const {error:updateError}=await db.from("live_streams").update({status:"live",actual_start:now,updated_at:now}).eq("id",stream.id);
   if(updateError)return json(503,{error:"Stream state could not be updated"});
   if(screeningId)await db.from("screenings").update({lifecycle:"live",live_started_at:now}).eq("id",screeningId);
   return json(200,{received:true,status:"live"});
  }
  if(state==="ended"){
   const now=new Date().toISOString();
   const {error:updateError}=await db.from("live_streams").update({status:"ended",actual_end:now,updated_at:now}).eq("id",stream.id);
   if(updateError)return json(503,{error:"Stream state could not be updated"});
   if(screeningId)await db.from("screenings").update({lifecycle:"replay",live_ended_at:now,live_recording_status:event.recording_ready===true?"ready":"processing",live_replay_ready_at:event.recording_ready===true?now:null,live_provider_asset_id:typeof event.recording_asset_id==="string"?event.recording_asset_id:null}).eq("id",screeningId);
   return json(200,{received:true,status:"ended"});
  }
  if(state==="replay_ready"){
   if(typeof event.recording_asset_id!=="string"||!event.recording_asset_id)return json(400,{error:"Recording asset identifier required"});
   const now=new Date().toISOString();
   if(screeningId){const {error:updateError}=await db.from("screenings").update({lifecycle:"replay",live_recording_status:"ready",live_replay_ready_at:now,live_provider_asset_id:event.recording_asset_id}).eq("id",screeningId);if(updateError)return json(503,{error:"Replay state could not be updated"});}
   await db.from("live_streams").update({metadata:{...stream.metadata,recording_asset_id:event.recording_asset_id,recording_ready_at:now},updated_at:now}).eq("id",stream.id);
   return json(200,{received:true,status:"replay_ready"});
  }
  return json(200,{received:true,ignored:true});
 }catch{return json(400,{error:"Invalid provider webhook payload"});}
});