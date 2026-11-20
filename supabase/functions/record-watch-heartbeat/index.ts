import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, cf-ipcountry","Content-Type":"application/json"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:corsHeaders});
const sha256=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,"0")).join("");

if(import.meta.main)serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:corsHeaders});
 if(req.method!=="POST")return json(405,{success:false,error:"Method not allowed"});
 try{
  const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!service)return json(503,{success:false,error:"Playback session service unavailable."});
  const body=await req.json().catch(()=>null);
  const watchCode=typeof body?.watchCode==="string"?body.watchCode.trim():"";
  const email=typeof body?.email==="string"?body.email.trim().toLowerCase():"";
  const sessionId=typeof body?.sessionId==="string"?body.sessionId.trim():"";
  const release=body?.release===true;
  if(!watchCode||!email||!sessionId)return json(400,{success:false,error:"Missing playback session fields."});
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const tokenHash=await sha256(sessionId);
  const country=(req.headers.get("cf-ipcountry")||"").toUpperCase().slice(0,2)||null;
  const {data:ticket,error}=await db.from("screening_tickets")
   .select("id,screening_id,active_session_token,active_session_expires_at,payment_status,refunded_at,expires_at")
   .eq("watch_code",watchCode).maybeSingle();
  if(error)return json(503,{success:false,error:"Playback session could not be checked."});
  if(!ticket||ticket.payment_status!=="completed"||ticket.refunded_at||!ticket.expires_at||new Date(ticket.expires_at).getTime()<=Date.now())
   return json(403,{success:false,error:"Ticket is no longer valid."});
  const {data:emailCheck,error:emailError}=await db.from("screening_tickets").select("email").eq("id",ticket.id).maybeSingle();
  if(emailError||String(emailCheck?.email||"").trim().toLowerCase()!==email)return json(403,{success:false,error:"Email does not match this ticket."});
  if(ticket.active_session_token!==tokenHash)return json(403,{success:false,error:"This playback session is no longer active."});
  if(!release&&(!ticket.active_session_expires_at||new Date(ticket.active_session_expires_at).getTime()<=Date.now()))
   return json(403,{success:false,error:"Playback session expired. Reopen your ticket to resume."});

  const now=new Date().toISOString();
  const update=release
   ? await db.from("screening_tickets").update({active_session_token:null,active_session_started_at:null,active_session_expires_at:null}).eq("id",ticket.id).eq("active_session_token",tokenHash)
   : await db.from("screening_tickets").update({active_session_started_at:now,last_country:country}).eq("id",ticket.id).eq("active_session_token",tokenHash);
  if(update.error)return json(503,{success:false,error:"Playback session could not be refreshed."});

  if(!release){
   const delta=Math.max(0,Math.min(90,Math.round(Number(body?.deltaSeconds)||0)));
   const position=Math.max(0,Math.round(Number(body?.position)||0));
   const {data:existing}=await db.from("watch_history").select("id,watch_duration_seconds").eq("session_id",sessionId).maybeSingle();
   if(existing){
    await db.from("watch_history").update({watch_duration_seconds:(existing.watch_duration_seconds||0)+delta,watch_position:position,last_watched_at:now,country}).eq("id",existing.id);
   }else{
    await db.from("watch_history").insert({screening_id:ticket.screening_id,session_id:sessionId,watch_duration_seconds:delta,watch_position:position,last_watched_at:now,country});
   }
  }
  return json(200,{success:true,released:release});
 }catch(error){console.error("record-watch-heartbeat",error);return json(500,{success:false,error:"Playback session update failed."});}
});
