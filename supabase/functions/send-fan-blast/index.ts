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

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) {
      await admin.from("fan_blasts").update({ status: "failed", error: "Email service not configured" }).eq("id", blast!.id);
      return json({ error: "Email service is not configured yet (missing RESEND_API_KEY)." }, 503);
    }
    if (list.length === 0) {
      await admin.from("fan_blasts").update({ status: "sent" }).eq("id", blast!.id);
      return json({ success: true, sent: 0 });
    }

    const { data: from } = await admin.from("platform_settings").select("setting_value").eq("setting_key", "email_from").maybeSingle();
    const sender = (from?.setting_value as string) || "DeGameTV <onboarding@resend.dev>";
    const origin = req.headers.get("origin") || "";
    const link = `${origin}/movie/${s.slug}`;
    const html = `<div style="font-family:sans-serif;max-width:560px;margin:auto"><h2>${esc(s.title)}</h2><p style="white-space:pre-line">${esc(p.message)}</p><p><a href="${link}" style="background:#EB6062;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Open event</a></p></div>`;

    let sent = 0;
    let lastError: string | null = null;
    for (let i = 0; i < list.length; i += 100) {
      const batch = list.slice(i, i + 100).map((to) => ({ from: sender, to: [to], subject: p.subject, html }));
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
