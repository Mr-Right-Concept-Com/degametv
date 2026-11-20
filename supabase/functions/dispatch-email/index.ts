import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const Message = z.object({
  to: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(200),
  html: z.string().min(1).max(200_000),
  text: z.string().max(50_000).optional(),
  idempotencyKey: z.string().max(128).optional(),
});
const Body = z.object({ messages: z.array(Message).min(1).max(2000) }).strict();
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers: cors });

function buildPayload(adapter: string, fromName: string, fromEmail: string, replyTo: string | null, message: z.infer<typeof Message>) {
  const from = fromName + " <" + fromEmail + ">";
  if (adapter === "sendgrid") {
    return {
      personalizations: [{ to: [{ email: message.to }] }],
      from: { email: fromEmail, name: fromName },
      ...(replyTo ? { reply_to: { email: replyTo } } : {}),
      subject: message.subject,
      content: [{ type: "text/html", value: message.html }, ...(message.text ? [{ type: "text/plain", value: message.text }] : [])],
    };
  }
  if (adapter === "postmark") {
    return { From: from, To: message.to, ...(replyTo ? { ReplyTo: replyTo } : {}), Subject: message.subject, HtmlBody: message.html, ...(message.text ? { TextBody: message.text } : {}) };
  }
  if (adapter === "resend") {
    return { from, ...(replyTo ? { reply_to: replyTo } : {}), to: [message.to], subject: message.subject, html: message.html, ...(message.text ? { text: message.text } : {}) };
  }
  return { from: { name: fromName, email: fromEmail }, ...(replyTo ? { reply_to: replyTo } : {}), to: [message.to], subject: message.subject, html: message.html, ...(message.text ? { text: message.text } : {}) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey || req.headers.get("Authorization") !== "Bearer " + serviceKey) return json({ error: "Forbidden." }, 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Email dispatch request is invalid." }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: configs, error: configError } = await admin.rpc("get_service_provider_runtime_config", { p_capability: "email" });
  const providers = Array.isArray(configs) ? configs : [];
  if (configError || !providers.length) return json({ error: "No enabled Vault-backed email provider is available.", code: "EMAIL_PROVIDER_UNAVAILABLE" }, 503);

  const results: Array<{ index:number; success:boolean; provider?:string; providerMessageId?:string|null; error?:string }> = new Array(parsed.data.messages.length);
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= parsed.data.messages.length) return;
      const message = parsed.data.messages[index];
      let delivered = false, uncertain = false, lastError = "provider_unavailable";
      for (const config of providers) {
        if (!config?.credential || typeof config.base_url !== "string") continue;
        const endpoint = config.endpoints?.send_email;
        if (typeof endpoint !== "string" || !endpoint.startsWith("/") || endpoint.startsWith("//")) continue;
        let sendUrl:URL;
        try {
          const base = new URL(config.base_url);
          const host = base.hostname.toLowerCase();
          if (base.protocol !== "https:" || base.username || base.password || !host.includes(".")
            || host==="localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")
            || host.startsWith("[") || /^(127|10|0|224|240)\./.test(host) || /^192\.168\./.test(host)
            || /^169\.254\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) continue;
          sendUrl = new URL(endpoint,base);
          if (sendUrl.origin !== base.origin) continue;
        } catch { continue; }
        const fromName = typeof config.settings?.from_name === "string" ? config.settings.from_name : "DeGameTV";
        const fromEmail = typeof config.settings?.from_email === "string" ? config.settings.from_email : "";
        const replyTo = typeof config.settings?.reply_to === "string" ? config.settings.reply_to : null;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) continue;
        const adapter = String(config.settings?.adapter ?? config.provider_key).toLowerCase();
        const authHeader = typeof config.settings?.credential_header === "string" ? config.settings.credential_header : "Authorization";
        const authPrefix = typeof config.settings?.credential_prefix === "string" ? config.settings.credential_prefix : "Bearer ";
        let providerAccepted = false, providerUncertain = false, providerMessageId:string|null = null;
        for (let attempt=0;attempt<3&&!providerAccepted&&!providerUncertain;attempt++) {
          try {
            const headers:Record<string,string> = { [authHeader]:authPrefix+config.credential,"Content-Type":"application/json",Accept:"application/json" };
            if(message.idempotencyKey)headers["Idempotency-Key"]=message.idempotencyKey;
            const response=await fetch(sendUrl,{
              method:"POST",headers,body:JSON.stringify(buildPayload(adapter,fromName,fromEmail,replyTo,message)),
              redirect:"manual",signal:AbortSignal.timeout(15000),
            });
            const raw=await response.text();
            let result:Record<string,unknown>|null=null;
            try{result=raw?JSON.parse(raw) as Record<string,unknown>:null;}catch{result=null;}
            if(response.ok&&result?.success!==false&&result?.accepted!==false&&!result?.error){
              providerAccepted=true;
              const id=result?.id??result?.message_id??result?.MessageID;
              providerMessageId=typeof id==="string"?id:null;
              await admin.from("service_provider_bindings").update({health_status:"healthy",health_checked_at:new Date().toISOString(),health_error:null})
                .eq("capability","email").eq("provider_key",config.provider_key);
              break;
            }
            if([400,422].includes(response.status)){
              lastError="provider_rejected_message";
              break;
            }
            if([401,403,404,429].includes(response.status)){
              lastError=response.status===429?"provider_rate_limited":"provider_configuration_rejected";
              await admin.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:lastError})
                .eq("capability","email").eq("provider_key",config.provider_key);
              break;
            }
            if(response.status>=500||response.status===0){
              lastError="provider_unavailable_after_submission";
              providerUncertain=true;
              await admin.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:lastError})
                .eq("capability","email").eq("provider_key",config.provider_key);
              break;
            }
            lastError="provider_rejected_message";
            break;
          } catch {
            lastError="provider_outcome_unknown";
            providerUncertain=true;
            await admin.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:lastError})
              .eq("capability","email").eq("provider_key",config.provider_key);
          }
          if(!providerAccepted&&!providerUncertain&&attempt<2)await new Promise(resolve=>setTimeout(resolve,300*(2**attempt)));
        }
        if(providerAccepted){
          delivered=true;
          results[index]={index,success:true,provider:config.provider_key,providerMessageId};
          break;
        }
        if(providerUncertain){
          uncertain=true;
          break;
        }
        // Only definitive provider rejection permits trying the next provider.
      }
      if(!delivered)results[index]={index,success:false,error:uncertain?"provider_outcome_unknown":lastError};
    }
  };
  await Promise.all(Array.from({length:Math.min(8,parsed.data.messages.length)},()=>worker()));
  const sent=results.filter(result=>result.success).length;
  const failed=results.length-sent;
  return json({success:sent===results.length,sent,failed,providersAttempted:providers.length,results},sent===results.length?200:207);
});
