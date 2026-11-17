import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json = (status:number, body:Record<string,unknown>) => new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
if (import.meta.main) serve(async (req:Request) => {
  if (req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if (req.method!=="POST") return json(405,{error:"Method not allowed."});
  try {
    const url=Deno.env.get("SUPABASE_URL"), anonKey=Deno.env.get("SUPABASE_ANON_KEY"), serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization=req.headers.get("Authorization");
    if (!url||!anonKey||!serviceKey||!authorization?.startsWith("Bearer ")) return json(503,{error:"Identity submission is temporarily unavailable."});
    const authClient=createClient(url,anonKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:authData,error:authError}=await authClient.auth.getUser();
    const user=authData?.user;
    if(authError||!user) return json(401,{error:"Sign in again to submit identity verification."});
    const body=await req.json().catch(()=>null);
    const fullName=typeof body?.full_name==="string"?body.full_name.trim():"";
    const idType=body?.id_type;
    const idPath=typeof body?.id_path==="string"?body.id_path:"";
    const selfiePath=typeof body?.selfie_path==="string"?body.selfie_path:"";
    if(fullName.length<3||fullName.length>120) return json(400,{error:"Enter your full legal name."});
    if(!["nin","passport","drivers_license","voters_card"].includes(idType)) return json(400,{error:"Select a supported identity document."});
    const ownsPath=(path:string)=>path.startsWith(user.id+"/kyc/")&&!path.includes("..")&&!path.includes("\\");
    if(!ownsPath(idPath)||!ownsPath(selfiePath)||idPath===selfiePath) return json(400,{error:"The uploaded identity evidence is invalid. Upload both documents again."});
    const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    for(const path of [idPath,selfiePath]) {
      const {data:signed,error}=await admin.storage.from("identity-documents").createSignedUrl(path,60);
      if(error||!signed?.signedUrl) return json(400,{error:"One or more uploaded files could not be verified. Upload them again."});
    }
    const {data:current,error:readError}=await admin.from("profiles").select("kyc_status").eq("user_id",user.id).maybeSingle();
    if(readError||!current) return json(404,{error:"Your profile could not be found."});
    if(current.kyc_status==="verified") return json(409,{error:"Your identity is already verified."});
    if(current.kyc_status==="pending") return json(409,{error:"Your application is already under review."});
    const {error:updateError}=await admin.from("profiles").update({
      kyc_full_name:fullName,kyc_id_type:idType,kyc_id_url:idPath,kyc_selfie_url:selfiePath,
      kyc_status:"pending",kyc_submitted_at:new Date().toISOString()
    }).eq("user_id",user.id);
    if(updateError) return json(500,{error:"Your application could not be saved. Your uploaded files remain private; please retry."});
    return json(200,{success:true,status:"pending",message:"Identity application submitted for manual review."});
  } catch { return json(500,{error:"Identity submission failed. Please retry or contact support."}); }
});