import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const schema = z.object({
  screeningId: z.string().uuid(),
  livePriceNgn: z.number().finite().min(0).max(100000000).nullable(),
  livePriceUsd: z.number().finite().min(0).max(1000000).nullable(),
  replayPriceNgn: z.number().finite().min(0).max(100000000).nullable(),
  replayPriceUsd: z.number().finite().min(0).max(1000000).nullable(),
  replayAccessHours: z.number().int().min(1).max(8760),
}).refine(v => v.livePriceNgn !== null || v.livePriceUsd !== null, { message: "Set at least one live admission price." });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  if (!url || !anon || !service) return json({ error: "Pricing service is unavailable." }, 503);
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in to manage event pricing." }, 401);
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user) return json({ error: "Your session is invalid. Sign in again." }, 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Check the admission and replay prices.", details: parsed.error.flatten() }, 400);
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: screening, error: lookupError } = await db.from("screenings")
    .select("id,tenant_id,content_id").eq("id", parsed.data.screeningId).maybeSingle();
  if (lookupError || !screening) return json({ error: "Event not found." }, 404);
  const { data: content, error: contentError } = await db.from("content")
    .select("creator_id,tenant_id").eq("id", screening.content_id).maybeSingle();
  if (contentError || !content || content.creator_id !== user.id || content.tenant_id !== screening.tenant_id)
    return json({ error: "You do not own this event in its tenant." }, 403);
  const { data: approved } = await db.rpc("is_approved_creator", { p_user_id: user.id });
  if (!approved) return json({ error: "Approved creator access is required." }, 403);
  const { data, error } = await db.from("screenings").update({
    live_price_ngn: parsed.data.livePriceNgn,
    live_price_usd: parsed.data.livePriceUsd,
    replay_price_ngn: parsed.data.replayPriceNgn,
    replay_price_usd: parsed.data.replayPriceUsd,
    replay_access_hours: parsed.data.replayAccessHours,
    updated_at: new Date().toISOString(),
  }).eq("id", parsed.data.screeningId).eq("tenant_id", screening.tenant_id)
    .select("id,live_price_ngn,live_price_usd,replay_price_ngn,replay_price_usd,replay_access_hours").single();
  if (error || !data) return json({ error: "Pricing could not be saved. No changes were confirmed." }, 503);
  return json({ success: true, pricing: data });
});
