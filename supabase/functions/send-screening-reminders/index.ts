import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

interface TicketRow {
 id:string; email:string; watch_code:string; reminder_24h_sent_at:string|null; reminder_1h_sent_at:string|null;
 screening:{id:string;title:string;slug:string;screening_date:string;poster_url:string|null};
}
interface EmailConfig { api_key:string; from_name:string; from_email:string; reply_to:string|null; }
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));
function reminderHtml(title:string,when:string,watchUrl:string,posterUrl:string|null){
 const safeTitle=escapeHtml(title),safeUrl=escapeHtml(watchUrl),poster=posterUrl?'<img src="'+escapeHtml(posterUrl)+'" alt="'+safeTitle+'" style="width:100%;display:block"/>':'';
 return '<!doctype html><html><body style="margin:0;background:#0f0f0f;font-family:Arial,sans-serif"><main style="max-width:600px;margin:24px auto;padding:24px"><section style="background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #333">'+poster+'<div style="padding:28px;color:white;text-align:center"><h1>'+escapeHtml(when)+'</h1><p><strong>'+safeTitle+'</strong> is about to premiere.</p><a href="'+safeUrl+'" style="display:inline-block;background:#e53e6b;color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:700">Watch now</a></div></section></main></body></html>';
}
async function sendEmail(config:EmailConfig,to:string,subject:string,html:string){
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+config.api_key},body:JSON.stringify({from:config.from_name+" <"+config.from_email+">",reply_to:config.reply_to||undefined,to:[to],subject,html})});
 return response.ok;
}
if(import.meta.main)serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}});
 if(req.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed."}),{status:405});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service||req.headers.get("Authorization")!=="Bearer "+service)return new Response(JSON.stringify({error:"Forbidden."}),{status:403});
 const supabase=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:siteSetting,error:siteError}=await supabase.from("platform_settings").select("setting_value").eq("setting_key","public_site_url").maybeSingle();
 const origin=typeof siteSetting?.setting_value==="string"?siteSetting.setting_value:"";
 try{const parsedOrigin=new URL(origin);if(siteError||parsedOrigin.protocol!=="https:"||parsedOrigin.username||parsedOrigin.password)throw new Error("invalid_origin");}
 catch{return new Response(JSON.stringify({error:"Public app URL is not configured."}),{status:503});}
 const {data:configs,error:configError}=await supabase.rpc("get_email_provider_runtime_config");
 if(configError||!Array.isArray(configs)||!configs.length||!configs[0].api_key)return new Response(JSON.stringify({error:"Email provider is disabled or not configured."}),{status:503});
 const config=configs[0] as EmailConfig;
 const now=new Date(),in25h=new Date(now.getTime()+25*60*60*1000),in23h=new Date(now.getTime()+23*60*60*1000),in75m=new Date(now.getTime()+75*60*1000),in45m=new Date(now.getTime()+45*60*1000);
 const {data:t24,error:e24}=await supabase.from("screening_tickets").select("id,email,watch_code,reminder_24h_sent_at,reminder_1h_sent_at,screening:screenings!inner(id,title,slug,screening_date,poster_url)").eq("payment_status","completed").is("reminder_24h_sent_at",null).gte("screening.screening_date",in23h.toISOString()).lte("screening.screening_date",in25h.toISOString());
 const {data:t1,error:e1}=await supabase.from("screening_tickets").select("id,email,watch_code,reminder_24h_sent_at,reminder_1h_sent_at,screening:screenings!inner(id,title,slug,screening_date,poster_url)").eq("payment_status","completed").is("reminder_1h_sent_at",null).gte("screening.screening_date",in45m.toISOString()).lte("screening.screening_date",in75m.toISOString());
 if(e24||e1)return new Response(JSON.stringify({error:"Reminder queue could not be read."}),{status:503});
 let sent=0;
 for(const ticket of (t24??[]) as unknown as TicketRow[]){
  const {data:claim}=await supabase.from("screening_tickets").update({reminder_24h_sent_at:new Date().toISOString()}).eq("id",ticket.id).is("reminder_24h_sent_at",null).select("id").maybeSingle();
  if(!claim)continue;
  const watchUrl=origin.replace(/\/$/,"")+"/watch/"+ticket.watch_code+"?email="+encodeURIComponent(ticket.email);
  const ok=await sendEmail(config,ticket.email,'Reminder: "'+ticket.screening.title+'" premieres in 24 hours',reminderHtml(ticket.screening.title,"Premieres in 24 hours",watchUrl,ticket.screening.poster_url)).catch(()=>false);
  if(ok)sent++;else await supabase.from("screening_tickets").update({reminder_24h_sent_at:null}).eq("id",ticket.id);
 }
 for(const ticket of (t1??[]) as unknown as TicketRow[]){
  const {data:claim}=await supabase.from("screening_tickets").update({reminder_1h_sent_at:new Date().toISOString()}).eq("id",ticket.id).is("reminder_1h_sent_at",null).select("id").maybeSingle();
  if(!claim)continue;
  const watchUrl=origin.replace(/\/$/,"")+"/watch/"+ticket.watch_code+"?email="+encodeURIComponent(ticket.email);
  const ok=await sendEmail(config,ticket.email,'Starting soon: "'+ticket.screening.title+'" premieres in 1 hour',reminderHtml(ticket.screening.title,"Premieres in 1 hour",watchUrl,ticket.screening.poster_url)).catch(()=>false);
  if(ok)sent++;else await supabase.from("screening_tickets").update({reminder_1h_sent_at:null}).eq("id",ticket.id);
 }
 return new Response(JSON.stringify({success:true,sent,checked24h:t24?.length??0,checked1h:t1?.length??0}),{headers:{"Content-Type":"application/json"}});
});