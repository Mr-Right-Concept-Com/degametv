import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@3.25.76";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const schema = z.object({
  provider: z.enum(["paystack", "flutterwave", "stripe"]),
  testPublicKey: z.string().trim().max(500).optional(),
  testSecret: z.string().trim().max(4000).optional(),
  livePublicKey: z.string().trim().max(500).optional(),
  liveSecret: z.string().trim().max(4000).optional(),
  webhookSecret: z.string().trim().max(4000).optional(),
  enabled: z.boolean(),
  live: z.boolean(),
}).strict();

if (import.meta.main) serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!["GET", "POST"].includes(req.method)) return json(405, { error: "Method not allowed." });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  if (!url || !anon || !serviceKey || !authorization?.startsWith("Bearer ")) {
    return json(401, { error: "Sign in with an administrator account." });
  }

  try {
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await caller.auth.getUser();
    if (authError || !auth.user) return json(401, { error: "Your session has expired. Sign in again." });
    const { data: isAdmin, error: roleError } = await caller.rpc("has_role", {
      _user_id: auth.user.id, _role: "super_admin",
    });
    if (roleError || isAdmin !== true) return json(403, { error: "Super administrator permission is required." });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    if (req.method === "GET") {
      const { data, error } = await admin.from("payment_provider_configs")
        .select("provider,is_enabled,is_live,test_public_key,live_public_key,test_secret_ref,live_secret_ref,webhook_secret_ref,updated_at")
        .order("provider");
      if (error) return json(503, { error: "Provider configuration is temporarily unavailable." });
      return json(200, { providers: (data ?? []).map(row => ({
        provider: row.provider, enabled: row.is_enabled, live: row.is_live,
        testPublicKey: row.test_public_key, livePublicKey: row.live_public_key,
        hasTestSecret: Boolean(row.test_secret_ref), hasLiveSecret: Boolean(row.live_secret_ref),
        hasWebhookSecret: Boolean(row.webhook_secret_ref), updatedAt: row.updated_at,
      })) });
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json(400, { error: "Provider settings are invalid. Check the fields and try again." });
    const value = parsed.data;
    const { data, error } = await caller.rpc("admin_configure_payment_provider", {
      p_provider: value.provider,
      p_test_public_key: value.testPublicKey ?? null,
      p_test_secret: value.testSecret ?? null,
      p_live_public_key: value.livePublicKey ?? null,
      p_live_secret: value.liveSecret ?? null,
      p_webhook_secret: value.webhookSecret ?? null,
      p_enabled: value.enabled,
      p_live: value.live,
    });
    if (error) {
      const message = error.message.includes("live_credentials") || error.message.includes("test_credentials")
        ? "Save the matching public key, secret key and webhook secret before enabling this mode."
        : error.message.includes("forbidden") ? "Super administrator permission is required."
        : "Provider settings could not be saved. No credentials were returned.";
      return json(error.message.includes("forbidden") ? 403 : 400, { error: message });
    }
    return json(200, { success: true, configuration: data });
  } catch {
    return json(500, { error: "Provider settings could not be processed. Contact platform support." });
  }
});
