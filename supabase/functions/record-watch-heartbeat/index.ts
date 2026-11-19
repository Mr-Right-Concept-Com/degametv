import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cf-ipcountry",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
const sha256 = async (value: string) => Array.from(
  new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
  b => b.toString(16).padStart(2, "0"),
).join("");

if (import.meta.main) serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  try {
    const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) return json(503, { error: "Playback session service is unavailable." });
    const supabase = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => ({}));
    const watchCode = typeof body.watchCode === "string" ? body.watchCode.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const sessionToken = typeof body.sessionToken === "string" ? body.sessionToken.trim() : "";
    const action = body.action === "release" ? "release" : "heartbeat";
    if (!watchCode || !email || !/^[a-f0-9]{64}$/.test(sessionToken)) return json(400, { error: "A valid ticket and playback session are required." });
    const { data: ticket, error: ticketError } = await supabase.from("screening_tickets")
      .select("id,screening_id,email,payment_status,refunded_at,revoked_at")
      .eq("watch_code", watchCode).eq("email", email).maybeSingle();
    if (ticketError || !ticket || ticket.payment_status !== "completed" || ticket.refunded_at || ticket.revoked_at) {
      return json(403, { error: "This ticket is no longer valid." });
    }
    const sessionHash = await sha256(sessionToken);
    const { data: lease, error: leaseError } = await supabase.rpc("heartbeat_screening_ticket_playback", {
      p_ticket_id: ticket.id, p_session_token_hash: sessionHash, p_release: action === "release",
    });
    if (leaseError || !lease) return json(409, { error: "The playback session expired or was revoked. Revalidate your ticket." });
    if (action === "release") return json(200, { success: true, released: true });

    const country = (req.headers.get("cf-ipcountry") || "").toUpperCase() || null;
    const delta = Math.max(0, Math.min(60, Math.round(Number(body.deltaSeconds) || 0)));
    const position = Math.max(0, Math.min(86400, Math.round(Number(body.position) || 0)));
    const { data: existing } = await supabase.from("watch_history")
      .select("id,watch_duration_seconds").eq("session_id", lease.session_id).maybeSingle();
    if (existing) {
      await supabase.from("watch_history").update({
        watch_duration_seconds: Math.max(0, Number(existing.watch_duration_seconds) || 0) + delta,
        watch_position: position, last_watched_at: new Date().toISOString(), country,
      }).eq("id", existing.id);
    } else {
      await supabase.from("watch_history").insert({
        screening_id: ticket.screening_id, session_id: lease.session_id,
        watch_duration_seconds: delta, watch_position: position, country,
      });
    }
    return json(200, { success: true, sessionExpiresAt: lease.expires_at });
  } catch (error) {
    console.error("record-watch-heartbeat", error);
    return json(500, { error: "Playback heartbeat failed safely." });
  }
});
