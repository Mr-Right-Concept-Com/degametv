import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "npm:zod@3.25.76";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
const schema=z.object({
 email:z.string().trim().email().max(254),
 movieTitle:z.string().trim().min(1).max(200),
 watchUrl:z.string().url().max(2048),
 ticketCode:z.string().min(4).max(64),
 expiresAt:z.string().datetime({offset:true}).nullable(),
 location:z.enum(["nigeria","international"]),
 price:z.number().finite().nonnegative(),
 currency:z.enum(["NGN","USD"]),
}).strict();
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!serviceKey||req.headers.get("Authorization")!=="Bearer "+serviceKey)return json(403,{error:"Forbidden."});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{error:"Ticket email details are invalid."});
 const url=Deno.env.get("SUPABASE_URL");
 if(!url)return json(503,{error:"Email delivery is not configured. Your paid ticket remains valid."});
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:configs,error:configError}=await admin.rpc("get_email_provider_runtime_config");
 if(configError||!Array.isArray(configs)||!configs.length||!configs[0].api_key)return json(503,{error:"Email provider is disabled or its Vault credentials are missing. Your paid ticket remains valid."});
 const emailConfig=configs[0];
 const apiKey=emailConfig.api_key;
 const fromName=emailConfig.from_name;
 const fromEmail=emailConfig.from_email;
 if(!fromEmail)return json(503,{error:"Verified sender email is not configured. Your paid ticket remains valid."});
 const v=parsed.data;
 const title=escapeHtml(v.movieTitle),url=escapeHtml(v.watchUrl),ticket=escapeHtml(v.ticketCode);
 const amount=v.currency==="NGN"?"₦"+v.price.toLocaleString("en-NG"):"$"+v.price.toLocaleString("en-US");
 const expires=v.expiresAt?new Date(v.expiresAt).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}):"As stated on your screening ticket";
 const html=`<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#101014;color:#fff;font-family:Arial,sans-serif"><main style="max-width:600px;margin:24px auto;padding:28px;background:#1b1b22;border-radius:16px"><h1>Your DeGameTV ticket is confirmed</h1><p>Your ticket for <strong>${title}</strong> is ready.</p><p style="text-align:center;margin:32px"><a href="${url}" style="display:inline-block;padding:14px 30px;background:#e53e6b;color:#fff;text-decoration:none;border-radius:30px;font-weight:bold">Watch now</a></p><p>Ticket code: <strong>${ticket}</strong></p><p>Location: ${v.location}</p><p>Amount paid: ${amount}</p><p>Valid until: ${expires}</p><p style="color:#aaa;font-size:12px">Keep this email private. Your watch link grants access to your ticket.</p></main></body></html>`;
 try{
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({from:fromName+" <"+fromEmail+">",reply_to:emailConfig.reply_to||undefined,to:[v.email],subject:"Your DeGameTV ticket — "+v.movieTitle,html})});
  if(!response.ok)return json(502,{error:"Email provider rejected delivery. Your paid ticket remains valid."});
  const result=await response.json().catch(()=>({}));
  return json(200,{success:true,emailId:result.id});
 }catch{return json(502,{error:"Email provider is unavailable. Your paid ticket remains valid."});}
});