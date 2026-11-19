import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
const Body=z.object({email:z.string().trim().email().max(254)}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization");
 if(!url||!anon||!service||!authorization?.startsWith("Bearer "))return json({error:"Sign in as a super administrator."},401);
 const parsed=Body.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json({error:"Enter a valid recipient email."},400);
 const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await caller.auth.getUser();
 if(authError||!auth.user)return json({error:"Your session has expired."},401);
 const {data:isAdmin,error:roleError}=await caller.rpc("has_role",{_user_id:auth.user.id,_role:"super_admin"});
 if(roleError||isAdmin!==true)return json({error:"Super administrator permission is required."},403);
 const dispatch=await fetch(url+"/functions/v1/dispatch-email",{
  method:"POST",
  headers:{Authorization:"Bearer "+service,apikey:service,"Content-Type":"application/json"},
  body:JSON.stringify({messages:[{to:parsed.data.email,subject:"DeGameTV email provider test",html:"<p>Your Vault-backed DeGameTV email adapter is connected and delivering messages.</p>",text:"Your Vault-backed DeGameTV email adapter is connected and delivering messages.",idempotencyKey:"degame-email-test-"+crypto.randomUUID()}]}),
  signal:AbortSignal.timeout(20000),
 }).catch(()=>null);
 if(!dispatch)return json({error:"Email dispatch service is unavailable."},503);
 const result=await dispatch.json().catch(()=>({}));
 if(!dispatch.ok||result.sent!==1)return json({error:result.error||"Email provider test delivery failed.",provider:result.provider??null},dispatch.status===207?502:dispatch.status);
 return json({success:true,provider:result.provider,mode:result.mode,providerMessageId:result.results?.[0]?.providerMessageId??null});
});
