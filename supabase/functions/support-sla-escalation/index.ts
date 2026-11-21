import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!url || !serviceKey || authorization !== `Bearer ${serviceKey}`) {
    return respond({ error: "Service-role authorization required." }, 401);
  }

  const body: unknown = await request.json().catch(() => ({}));
  const limit = typeof body === "object" && body !== null && "limit" in body
    ? body.limit
    : 200;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 1000) {
    return respond({ error: "limit must be an integer from 1 to 1000." }, 400);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc("escalate_breached_support_tickets", { p_limit: limit });
  if (error) {
    console.error("support_sla_escalation_failed", error);
    return respond({ error: "Support SLA escalation could not be completed." }, 503);
  }
  return respond({ success: true, escalated: data, processed_limit: limit });
});
