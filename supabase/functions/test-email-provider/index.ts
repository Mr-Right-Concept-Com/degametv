import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@3.25.76";
const schema=z.object({email:z.string().trim().email().max(254)}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization");
 if(!url||!anon||!service||!authorization)return json(401,{error:"Sign in as a super administrator."});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{error:"Enter a valid recipient email."});
 try{
  const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error:authError}=await caller.auth.getUser();
  if(authError||!auth.user)return json(401,{error:"Your session has expired."});
  const {data:isAdmin,error:roleError}=await caller.rpc("has_role",{_user_id:auth.user.id,_role:"super_admin"});
  if(roleError||isAdmin!==true)return json(403,{error:"Super administrator permission is required."});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:configs,error}=await admin.rpc("get_email_provider_runtime_config");
  if(error||!Array.isArray(configs)||!configs.length||!configs[0].api_key)return json(503,{error:"Enable a Vault-configured email provider before sending a test."});
  const cfg=configs[0];
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+cfg.api_key,"Content-Type":"application/json"},body:JSON.stringify({from:cfg.from_name+" <"+cfg.from_email+">",reply_to:cfg.reply_to||undefined,to:[parsed.data.email],subject:"DeGameTV email delivery test",html:"<p>Your DeGameTV email provider is connected and delivering messages.</p>"})});
  if(!response.ok)return json(502,{error:"Resend rejected the test message. Verify the key and sender domain."});
  const result=await response.json().catch(()=>({}));
  return json(200,{success:true,emailId:result.id});
 }catch{return json(502,{error:"The email provider could not be reached."});}
});