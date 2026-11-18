import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@3.25.76";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const schema=z.object({testSecret:z.string().trim().max(4000).optional(),liveSecret:z.string().trim().max(4000).optional(),fromName:z.string().trim().min(1).max(100),fromEmail:z.string().trim().email().max(254),replyTo:z.string().trim().email().max(254).optional().or(z.literal("")),enabled:z.boolean(),live:z.boolean()}).strict();
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(!["GET","POST"].includes(req.method))return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization");
 if(!url||!anon||!service||!authorization?.startsWith("Bearer "))return json(401,{error:"Sign in as a super administrator."});
 try{
  const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error:authError}=await caller.auth.getUser();
  if(authError||!auth.user)return json(401,{error:"Your session has expired. Sign in again."});
  const {data:isAdmin,error:roleError}=await caller.rpc("has_role",{_user_id:auth.user.id,_role:"super_admin"});
  if(roleError||isAdmin!==true)return json(403,{error:"Super administrator permission is required."});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  if(req.method==="GET"){
   const {data,error}=await admin.from("email_provider_configs").select("is_enabled,is_live,test_secret_ref,live_secret_ref,from_name,from_email,reply_to,updated_at").eq("provider","resend").maybeSingle();
   if(error)return json(503,{error:"Email provider settings are unavailable."});
   return json(200,{config:data?{enabled:data.is_enabled,live:data.is_live,hasTestSecret:Boolean(data.test_secret_ref),hasLiveSecret:Boolean(data.live_secret_ref),fromName:data.from_name,fromEmail:data.from_email,replyTo:data.reply_to,updatedAt:data.updated_at}:{enabled:false,live:false,hasTestSecret:false,hasLiveSecret:false,fromName:"DeGameTV",fromEmail:"",replyTo:""}});
  }
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return json(400,{error:"Email provider settings are invalid."});
  const v=parsed.data;
  const {data,error}=await caller.rpc("admin_configure_email_provider",{p_test_secret:v.testSecret??null,p_live_secret:v.liveSecret??null,p_from_name:v.fromName,p_from_email:v.fromEmail,p_reply_to:v.replyTo||null,p_enabled:v.enabled,p_live:v.live});
  if(error){const message=error.message.includes("test_email_key_required")?"Save a test API key before enabling test delivery.":error.message.includes("live_email_key_required")?"Save a live API key before switching to live.":error.message.includes("verified_sender_email_required")?"Enter a valid verified sender email address.":error.message.includes("forbidden")?"Super administrator permission is required.":"Email settings could not be saved.";return json(400,{error:message});}
  return json(200,{success:true,config:data});
 }catch{return json(500,{error:"Email provider settings could not be processed."});}
});