import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cf-ipcountry",
  "Content-Type": "application/json",
};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:corsHeaders});
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null&&!Array.isArray(value);
const isStringArray=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(item=>typeof item==="string");

if(import.meta.main)serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:corsHeaders});
 if(req.method!=="POST")return json(405,{success:false,error:"Method not allowed"});
 try{
  const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!service)return json(503,{success:false,error:"Ticket validation is temporarily unavailable."});
  const body=await req.json().catch(()=>null);
  const watchCode=isRecord(body)&&typeof body.watchCode==="string"?body.watchCode.trim():"";
  const email=isRecord(body)&&typeof body.email==="string"?body.email.trim().toLowerCase():"";
  if(!watchCode||!email)return json(400,{success:false,error:"Watch code and ticket email are required."});
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const country=(req.headers.get("cf-ipcountry")||"").toUpperCase().slice(0,2)||null;
  const {data:ticket,error}=await db.from("screening_tickets")
   .select("id,watch_code,email,payment_status,refunded_at,expires_at,screening_id,location,currency,price,stream_count,first_played_at,access_hours,screening:screenings(id,content_id,title,poster_url,status,lifecycle,allowed_countries,blocked_countries,max_streams_per_ticket,max_concurrent_streams)")
   .eq("watch_code",watchCode).maybeSingle();
  if(error)return json(503,{success:false,error:"Ticket validation could not be completed. Please retry."});
  if(!ticket||ticket.payment_status!=="completed")return json(404,{success:false,error:"Invalid or unpaid watch link."});
  if(String(ticket.email||"").trim().toLowerCase()!==email)return json(403,{success:false,error:"Email does not match this ticket."});

  if(ticket.refunded_at)return json(403,{success:false,error:"This ticket has been refunded."});
  if(!ticket.expires_at||new Date(ticket.expires_at).getTime()<=Date.now())return json(403,{success:false,error:"This ticket has expired."});
  const screeningValue:unknown=ticket.screening;
  const s=Array.isArray(screeningValue)?screeningValue[0]:screeningValue;
  if(!isRecord(s)||s.status!=="published"||(typeof s.lifecycle==="string"&&["cancelled","archived"].includes(s.lifecycle)))return json(410,{success:false,error:"This screening is no longer available."});
  if(country){
   if(isStringArray(s.blocked_countries)&&s.blocked_countries.includes(country))return json(451,{success:false,error:"This screening is not available in your territory."});
   if(isStringArray(s.allowed_countries)&&s.allowed_countries.length>0&&!s.allowed_countries.includes(country))return json(451,{success:false,error:"This screening is not available in your territory."});
  }
  if(ticket.first_played_at&&ticket.access_hours){
   const windowEnd=new Date(ticket.first_played_at).getTime()+Number(ticket.access_hours)*3600000;
   if(Date.now()>windowEnd)return json(403,{success:false,error:"Your viewing window has ended."});
  }
  const configuredMaxStreams=Number(s.max_streams_per_ticket??5);
  const maxStreams=configuredMaxStreams>0?configuredMaxStreams:null;
  return json(200,{success:true,ticket:{
   id:ticket.id,watchCode:ticket.watch_code,email:ticket.email,movieTitle:s.title,moviePoster:s.poster_url,
   expiresAt:ticket.expires_at,location:ticket.location,currency:ticket.currency||"NGN",price:ticket.price,
   screeningId:ticket.screening_id,contentId:s.content_id,country,streamsRemaining:maxStreams===null?null:Math.max(0,maxStreams-Number(ticket.stream_count||0)),
   maxStreams,maxConcurrent:Number(s.max_concurrent_streams??1)
  }});
 }catch(error:unknown){console.error("validate-watch-code",error);return json(500,{success:false,error:"Ticket validation failed safely."});}
});
