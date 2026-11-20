import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const Body = z.object({
  country: z.string().trim().regex(/^[A-Z]{2}$/).nullable().optional(),
  currency: z.string().trim().regex(/^[A-Z]{3}$/).nullable().optional(),
  language: z.string().trim().regex(/^[A-Za-z]{2,3}$/).nullable().optional(),
  locale: z.string().trim().regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/).nullable().optional(),
  timezone: z.string().trim().min(1).max(100).nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0);
const respond = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return respond({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return respond({ error: "Preference service is unavailable." }, 503);
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return respond({ error: "Authentication required." }, 401);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || !user) return respond({ error: "Authentication required." }, 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return respond({ error: "Invalid locale preferences.", issues: parsed.error.flatten() }, 400);
  const p = parsed.data;
  if (p.timezone) {
    try { new Intl.DateTimeFormat("en", { timeZone: p.timezone }).format(); }
    catch { return respond({ error: "Timezone must be a valid IANA timezone." }, 400); }
  }
  if (p.country) {
    const { data, error } = await db.from("country_currency_rules").select("country_code").eq("country_code", p.country).eq("enabled", true).maybeSingle();
    if (error || !data) return respond({ error: "Selected country is not enabled for platform transactions." }, 422);
  }
  if (p.currency) {
    const { data, error } = await db.from("country_currency_rules").select("currency_code").eq("enabled", true).eq("currency_code", p.currency).limit(1);
    if (error || !data?.length) return respond({ error: "Selected currency is not enabled for platform transactions." }, 422);
  }
  const patch: Record<string, string | null> = {};
  if (p.country !== undefined) patch.preferred_country = p.country;
  if (p.currency !== undefined) patch.preferred_currency = p.currency;
  if (p.language !== undefined) patch.language = p.language;
  if (p.locale !== undefined) { patch.locale_code = p.locale; patch.preferred_locale = p.locale; }
  if (p.timezone !== undefined) patch.timezone = p.timezone;
  patch.updated_at = new Date().toISOString();
  const { data, error } = await db.from("profiles").update(patch).eq("user_id", user.id)
    .select("preferred_country,preferred_currency,language,locale_code,preferred_locale,timezone").single();
  if (error) return respond({ error: "Could not save locale preferences." }, 500);
  await db.from("audit_logs").insert({
    user_id: user.id, action: "profile.locale_preferences.updated", entity_type: "profile", entity_id: null,
    new_data: { preferred_country: data.preferred_country, preferred_currency: data.preferred_currency,
      language: data.language, locale_code: data.locale_code, timezone: data.timezone },
  });
  return respond({ preferences: data });
});
