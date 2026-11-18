import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
if(import.meta.main) serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return json(405,{error:"Method not allowed."});
 try{
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),authorization=req.headers.get("Authorization");
  if(!url||!anon||!authorization?.startsWith("Bearer ")) return json(503,{error:"Review service unavailable."});
  const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:authData,error:authError}=await caller.auth.getUser();
  if(authError||!authData?.user) return json(401,{error:"Sign in again."});
  const body=await req.json().catch(()=>null);
  const target=typeof body?.user_id==="string"?body.user_id:"";
  const decision=body?.decision;
  const reason=typeof body?.reason==="string"?body.reason.trim():"";
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(target)) return json(400,{error:"A valid applicant ID is required."});
  if(!["verified","rejected"].includes(decision)||reason.length<10||reason.length>1000) return json(400,{error:"Choose approve or reject and provide a review reason of at least 10 characters."});
  const {data,error}=await caller.rpc("review_kyc_application",{
    p_user_id:target,p_decision:decision,p_reason:reason,
    p_ip_address:req.headers.get("cf-connecting-ip")||null,
    p_user_agent:req.headers.get("user-agent")||null
  });
  if(error){
    const message=error.message||"Review failed.";
    const status=message.includes("forbidden")?403:message.includes("not_found")?404:message.includes("pending")?409:400;
    return json(status,{error:"The identity review was not applied. Verify your permission and the applicant's pending status."});
  }
  return json(200,data as Record<string,unknown>);
 }catch{return json(500,{error:"Identity review failed. Contact platform support."});}
});