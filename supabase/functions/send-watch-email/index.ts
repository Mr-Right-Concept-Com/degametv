import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
const schema=z.object({
 email:z.string().trim().email().max(254),
 movieTitle:z.string().trim().min(1).max(200),
 watchUrl:z.string().url().max(2048),
 ticketCode:z.string().min(4).max(64),
 expiresAt:z.string().datetime({offset:true}).nullable(),
 location:z.string().trim().min(2).max(64),
 price:z.number().finite().nonnegative(),
 currency:z.string().regex(/^[A-Z]{3}$/),
}).strict();
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!serviceKey||req.headers.get("Authorization")!=="Bearer "+serviceKey)return json(403,{error:"Forbidden."});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{error:"Ticket email details are invalid."});
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:siteSetting,error:siteError}=await admin.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
 const origin=typeof siteSetting?.setting_value==="string"?siteSetting.setting_value:"";
 try{
  const site=new URL(origin),watch=new URL(parsed.data.watchUrl);
  if(siteError||siteSetting?.is_public!==true||site.protocol!=="https:"||watch.origin!==site.origin)throw new Error("invalid_site_origin");
 }catch{return json(503,{error:"Canonical public site URL is not published. The ticket remains valid."});}
 const v=parsed.data;
 let amount:string;
 try{amount=new Intl.NumberFormat(undefined,{style:"currency",currency:v.currency,maximumFractionDigits:2}).format(v.price);}
 catch{amount=v.currency+" "+v.price.toLocaleString();}
 const expires=v.expiresAt?new Date(v.expiresAt).toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"}):"As stated on your screening ticket";
 const title=escapeHtml(v.movieTitle),watch=escapeHtml(v.watchUrl),ticket=escapeHtml(v.ticketCode);
 const html=`<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#101014;color:#fff;font-family:Arial,sans-serif"><main style="max-width:600px;margin:24px auto;padding:28px;background:#1b1b22;border-radius:16px"><h1>Your DeGameTV ticket is confirmed</h1><p>Your ticket for <strong>${title}</strong> is ready.</p><p style="text-align:center;margin:32px"><a href="${watch}" style="display:inline-block;padding:14px 30px;background:#e53e6b;color:#fff;text-decoration:none;border-radius:30px;font-weight:bold">Watch now</a></p><p>Ticket code: <strong>${ticket}</strong></p><p>Destination: ${escapeHtml(v.location)}</p><p>Amount paid: ${escapeHtml(amount)}</p><p>Valid until: ${escapeHtml(expires)}</p><p style="color:#aaa;font-size:12px">Keep this email private. Your watch link grants access to your ticket.</p></main></body></html>`;
 const dispatch=await fetch(url+"/functions/v1/dispatch-email",{method:"POST",headers:{Authorization:"Bearer "+serviceKey,apikey:serviceKey,"Content-Type":"application/json"},body:JSON.stringify({messages:[{to:v.email,subject:"Your DeGameTV ticket — "+v.movieTitle,html,text:"Your DeGameTV ticket is ready. Watch: "+v.watchUrl,idempotencyKey:"ticket-email-"+v.ticketCode}]}),signal:AbortSignal.timeout(20000)}).catch(()=>null);
 if(!dispatch)return json(502,{error:"Email provider is unavailable. Your paid ticket remains valid."});
 const result=await dispatch.json().catch(()=>({}));
 if(!dispatch.ok||result.sent!==1)return json(502,{error:"Email provider rejected delivery. Your paid ticket remains valid."});
 return json(200,{success:true,emailId:result.results?.[0]?.providerMessageId??null,provider:result.provider});
});
