import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.object({
  screeningId: z.string().uuid(),
  template: z.enum(["starting_soon", "doors_open", "replay_live", "custom"]),
  audience: z.enum(["all", "waitlist", "ticket_holders"]),
  subject: z.string().min(3).max(150),
  message: z.string().min(3).max(5000),
});
const MAX_RECIPIENTS = 2000; // bound per blast
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const p = parsed.data;

    const { data: s } = await admin.from("screenings").select("id, title, slug, content_id").eq("id", p.screeningId).maybeSingle();
    if (!s) return json({ error: "Event not found" }, 404);
    const { data: c } = await admin.from("content").select("creator_id").eq("id", s.content_id).maybeSingle();
    const { data: isAdmin } = await admin.rpc("is_super_admin", { _user_id: user.id });
    if (!isAdmin && c?.creator_id !== user.id) return json({ error: "Not allowed" }, 403);

    const emails = new Set<string>();
    if (p.audience !== "ticket_holders") {
      const [{ data: w }, { data: n }] = await Promise.all([
        admin.from("event_waitlist").select("email").eq("screening_id", s.id).limit(MAX_RECIPIENTS),
        admin.from("screening_notifications").select("email").eq("screening_id", s.id).limit(MAX_RECIPIENTS),
      ]);
      [...(w || []), ...(n || [])].forEach((r) => r.email && emails.add(r.email.toLowerCase()));
    }
    if (p.audience !== "waitlist") {
      const { data: t } = await admin.from("screening_tickets").select("email")
        .eq("screening_id", s.id).eq("payment_status", "completed").limit(MAX_RECIPIENTS);
      (t || []).forEach((r) => r.email && emails.add(r.email.toLowerCase()));
    }
    const list = [...emails].slice(0, MAX_RECIPIENTS);

    const { data: blast } = await admin.from("fan_blasts").insert({
      user_id: user.id, screening_id: s.id, template: p.template, subject: p.subject, body: p.message,
      audience: p.audience, recipients_count: list.length, status: "sending",
    }).select("id").single();

    const { data: emailConfigs, error: emailConfigError } = await admin.rpc("get_email_provider_runtime_config");
    const emailConfig = Array.isArray(emailConfigs) ? emailConfigs[0] : null;
    if (emailConfigError || !emailConfig?.api_key || !emailConfig.from_email) {
      await admin.from("fan_blasts").update({ status: "failed", error: "Vault email provider is disabled or incomplete" }).eq("id", blast!.id);
      return json({ error: "Email delivery is not enabled. Contact the platform administrator." }, 503);
    }
    const key = emailConfig.api_key;
    if (list.length === 0) {
      await admin.from("fan_blasts").update({ status: "sent" }).eq("id", blast!.id);
      return json({ success: true, sent: 0 });
    }

    const sender = emailConfig.from_name + " <" + emailConfig.from_email + ">";
    const origin = (Deno.env.get("PUBLIC_APP_URL") || req.headers.get("origin") || "").replace(/\/$/, "");
    if (!origin.startsWith("https://")) {
      await admin.from("fan_blasts").update({ status: "failed", error: "Public app URL is not configured" }).eq("id", blast!.id);
      return json({ error: "Public event URL is not configured." }, 503);
    }
    const link = `${origin}/movie/${s.slug}`;
    const html = `<div style="font-family:sans-serif;max-width:560px;margin:auto"><h2>${esc(s.title)}</h2><p style="white-space:pre-line">${esc(p.message)}</p><p><a href="${link}" style="background:#EB6062;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Open event</a></p></div>`;

    let sent = 0;
    let lastError: string | null = null;
    for (let i = 0; i < list.length; i += 100) {
      const batch = list.slice(i, i + 100).map((to) => ({ from: sender, reply_to: emailConfig.reply_to || undefined, to: [to], subject: p.subject, html }));
      const r = await fetch("https://api.resend.com/emails/batch", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(batch),
      });
      if (r.ok) sent += batch.length;
      else { lastError = `${r.status} ${await r.text()}`; if (r.status !== 429 && r.status < 500) break; }
    }
    await admin.from("fan_blasts").update({ status: lastError && sent === 0 ? "failed" : "sent", error: lastError }).eq("id", blast!.id);
    if (lastError && sent === 0) return json({ error: `Email provider rejected the send: ${lastError}` }, 502);
    return json({ success: true, sent, total: list.length });
  } catch (e) {
    console.error("send-fan-blast", e);
    return json({ error: (e as Error).message }, 500);
  }
});
