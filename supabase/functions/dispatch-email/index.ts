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
  const config = Array.isArray(configs) ? configs[0] : null;
  if (configError || !config?.credential || !config?.base_url) return json({ error: "No enabled Vault-backed email provider is available.", code: "EMAIL_PROVIDER_UNAVAILABLE" }, 503);
  const endpoint = config.endpoints?.send_email;
  if (typeof endpoint !== "string" || !endpoint.startsWith("/") || endpoint.startsWith("//")) return json({ error: "The email provider is missing its send_email endpoint contract." }, 503);
  const fromName = typeof config.settings?.from_name === "string" ? config.settings.from_name : "DeGameTV";
  const fromEmail = typeof config.settings?.from_email === "string" ? config.settings.from_email : "";
  const replyTo = typeof config.settings?.reply_to === "string" ? config.settings.reply_to : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) return json({ error: "A verified sender email must be configured in provider settings." }, 503);
  const adapter = String(config.settings?.adapter ?? config.provider_key).toLowerCase();
  const sendUrl = new URL(endpoint, config.base_url);
  if (sendUrl.origin !== new URL(config.base_url).origin) return json({ error: "Email endpoint host mismatch." }, 400);
  const authHeader = typeof config.settings?.credential_header === "string" ? config.settings.credential_header : "Authorization";
  const authPrefix = typeof config.settings?.credential_prefix === "string" ? config.settings.credential_prefix : "Bearer ";

  const results: Array<{ index: number; success: boolean; providerMessageId?: string | null; error?: string }> = new Array(parsed.data.messages.length);
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= parsed.data.messages.length) return;
      const message = parsed.data.messages[index];
      let success = false, providerMessageId: string | null = null, lastError = "provider_request_failed";
      for (let attempt = 0; attempt < 3 && !success; attempt++) {
        try {
          const headers: Record<string,string> = { [authHeader]: authPrefix + config.credential, "Content-Type": "application/json", Accept: "application/json" };
          if (message.idempotencyKey) headers["Idempotency-Key"] = message.idempotencyKey;
          const response = await fetch(sendUrl, {
            method: "POST", headers, body: JSON.stringify(buildPayload(adapter, fromName, fromEmail, replyTo, message)),
            signal: AbortSignal.timeout(15000),
          });
          const raw = await response.text();
          let result: Record<string,unknown> | null = null;
          try { result = raw ? JSON.parse(raw) as Record<string,unknown> : null; } catch { result = null; }
          if (response.ok && result?.success !== false && result?.accepted !== false && !result?.error) {
            success = true;
            const id = result?.id ?? result?.message_id ?? result?.MessageID;
            providerMessageId = typeof id === "string" ? id : null;
          } else {
            lastError = response.status === 429 ? "provider_rate_limited" : "provider_rejected_message";
            if (response.status < 500 && response.status !== 429) break;
          }
        } catch {
          lastError = "provider_unreachable";
        }
        if (!success && attempt < 2) await new Promise(resolve => setTimeout(resolve, 300 * (2 ** attempt)));
      }
      results[index] = success ? { index, success, providerMessageId } : { index, success: false, error: lastError };
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, parsed.data.messages.length) }, () => worker()));
  const sent = results.filter(result => result.success).length;
  return json({ success: sent === results.length, sent, failed: results.length - sent, provider: config.provider_key, mode: config.is_live ? "live" : "test", results }, sent === results.length ? 200 : 207);
});
