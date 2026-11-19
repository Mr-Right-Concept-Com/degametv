import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cf-ipcountry",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
  "Content-Type": "application/json",
};
const countrySchema = z.string().regex(/^[A-Z]{2}$/);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "GET" && req.method !== "POST") return response({ error: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return response({ error: "Runtime configuration is unavailable." }, 503);

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const requestUrl = new URL(req.url);
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const edgeCountry = req.headers.get("cf-ipcountry")?.toUpperCase();
  const requestedCountry = String(body?.country ?? requestUrl.searchParams.get("country") ?? "").toUpperCase() || undefined;
  const localeRegion = req.headers.get("accept-language")?.split(",")[0]?.split("-")[1]?.toUpperCase();
  const candidate = edgeCountry && countrySchema.safeParse(edgeCountry).success
    ? edgeCountry
    : requestedCountry && countrySchema.safeParse(requestedCountry).success
      ? requestedCountry
      : localeRegion && countrySchema.safeParse(localeRegion).success ? localeRegion : null;

  const [countries, features] = await Promise.all([
    db.from("country_currency_rules")
      .select("country_code,currency_code,currency_symbol,locale_code,timezone_name")
      .eq("enabled", true).order("country_code"),
    db.from("platform_feature_controls")
      .select("feature_key")
      .eq("enabled", true).eq("release_state", "released").eq("rollout_percentage", 100),
  ]);
  if (countries.error || features.error) return response({ error: "Runtime configuration could not be loaded." }, 503);

  const country = candidate ? countries.data?.find((item) => item.country_code === candidate) : undefined;
  const userCurrency = String(body?.currency ?? requestUrl.searchParams.get("currency") ?? "").toUpperCase() || undefined;
  const validOverride = userCurrency && currencySchema.safeParse(userCurrency).success ? userCurrency : null;
  return response({
    geo: { countryCode: candidate, source: edgeCountry ? "edge" : requestedCountry ? "explicit" : localeRegion ? "locale_hint" : "unknown" },
    locale: country?.locale_code ?? req.headers.get("accept-language")?.split(",")[0] ?? "en",
    currency: validOverride ?? country?.currency_code ?? "USD",
    currencySymbol: validOverride ? null : country?.currency_symbol ?? "$",
    countryCurrency: country ?? null,
    countries: countries.data ?? [],
    features: (features.data ?? []).map(({ feature_key }) => ({ key: feature_key })),
    generatedAt: new Date().toISOString(),
  });
});
