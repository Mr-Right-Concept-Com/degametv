import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cf-ipcountry",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-store",
  "Vary": "cf-ipcountry, accept-language",
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
  const authorization = req.headers.get("Authorization");
  let userId: string | null = null;
  if (authorization?.startsWith("Bearer ")) {
    const { data } = await db.auth.getUser(authorization.slice(7));
    userId = data.user?.id ?? null;
  }

  const visitorId = typeof body?.visitorId === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(body.visitorId)
    ? body.visitorId
    : "anonymous";
  const profileQuery = userId
    ? db.from("profiles").select("preferred_country,preferred_currency,locale_code").eq("user_id", userId).maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const [countries, features, profileResult] = await Promise.all([
    db.from("country_currency_rules")
      .select("country_code,currency_code,currency_symbol,locale_code,timezone_name")
      .eq("enabled", true).order("country_code"),
    db.from("platform_feature_controls")
      .select("feature_key,enabled,rollout_percentage,release_state"),
    profileQuery,
  ]);
  if (countries.error || features.error || profileResult.error) {
    return response({ error: "Runtime configuration could not be loaded." }, 503);
  }

  const profile = profileResult.data;
  const edgeCountry = req.headers.get("cf-ipcountry")?.toUpperCase();
  const requestedCountry = String(body?.country ?? requestUrl.searchParams.get("country") ?? "").toUpperCase();
  const localeRegion = req.headers.get("accept-language")?.split(",")[0]?.split("-")[1]?.toUpperCase();
  const preferredCountry = profile?.preferred_country?.toUpperCase();
  const candidate = preferredCountry && countrySchema.safeParse(preferredCountry).success
    ? preferredCountry
    : edgeCountry && countrySchema.safeParse(edgeCountry).success
      ? edgeCountry
      : countrySchema.safeParse(requestedCountry).success
        ? requestedCountry
        : localeRegion && countrySchema.safeParse(localeRegion).success ? localeRegion : null;
  const country = candidate ? countries.data?.find((item) => item.country_code === candidate) : undefined;

  const requestedCurrency = String(body?.currency ?? requestUrl.searchParams.get("currency") ?? "").toUpperCase();
  const preferredCurrency = profile?.preferred_currency?.toUpperCase();
  const currency = [requestedCurrency, preferredCurrency].find((value) =>
    value && currencySchema.safeParse(value).success
  ) ?? country?.currency_code ?? "USD";
  const locale = profile?.locale_code
    ?? country?.locale_code
    ?? req.headers.get("accept-language")?.split(",")[0]
    ?? "en";

  const cohortId = userId ?? visitorId;
  const runtimeFeatures = await Promise.all((features.data ?? []).map(async (feature) => {
    if (!feature.enabled || ["draft", "paused", "rolled_back"].includes(feature.release_state)) {
      return { key: feature.feature_key, enabled: false };
    }
    if (feature.release_state === "released") {
      return { key: feature.feature_key, enabled: feature.rollout_percentage === 100 };
    }
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cohortId + ":" + feature.feature_key));
    const bucket = new DataView(digest).getUint32(0, false) % 100;
    return { key: feature.feature_key, enabled: bucket < feature.rollout_percentage };
  }));

  return response({
    cohortId,
    geo: { countryCode: candidate, source: preferredCountry ? "profile_preference" : edgeCountry ? "edge" : requestedCountry ? "explicit" : localeRegion ? "locale_hint" : "unknown" },
    locale,
    currency,
    currencySymbol: currency === country?.currency_code ? country.currency_symbol : null,
    countryCurrency: country ?? null,
    countries: countries.data ?? [],
    features: runtimeFeatures,
    generatedAt: new Date().toISOString(),
  });
});
