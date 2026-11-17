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
        .select("id,payment_status,refunded_at,expires_at,screening_id,screening:screenings(id,status)")
        .eq("watch_code", watchCode)
        .eq("email", email)
        .maybeSingle();

      if (error) return json(503, { success: false, error: "Playback authorization could not be checked. Please retry." });
      if (!ticket || ticket.payment_status !== "completed") return json(404, { success: false, error: "Ticket not found or payment not confirmed." });
      if (ticket.refunded_at) return json(403, { success: false, error: "This ticket has been refunded." });
      if (!ticket.expires_at || new Date(ticket.expires_at).getTime() <= Date.now()) return json(403, { success: false, error: "This ticket has expired." });

      // Deliberately fail closed until a configured delivery adapter can verify
      // entitlement tokens at the media origin. Never return the raw origin URL,
      // issue a token that the origin may ignore, or consume a stream allowance.
      return json(503, {
        success: false,
        code: "PLAYBACK_PROVIDER_NOT_CONFIGURED",
        error: "Secure streaming is not configured for this screening. Your ticket remains valid and your stream allowance has not been used.",
      });
    } catch {
      return json(500, { success: false, error: "Playback authorization failed. Please retry or contact support." });
    }
  });
}
