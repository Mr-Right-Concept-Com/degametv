import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const Body = z.object({
  action: z.enum(["list", "create", "revoke", "inspect", "accept"]),
  screeningId: z.string().uuid().optional(),
  inviteId: z.string().uuid().optional(),
  email: z.string().trim().email().max(254).optional(),
  role: z.enum(["guest", "press", "reviewer", "vip", "crew"]).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  token: z.string().min(32).max(256).optional(),
}).strict();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), b => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !service || !anon) return json({ error: "Invitation service is unavailable." }, 503);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid event invitation request." }, 400);
  const p = parsed.data;
  const auth = req.headers.get("Authorization") || "";
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  let user: any = null;
  if (auth.startsWith("Bearer ")) {
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
    const result = await userClient.auth.getUser();
    user = result.data.user;
  }

  const ownsScreening = async (screeningId: string) => {
    const { data: screening, error } = await db.from("screenings")
      .select("id,tenant_id,content_id,title,slug,description,screening_date,release_date,status,lifecycle,event_type,access_model,base_price,base_currency,event_visibility,invite_only,sales_open_at,sales_close_at")
      .eq("id", screeningId).maybeSingle();
    if (error || !screening) return { screening: null, allowed: false };
    const [{ data: content }, { data: isAdmin }] = await Promise.all([
      db.from("content").select("creator_id").eq("id", screening.content_id).maybeSingle(),
      user ? db.rpc("is_super_admin", { _user_id: user.id }) : Promise.resolve({ data: false }),
    ]);
    return { screening, allowed: Boolean(user && (isAdmin || content?.creator_id === user.id)) };
  };

  try {
    if (p.action === "inspect") {
      if (!p.token) return json({ error: "Invitation token is required." }, 400);
      const hash = await sha256(p.token);
      const { data: invite, error } = await db.from("event_access_invites")
        .select("id,screening_id,invited_email,invite_role,status,expires_at,accepted_at")
        .eq("token_hash", hash).maybeSingle();
      if (error || !invite || invite.status === "revoked" || invite.status === "expired" ||
          (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now())) {
        return json({ error: "This invitation is invalid, expired or revoked." }, 404);
      }
      if (!invite.screening_id) return json({ error: "This invitation is not linked to a supported screening." }, 409);
      const { screening } = await ownsScreening(invite.screening_id);
      if (!screening || screening.status !== "published") return json({ error: "This screening is no longer available." }, 404);
      return json({
        success: true,
        invitation: {
          id: invite.id, role: invite.invite_role, status: invite.status,
          expiresAt: invite.expires_at, acceptedAt: invite.accepted_at,
        },
        event: {
          title: screening.title, slug: screening.slug, description: screening.description,
          startsAt: screening.screening_date || screening.release_date,
          eventType: screening.event_type, accessModel: screening.access_model,
          basePrice: screening.base_price, baseCurrency: screening.base_currency,
          salesOpenAt: screening.sales_open_at, salesCloseAt: screening.sales_close_at,
          visibility: screening.event_visibility,
        },
        emailMatch: Boolean(user?.email && user.email.toLowerCase() === invite.invited_email.toLowerCase()),
        signInRequired: !user,
      });
    }

    if (p.action === "create" || p.action === "list" || p.action === "revoke") {
      if (!user) return json({ error: "Sign in to manage screening invitations." }, 401);
      if (!p.screeningId) return json({ error: "A screening is required." }, 400);
      const { screening, allowed } = await ownsScreening(p.screeningId);
      if (!screening) return json({ error: "Screening not found." }, 404);
      if (!allowed) return json({ error: "You do not own this screening." }, 403);

      if (p.action === "list") {
        const { data, error } = await db.from("event_access_invites")
          .select("id,invited_email,invite_role,status,expires_at,accepted_at,created_at")
          .eq("screening_id", screening.id).order("created_at", { ascending: false }).limit(200);
        if (error) return json({ error: "Invitations could not be loaded." }, 503);
        return json({ success: true, invitations: data || [] });
      }

      if (p.action === "revoke") {
        if (!p.inviteId) return json({ error: "Invitation id is required." }, 400);
        const { data, error } = await db.from("event_access_invites")
          .update({ status: "revoked" }).eq("id", p.inviteId).eq("screening_id", screening.id)
          .in("status", ["pending", "sent", "accepted"]).select("id").maybeSingle();
        if (error || !data) return json({ error: "Invitation could not be revoked." }, 409);
        await db.from("audit_logs").insert({
          user_id: user.id, action: "event.invitation.revoked", entity_type: "event_access_invite",
          entity_id: data.id, new_data: { screening_id: screening.id },
        });
        return json({ success: true });
      }

      if (!p.email) return json({ error: "Invitee email is required." }, 400);
      if (!["private", "invite_only"].includes(screening.event_visibility) && !screening.invite_only) {
        return json({ error: "Change this screening to private or invite-only before creating guest invitations." }, 409);
      }
      const { data: siteSetting, error: siteError } = await db.from("platform_settings")
        .select("setting_value,is_public").eq("setting_key", "public_site_url").maybeSingle();
      let origin: string;
      try {
        const site = new URL(typeof siteSetting?.setting_value === "string" ? siteSetting.setting_value : "");
        if (siteError || siteSetting?.is_public !== true || site.protocol !== "https:" || site.username || site.password) throw new Error("invalid_origin");
        origin = site.origin;
      } catch {
        return json({ error: "The canonical public site URL must be configured before invitations can be sent." }, 503);
      }

      const token = randomToken();
      const inviteUrl = new URL("/invite/" + token, origin).toString();
      const expiresAt = p.expiresAt ?? null;
      if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return json({ error: "Invitation expiry must be in the future." }, 400);
      const { data: invite, error: insertError } = await db.from("event_access_invites").insert({
        tenant_id: screening.tenant_id, screening_id: screening.id,
        invited_email: p.email.toLowerCase(), invite_role: p.role || "guest",
        token_hash: await sha256(token), invited_by: user.id, expires_at: expiresAt,
      }).select("id").single();
      if (insertError || !invite) return json({ error: "Invitation could not be created." }, 409);

      const outboxKey = "private-invitation:" + invite.id;
      const subject = "You are invited to a private screening: " + screening.title;
      const html = `<p>You have been invited to a private DeGameTV screening.</p><h2>${screening.title.replace(/[&<>"]/g, "")}</h2><p>Invitation type: ${p.role || "guest"}</p><p><a href="${inviteUrl}">View your invitation</a></p><p>This invitation is private. Do not forward it.</p>`;
      const { data: outbox, error: outboxError } = await db.from("event_notification_outbox").insert({
        tenant_id: screening.tenant_id, screening_id: screening.id,
        recipient_email: p.email.toLowerCase(), notification_type: "private_invitation",
        idempotency_key: outboxKey, payload: { invite_id: invite.id, invite_url: inviteUrl, subject },
        scheduled_for: new Date().toISOString(),
      }).select("id").single();
      if (outboxError || !outbox) {
        return json({ success: true, inviteId: invite.id, inviteUrl, emailSent: false, warning: "Invitation exists, but its email could not be queued." });
      }

      const dispatch = await fetch(url + "/functions/v1/dispatch-email", {
        method: "POST",
        headers: { Authorization: "Bearer " + service, apikey: service, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ to: p.email.toLowerCase(), subject, html, text: "You are invited to " + screening.title + ": " + inviteUrl, idempotencyKey: outboxKey }] }),
        signal: AbortSignal.timeout(20000),
      }).catch(() => null);
      const dispatchResult = await dispatch?.json().catch(() => null);
      const emailSent = Boolean(dispatch?.ok && dispatchResult?.sent === 1 && dispatchResult?.failed === 0);
      await db.from("event_notification_outbox").update({
        status: emailSent ? "sent" : "failed", attempts: 1,
        sent_at: emailSent ? new Date().toISOString() : null,
        last_error: emailSent ? null : "email_provider_delivery_failed",
      }).eq("id", outbox.id);
      if (emailSent) await db.from("event_access_invites").update({ status: "sent" }).eq("id", invite.id);
      await db.from("audit_logs").insert({
        user_id: user.id, action: "event.invitation.created", entity_type: "event_access_invite",
        entity_id: invite.id, new_data: { screening_id: screening.id, invite_role: p.role || "guest", email_sent: emailSent },
      });
      return json({ success: true, inviteId: invite.id, inviteUrl, emailSent });
    }

    if (p.action === "accept") {
      if (!user || !user.email || !(user.email_confirmed_at || user.confirmed_at)) {
        return json({ error: "Sign in with a verified email address to accept this invitation." }, 401);
      }
      if (!p.token) return json({ error: "Invitation token is required." }, 400);
      const hash = await sha256(p.token);
      const { data: invite, error } = await db.from("event_access_invites")
        .select("id,screening_id,invited_email,status,expires_at")
        .eq("token_hash", hash).maybeSingle();
      if (error || !invite || invite.status === "revoked" || invite.status === "expired" ||
          (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) ||
          invite.invited_email.toLowerCase() !== user.email.toLowerCase()) {
        return json({ error: "This invitation is invalid, expired, revoked or belongs to another email address." }, 403);
      }
      const { error: updateError } = await db.from("event_access_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString(), invited_user_id: user.id })
        .eq("id", invite.id).in("status", ["pending", "sent", "accepted"]);
      if (updateError) return json({ error: "Invitation acceptance could not be recorded." }, 503);
      return json({ success: true, accepted: true, screeningId: invite.screening_id });
    }

    return json({ error: "Unsupported invitation action." }, 400);
  } catch (error) {
    console.error("manage-event-invitations", error);
    return json({ error: "Invitation operation failed safely." }, 500);
  }
});
