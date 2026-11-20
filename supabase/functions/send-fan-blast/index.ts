import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
const Body=z.object({screeningId:z.string().uuid(),template:z.enum(["starting_soon","doors_open","replay_live","custom"]),audience:z.enum(["all","waitlist","ticket_holders"]),subject:z.string().min(3).max(150),message:z.string().min(3).max(5000)});
const MAX_RECIPIENTS=2000;
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json","Cache-Control":"no-store"}});
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 try{
  const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!service)return json({error:"Email delivery is not configured."},503);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/,"");
  const {data:{user}}=await admin.auth.getUser(token);
  if(!user)return json({error:"Unauthorized."},401);
  const parsed=Body.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return json({error:parsed.error.flatten().fieldErrors},400);
  const p=parsed.data;
  const {data:s}=await admin.from("screenings").select("id,title,slug,content_id").eq("id",p.screeningId).maybeSingle();
  if(!s)return json({error:"Event not found."},404);
  const {data:c}=await admin.from("content").select("creator_id").eq("id",s.content_id).maybeSingle();
  const {data:adminRole,error:roleError}=await admin.from("user_roles").select("user_id").eq("user_id",user.id).eq("role","super_admin").maybeSingle();
  const isAdmin=!roleError&&Boolean(adminRole);
  if(!isAdmin&&c?.creator_id!==user.id)return json({error:"Not allowed."},403);

  const emails=new Set<string>();
  if(p.audience!=="ticket_holders"){
   const [{data:w},{data:n}]=await Promise.all([
    admin.from("event_waitlist").select("email").eq("screening_id",s.id).limit(MAX_RECIPIENTS),
    admin.from("screening_notifications").select("email").eq("screening_id",s.id).limit(MAX_RECIPIENTS),
   ]);
   [...(w||[]),...(n||[])].forEach(row=>row.email&&emails.add(row.email.toLowerCase()));
  }
  if(p.audience!=="waitlist"){
   const {data:t}=await admin.from("screening_tickets").select("email").eq("screening_id",s.id).eq("payment_status","completed").limit(MAX_RECIPIENTS);
   (t||[]).forEach(row=>row.email&&emails.add(row.email.toLowerCase()));
  }
  const recipients=[...emails].slice(0,MAX_RECIPIENTS);
  const {data:blast,error:blastError}=await admin.from("fan_blasts").insert({
   user_id:user.id,screening_id:s.id,template:p.template,subject:p.subject,body:p.message,
   audience:p.audience,recipients_count:recipients.length,status:"sending",
  }).select("id").single();
  if(blastError||!blast)return json({error:"The fan campaign could not be recorded."},503);
  if(!recipients.length){
   await admin.from("fan_blasts").update({status:"sent",error:null}).eq("id",blast.id);
   return json({success:true,sent:0,failed:0,total:0});
  }
  const {data:siteSetting,error:siteError}=await admin.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
  const origin=typeof siteSetting?.setting_value==="string"?siteSetting.setting_value:"";
  try{const site=new URL(origin);if(siteError||siteSetting?.is_public!==true||site.protocol!=="https:")throw new Error("invalid_site");}
  catch{
   await admin.from("fan_blasts").update({status:"failed",error:"Canonical public site URL is not published"}).eq("id",blast.id);
   return json({error:"Canonical public site URL is not published."},503);
  }
  const link=origin.replace(/\/$/,"")+"/movie/"+encodeURIComponent(s.slug);
  const html='<div style="font-family:sans-serif;max-width:560px;margin:auto"><h2>'+esc(s.title)+'</h2><p style="white-space:pre-line">'+esc(p.message)+'</p><p><a href="'+esc(link)+'" style="background:#EB6062;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Open event</a></p></div>';
  const messages=recipients.map((to,index)=>({to,subject:p.subject,html,text:p.message+" — "+link,idempotencyKey:"fan-blast-"+blast.id+"-"+index}));
  const dispatch=await fetch(url+"/functions/v1/dispatch-email",{method:"POST",headers:{Authorization:"Bearer "+service,apikey:service,"Content-Type":"application/json"},body:JSON.stringify({messages}),signal:AbortSignal.timeout(120000)}).catch(()=>null);
  if(!dispatch){
   await admin.from("fan_blasts").update({status:"failed",error:"Email dispatch service unavailable"}).eq("id",blast.id);
   return json({error:"Email dispatch service unavailable."},503);
  }
  const result=await dispatch.json().catch(()=>({}));
  const sent=Number(result.sent)||0,failed=Number(result.failed)||Math.max(0,recipients.length-sent);
  await admin.from("fan_blasts").update({status:sent>0?"sent":"failed",error:failed?("Delivery failed for "+failed+" of "+recipients.length+" recipients"):null}).eq("id",blast.id);
  if(sent===0)return json({error:"The configured email provider did not accept this campaign.",sent,failed,total:recipients.length,provider:result.provider??null},502);
  return json({success:failed===0,sent,failed,total:recipients.length,provider:result.provider??null,mode:result.mode??null},failed===0?200:207);
 }catch(e){console.error("send-fan-blast",e);return json({error:"The campaign could not be processed."},500);}
});
