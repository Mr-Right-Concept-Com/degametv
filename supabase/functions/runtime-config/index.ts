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

  const visitorId = typeof body?.visitorId === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.visitorId)
    ? body.visitorId
    : crypto.randomUUID();
  const profileQuery = userId
    ? db.from("profiles").select("preferred_country,preferred_currency,locale_code,preferred_locale,language,timezone").eq("user_id", userId).maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const [countries, features, profileResult, siteSetting, baseSetting, releaseResult] = await Promise.all([
    db.from("country_currency_rules")
      .select("country_code,currency_code,currency_symbol,locale_code,timezone_name,metadata")
      .eq("enabled", true).order("country_code"),
    db.from("platform_feature_controls")
      .select("feature_key,enabled,rollout_percentage,release_state"),
    profileQuery,
    db.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle(),
    db.from("platform_settings").select("setting_value").eq("setting_key","base_currency").maybeSingle(),
    db.from("platform_release_rollouts").select("release_key,release_version,state").in("state",["canary","approved"]),
  ]);
  if (countries.error || features.error || profileResult.error || siteSetting.error || baseSetting.error || releaseResult.error) {
    return response({ error: "Runtime configuration could not be loaded." }, 503);
  }

  const profile = profileResult.data;
  const configuredBaseCurrency = typeof baseSetting.data?.setting_value === "string" ? baseSetting.data.setting_value.toUpperCase() : "";
  if (!/^[A-Z]{3}$/.test(configuredBaseCurrency)) return response({ error: "Platform base currency is not configured." }, 503);
  const enabledCountries = countries.data ?? [];
  const enabledCountryCodes = new Set(enabledCountries.map((item) => item.country_code));
  const edgeCountry = req.headers.get("cf-ipcountry")?.toUpperCase();
  const requestedCountry = String(body?.country ?? requestUrl.searchParams.get("country") ?? "").toUpperCase();
  const acceptLanguage = req.headers.get("accept-language")?.split(",")[0]?.trim();
  const localeRegion = acceptLanguage?.split("-")[1]?.toUpperCase();
  const preferredCountry = profile?.preferred_country?.toUpperCase();
  const candidate = [preferredCountry, requestedCountry, edgeCountry, localeRegion]
    .find((value) => value && countrySchema.safeParse(value).success && enabledCountryCodes.has(value)) ?? null;
  const country = candidate ? enabledCountries.find((item) => item.country_code === candidate) : undefined;

  const supportedCurrencies = new Set(enabledCountries.map((item) => item.currency_code));
  const requestedCurrency = String(body?.currency ?? requestUrl.searchParams.get("currency") ?? "").toUpperCase();
  const preferredCurrency = profile?.preferred_currency?.toUpperCase();
  const currency = [requestedCurrency, preferredCurrency].find((value) =>
    value && currencySchema.safeParse(value).success && supportedCurrencies.has(value)
  ) ?? country?.currency_code ?? configuredBaseCurrency;

  const profileLocaleCandidate = profile?.preferred_locale ?? profile?.locale_code;
  const profileLocale = typeof profileLocaleCandidate === "string"
    && /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(profileLocaleCandidate)
    ? profileLocaleCandidate : null;
  const browserLocale = acceptLanguage && /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(acceptLanguage)
    ? acceptLanguage : null;
  const locale = profileLocale ?? browserLocale ?? country?.locale_code ?? "en";

  const cohortId = userId ?? visitorId;
  const rawWebUrl = typeof siteSetting.data?.setting_value === "string" ? siteSetting.data.setting_value : "";
  let webAppUrl: string | null = null;
  if (siteSetting.data?.is_public === true) {
    try { const parsedUrl = new URL(rawWebUrl); if (parsedUrl.protocol === "https:") webAppUrl = parsedUrl.origin; } catch { /* Invalid or unpublished URL is never exposed. */ }
  }
  const releases = await Promise.all((releaseResult.data ?? []).map(async release => {
    const {data,error} = await db.rpc("get_platform_release_assignment",{p_release_key:release.release_key,p_subject_id:cohortId});
    if(error) return null;
    const assignment = Array.isArray(data) ? data[0] : data;
    return assignment?.assigned === true ? {key:release.release_key,version:release.release_version,rolloutId:assignment.rollout_id} : null;
  }));

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
    webAppUrl,
    geo: { countryCode: candidate, source: candidate === preferredCountry ? "profile_preference" : candidate === requestedCountry ? "explicit" : candidate === edgeCountry ? "edge" : candidate === localeRegion ? "locale_hint" : "unknown" },
    timezone: profile?.timezone ?? country?.timezone_name ?? "UTC",
    language: profile?.language ?? locale.split("-")[0],
    locale,
    currency,
    baseCurrency: configuredBaseCurrency,
    currencySymbol: currency === country?.currency_code ? country.currency_symbol : null,
    countryCurrency: country ?? null,
    countries: countries.data ?? [],
    features: runtimeFeatures,
    releases: releases.filter(Boolean),
    generatedAt: new Date().toISOString(),
  });
});
