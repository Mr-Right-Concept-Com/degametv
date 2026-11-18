import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const schema = z.object({
  full_name: z.string().trim().min(3).max(120),
  id_type: z.enum(["nin", "passport", "drivers_license", "voters_card"]),
  id_path: z.string().min(1).max(512),
  selfie_path: z.string().min(1).max(512),
}).strict();
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

if (import.meta.main) serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = req.headers.get("Authorization");
    if (!url || !anonKey || !authorization?.startsWith("Bearer ")) {
      return json(401, { error: "Sign in again to submit identity verification." });
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json(400, { error: "Check your name, identity document type and uploaded evidence." });

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData?.user) return json(401, { error: "Sign in again to submit identity verification." });

    const { data, error } = await caller.rpc("submit_kyc_application", {
      p_full_name: parsed.data.full_name,
      p_id_type: parsed.data.id_type,
      p_id_path: parsed.data.id_path,
      p_selfie_path: parsed.data.selfie_path,
    });
    if (error) {
      const message = error.message || "";
      const status = message.includes("unauthorized") ? 401
        : message.includes("already_") ? 409
        : message.includes("profile_not_found") ? 404
        : message.includes("invalid_") ? 400 : 500;
      return json(status, { error: status === 409 ? "Your identity application is already verified or under review."
        : status === 400 ? "The uploaded evidence could not be verified. Upload both documents again."
        : status === 404 ? "Your profile could not be found."
        : "Your identity application could not be submitted. Please retry or contact support." });
    }
    return json(200, data as Record<string, unknown>);
  } catch {
    return json(500, { error: "Identity submission failed. Please retry or contact support." });
  }
});
