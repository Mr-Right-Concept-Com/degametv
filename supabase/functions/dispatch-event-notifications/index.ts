import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const secureEqual=(a:string,b:string)=>{if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json(503,{error:"Notification worker is unavailable."});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const serviceAuthorized=req.headers.get("Authorization")==="Bearer "+service;
 const suppliedInternal=req.headers.get("x-internal-worker-token")||"";
 const {data:internalSecret}=await admin.rpc("get_event_notification_worker_secret");
 const internalAuthorized=typeof internalSecret==="string"&&suppliedInternal.length>=32&&secureEqual(suppliedInternal,internalSecret);
 if(!serviceAuthorized&&!internalAuthorized)return json(403,{error:"Forbidden."});
 const body=await req.json().catch(()=>({}));
 const limit=Number.isInteger(body?.limit)?Math.max(1,Math.min(200,body.limit)):50;
 const {data:items,error}=await admin.rpc("claim_event_notification_outbox",{p_limit:limit});
 if(error)return json(503,{error:"Notification queue could not be claimed."});
 let sent=0,failed=0;
 for(const item of items||[]){
  const payload=item.payload||{};
  if(item.notification_type==="private_invitation"&&payload.invite_id){
   const {data:invite}=await admin.from("event_access_invites").select("status,expires_at").eq("id",payload.invite_id).maybeSingle();
   if(!invite||!["pending","sent"].includes(invite.status)||(invite.expires_at&&Date.parse(invite.expires_at)<=Date.now())){
    await admin.from("event_notification_outbox").update({status:"cancelled",last_error:"invitation_revoked_or_expired"}).eq("id",item.id);
    continue;
   }
  }
  const recipient=String(item.recipient_email||"");
  const message={to:recipient,subject:String(payload.subject||"DeGameTV event update"),html:String(payload.html||"<p>You have an event update from DeGameTV.</p>"),text:typeof payload.text==="string"?payload.text:undefined,idempotencyKey:item.idempotency_key};
  const response=await fetch(url+"/functions/v1/dispatch-email",{method:"POST",headers:{Authorization:"Bearer "+service,apikey:service,"Content-Type":"application/json"},body:JSON.stringify({messages:[message]}),signal:AbortSignal.timeout(25000)}).catch(()=>null);
  const result=response?await response.json().catch(()=>null):null;
  if(response?.ok&&result?.sent===1){
   await admin.from("event_notification_outbox").update({status:"sent",sent_at:new Date().toISOString(),last_error:null}).eq("id",item.id);
   if(item.notification_type==="private_invitation"&&payload.invite_id){
    await admin.from("event_access_invites").update({status:"sent"}).eq("id",payload.invite_id).eq("status","pending");
   }
   sent++;
  }else{
   const attempts=Number(item.attempts)||1;
   const terminal=attempts>=8;
   const retryMinutes=Math.min(360,Math.pow(2,Math.min(attempts,8)));
   await admin.from("event_notification_outbox").update({
    status:terminal?"failed":"pending",
    scheduled_for:terminal?item.scheduled_for:new Date(Date.now()+retryMinutes*60_000).toISOString(),
    last_error:response?"email_provider_rejected_or_unavailable":"email_dispatch_unreachable"
   }).eq("id",item.id);
   failed++;
  }
 }
 return json(200,{success:failed===0,claimed:(items||[]).length,sent,failed});
});