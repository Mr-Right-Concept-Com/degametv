import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json", "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service || req.headers.get("Authorization") !== "Bearer " + service) return json({ error: "Service authorization required." }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const requested = Number((await req.json().catch(() => ({})))?.limit ?? 25);
  const limit = Number.isFinite(requested) ? Math.max(1, Math.min(100, Math.floor(requested))) : 25;
  try {
    const { data: reminderCount, error: reminderError } = await admin.rpc("enqueue_event_reminders");
    if (reminderError) console.error("enqueue_event_reminders", reminderError);
    const { data: releasedHolds, error: settlementError } = await admin.rpc("release_eligible_event_settlement_holds", { p_limit: 500 });
    if (settlementError) console.error("release_eligible_event_settlement_holds", settlementError);
    const { data: rows, error: claimError } = await admin.rpc("claim_event_notification_outbox", { p_limit: limit });
    if (claimError) return json({ error: "Notification queue could not be claimed." }, 503);
    const { data: setting } = await admin.from("platform_settings").select("setting_value,is_public").eq("setting_key", "public_site_url").maybeSingle();
    let origin = "";
    try {
      const parsed = new URL(typeof setting?.setting_value === "string" ? setting.setting_value : "");
      if (setting?.is_public === true && parsed.protocol === "https:" && !parsed.username && !parsed.password) origin = parsed.origin;
    } catch { /* no public site configured */ }
    if (!origin && (rows || []).length) {
      await Promise.all((rows || []).map((row: any) => admin.from("event_notification_outbox").update({ status: "failed", claimed_at: null, last_error: "public_site_url_not_configured" }).eq("id", row.id)));
      return json({ processed: 0, failed: rows.length, error: "Canonical public site URL is not configured." }, 503);
    }

    let sent = 0, failed = 0;
    for (const row of rows || []) {
      const payload = row.payload || {};
      const title = String(payload.title || "Your DeGameTV event");
      const windowLabel = String(payload.reminder_window || "");
      let subject = "DeGameTV update: " + title;
      let heading = title;
      let message = "Your event information is ready in your DeGameTV account.";
      let target = origin + String(payload.delivery_route || "/tickets");
      if (row.notification_type === "private_invitation") {
        subject = String(payload.subject || "Private screening invitation: " + title);
        heading = "You are invited";
        message = "You have received a private screening invitation. This link is confidential and bound to the invited email address.";
        target = String(payload.invite_url || target);
      } else if (row.notification_type === "ticket_confirmation") {
        subject = "Your DeGameTV ticket is confirmed: " + title;
        heading = "Your ticket is confirmed";
        message = "Your payment was verified and your ticket is now available in your account.";
      } else if (row.notification_type === "event_started") {
        subject = "Your event is starting now: " + title;
        heading = "Your event is starting";
        message = "Your ticket is ready. Open DeGameTV to join the event.";
      } else if (row.notification_type === "event_reminder") {
        subject = "Reminder (" + windowLabel + "): " + title;
        heading = "Your event is coming up";
        message = "Your " + windowLabel + " reminder is here. Keep your ticket ready and join at the scheduled time.";
      } else if (row.notification_type === "replay_ready") {
        subject = "Your replay is ready: " + title;
        heading = "Your replay is ready";
        message = "The replay is available to eligible ticket holders in your DeGameTV account.";
      } else if (row.notification_type === "event_cancelled") {
        subject = "Event update: " + title;
        heading = "This event has been cancelled";
        message = "The creator has cancelled this event. Open your account for ticket and refund information.";
      }
      const safeTarget = /^https:\/\//.test(target) ? target : origin + "/tickets";
      const html = "<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#171717\"><h1>" + esc(heading) + "</h1><p>" + esc(message) + "</p><p><a style=\"display:inline-block;padding:12px 18px;background:#ed1c18;color:#fff;text-decoration:none;border-radius:8px\" href=\"" + esc(safeTarget) + "\">Open DeGameTV</a></p><p style=\"font-size:12px;color:#666\">This message was sent because of activity on your DeGameTV account.</p></div>";
      const textBody = heading + "\n\n" + message + "\n\n" + safeTarget;
      const response = await fetch(url + "/functions/v1/dispatch-email", {
        method: "POST",
        headers: { Authorization: "Bearer " + service, apikey: service, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ to: row.recipient_email, subject, html, text: textBody, idempotencyKey: row.idempotency_key }] }),
        signal: AbortSignal.timeout(20000),
      }).catch(() => null);
      const result = await response?.json().catch(() => null);
      const delivered = Boolean(response?.ok && result?.sent === 1 && result?.failed === 0);
      await admin.from("event_notification_outbox").update({
        status: delivered ? "sent" : "failed",
        sent_at: delivered ? new Date().toISOString() : null,
        claimed_at: null,
        last_error: delivered ? null : "email_delivery_failed",
      }).eq("id", row.id);
      if (delivered) sent++; else failed++;
    }
    return json({ processed: (rows || []).length, sent, failed, reminders_enqueued: reminderCount || 0, settlement_holds_released: releasedHolds || 0 });
  } catch (error) {
    console.error("dispatch-event-notifications", error);
    return json({ error: "Notification worker failed safely." }, 500);
  }
});
