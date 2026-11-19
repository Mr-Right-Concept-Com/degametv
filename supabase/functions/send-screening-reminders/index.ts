import { createClient } from "npm:@supabase/supabase-js@2";
interface TicketRow {
 id:string; email:string; watch_code:string;
 screening:{id:string;title:string;slug:string;screening_date:string;poster_url:string|null};
}
type ClaimedMessage={ticketId:string;field:"reminder_24h_sent_at"|"reminder_1h_sent_at";to:string;subject:string;html:string;text:string;idempotencyKey:string};
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));
function reminderHtml(title:string,when:string,watchUrl:string,posterUrl:string|null){
 const safeTitle=escapeHtml(title),safeUrl=escapeHtml(watchUrl),poster=posterUrl?'<img src="'+escapeHtml(posterUrl)+'" alt="'+safeTitle+'" style="width:100%;display:block"/>':'';
 return '<!doctype html><html><body style="margin:0;background:#0f0f0f;font-family:Arial,sans-serif"><main style="max-width:600px;margin:24px auto;padding:24px"><section style="background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #333">'+poster+'<div style="padding:28px;color:white;text-align:center"><h1>'+escapeHtml(when)+'</h1><p><strong>'+safeTitle+'</strong> is about to premiere.</p><a href="'+safeUrl+'" style="display:inline-block;background:#e53e6b;color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:700">Watch now</a></div></section></main></body></html>';
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service||req.headers.get("Authorization")!=="Bearer "+service)return json({error:"Forbidden."},403);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:siteSetting,error:siteError}=await admin.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
 const origin=typeof siteSetting?.setting_value==="string"?siteSetting.setting_value:"";
 try{const site=new URL(origin);if(siteError||siteSetting?.is_public!==true||site.protocol!=="https:"||site.username||site.password)throw new Error("invalid_site_url");}
 catch{return json({error:"Canonical public site URL is not published."},503);}
 const now=new Date(),in25h=new Date(now.getTime()+25*60*60*1000),in23h=new Date(now.getTime()+23*60*60*1000),in75m=new Date(now.getTime()+75*60*1000),in45m=new Date(now.getTime()+45*60*1000);
 const select="id,email,watch_code,reminder_24h_sent_at,reminder_1h_sent_at,screening:screenings!inner(id,title,slug,screening_date,poster_url)";
 const [q24,q1]=await Promise.all([
  admin.from("screening_tickets").select(select).eq("payment_status","completed").is("reminder_24h_sent_at",null).gte("screening.screening_date",in23h.toISOString()).lte("screening.screening_date",in25h.toISOString()).limit(2000),
  admin.from("screening_tickets").select(select).eq("payment_status","completed").is("reminder_1h_sent_at",null).gte("screening.screening_date",in45m.toISOString()).lte("screening.screening_date",in75m.toISOString()).limit(2000),
 ]);
 if(q24.error||q1.error)return json({error:"Reminder queue could not be read."},503);
 const messages:ClaimedMessage[]=[];
 const claim=async(ticket:TicketRow,field:ClaimedMessage["field"],label:string)=>{
  const {data:row}=await admin.from("screening_tickets").update({[field]:new Date().toISOString()}).eq("id",ticket.id).is(field,null).select("id").maybeSingle();
  if(!row)return;
  const watchUrl=origin.replace(/\/$/,"")+"/watch/"+ticket.watch_code+"?email="+encodeURIComponent(ticket.email);
  messages.push({ticketId:ticket.id,field,to:ticket.email,subject:label+': "'+ticket.screening.title+'"',html:reminderHtml(ticket.screening.title,label,watchUrl,ticket.screening.poster_url),text:label+": "+ticket.screening.title+" — "+watchUrl,idempotencyKey:"screening-reminder-"+field+"-"+ticket.id});
 };
 for(const ticket of (q24.data??[]) as unknown as TicketRow[])await claim(ticket,"reminder_24h_sent_at","Premieres in 24 hours");
 for(const ticket of (q1.data??[]) as unknown as TicketRow[])await claim(ticket,"reminder_1h_sent_at","Premieres in 1 hour");
 if(!messages.length)return json({success:true,sent:0,failed:0,checked24h:q24.data?.length??0,checked1h:q1.data?.length??0});
 const dispatch=await fetch(url+"/functions/v1/dispatch-email",{method:"POST",headers:{Authorization:"Bearer "+service,apikey:service,"Content-Type":"application/json"},body:JSON.stringify({messages}),signal:AbortSignal.timeout(60000)}).catch(()=>null);
 if(!dispatch){
  await Promise.all(messages.map(m=>admin.from("screening_tickets").update({[m.field]:null}).eq("id",m.ticketId)));
  return json({error:"Email dispatch service is unavailable."},503);
 }
 const result=await dispatch.json().catch(()=>({}));
 const results=Array.isArray(result.results)?result.results:[];
 let sent=0;
 await Promise.all(messages.map(async(message,index)=>{
  if(results[index]?.success===true)sent++;
  else await admin.from("screening_tickets").update({[message.field]:null}).eq("id",message.ticketId);
 }));
 return json({success:sent===messages.length,sent,failed:messages.length-sent,checked24h:q24.data?.length??0,checked1h:q1.data?.length??0,provider:result.provider??null},sent===messages.length?200:207);
});
