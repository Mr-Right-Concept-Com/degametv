import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cf-ipcountry",
  "Content-Type": "application/json",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

if (import.meta.main) {
  serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

    try {
      const url = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!url || !serviceKey) return json(503, { success: false, error: "Playback authorization is temporarily unavailable." });

      const body = await req.json().catch(() => null);
      const watchCode = typeof body?.watchCode === "string" ? body.watchCode.trim() : "";
      const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!watchCode || !email) return json(400, { success: false, error: "Watch code and email are required." });

      const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: ticket, error } = await db
        .from("screening_tickets")
        .select("id,payment_status,refunded_at,revoked_at,expires_at,screening_id,screening:screenings(id,status,cancelled_at)")
        .eq("watch_code", watchCode)
        .eq("email", email)
        .maybeSingle();

      if (error) return json(503, { success: false, error: "Playback authorization could not be checked. Please retry." });
      if (!ticket || ticket.payment_status !== "completed") return json(404, { success: false, error: "Ticket not found or payment not confirmed." });
      if (ticket.refunded_at) return json(403, { success: false, error: "This ticket has been refunded." });
      if (ticket.revoked_at) return json(403, { success: false, error: "This ticket or invitation has been revoked." });
      if (!ticket.screening || ticket.screening.status !== "published" || ticket.screening.cancelled_at) return json(403, { success: false, error: "This screening is no longer available." });
      if (!ticket.expires_at || new Date(ticket.expires_at).getTime() <= Date.now()) return json(403, { success: false, error: "This ticket has expired." });

      const { data: delivery, error: providerError } = await db.rpc("get_service_provider_runtime_config", { p_capability: "video_delivery" });
      if (providerError || !Array.isArray(delivery) || !delivery.length) {
        return json(503, { success: false, code: "PLAYBACK_PROVIDER_NOT_CONFIGURED", error: "Secure playback is not configured. Your ticket remains valid." });
      }
      const provider = delivery[0];
      const endpoint = provider.endpoints?.playback_authorize;
      if (!provider.credential || typeof endpoint !== "string" || !endpoint.startsWith("/") || endpoint.startsWith("//")) {
        return json(503, { success: false, code: "PLAYBACK_PROVIDER_INCOMPLETE", error: "The active video provider is missing its playback authorization contract." });
      }
      const providerUrl = new URL(endpoint, provider.base_url);
      if (providerUrl.origin !== new URL(provider.base_url).origin) {
        return json(503, { success: false, code: "PLAYBACK_PROVIDER_INVALID", error: "The configured playback endpoint is invalid." });
      }
      const authorizationHeader = typeof provider.settings?.credential_header === "string" ? provider.settings.credential_header : "Authorization";
      const authorizationPrefix = typeof provider.settings?.credential_prefix === "string" ? provider.settings.credential_prefix : "Bearer ";
      const providerResponse = await fetch(providerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", [authorizationHeader]: authorizationPrefix + provider.credential },
        body: JSON.stringify({
          entitlement: { ticket_id: ticket.id, screening_id: ticket.screening_id, email, expires_at: ticket.expires_at },
          request: { issued_at: new Date().toISOString(), country: req.headers.get("cf-ipcountry") || null },
        }),
        signal: AbortSignal.timeout(10000),
      });
      const deliveryResult = await providerResponse.json().catch(() => null);
      if (!providerResponse.ok || deliveryResult?.authorized !== true ||
          typeof deliveryResult?.playback_url !== "string" || typeof deliveryResult?.expires_at !== "string") {
        return json(503, { success: false, code: "PLAYBACK_AUTHORIZATION_FAILED", error: "The delivery provider could not authorize this ticket. Please retry." });
      }
      let playbackUrl: URL, expiresAt: Date;
      try {
        playbackUrl = new URL(deliveryResult.playback_url);
        expiresAt = new Date(deliveryResult.expires_at);
        if (playbackUrl.protocol !== "https:" || Number.isNaN(expiresAt.getTime()) ||
            expiresAt.getTime() <= Date.now() || expiresAt.getTime() > Date.now() + 4 * 60 * 60 * 1000 ||
            expiresAt.getTime() > new Date(ticket.expires_at).getTime()) throw new Error("invalid_delivery_grant");
      } catch {
        return json(502, { success: false, code: "INVALID_PLAYBACK_GRANT", error: "The delivery provider returned an invalid playback grant." });
      }
      const allowedOrigins = Array.isArray(provider.settings?.allowed_playback_origins) ? provider.settings.allowed_playback_origins : [];
      if (!allowedOrigins.includes(playbackUrl.origin)) {
        return json(502, { success: false, code: "UNTRUSTED_PLAYBACK_ORIGIN", error: "The delivery provider returned an unapproved playback origin." });
      }
      return json(200, { success: true, playbackUrl: playbackUrl.toString(), expiresAt: expiresAt.toISOString(), provider: provider.provider_key });
    } catch {
      return json(500, { success: false, error: "Playback authorization failed. Please retry or contact support." });
    }
  });
}
