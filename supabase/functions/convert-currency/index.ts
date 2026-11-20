import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cf-ipcountry",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const schema = z.object({
  amount: z.coerce.number().finite().min(0).max(1_000_000_000),
  fromCurrency: z.string().trim().regex(/^[A-Za-z]{3}$/).optional(),
  toCurrency: z.string().trim().regex(/^[A-Za-z]{3}$/).optional(),
  country: z.string().trim().regex(/^[A-Za-z]{2}$/).optional(),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).optional(),
}).strict();
const respond = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers: cors });

function readPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (Array.isArray(current)) {
      const index = Number(key);
      return Number.isInteger(index) && index >= 0 ? current[index] : undefined;
    }
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}
function currencyDigits(currency: string): number {
  try { return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits; }
  catch { return 2; }
}
function endpointFor(baseUrl: string, path: string): URL {
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" || base.username || base.password
    || base.hostname === "localhost" || base.hostname.endsWith(".localhost")
    || base.hostname.endsWith(".local") || base.hostname.endsWith(".internal")) {
    throw new Error("FX provider base URL must be a public HTTPS origin.");
  }
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("FX endpoint must be a relative path.");
  const target = new URL(path, base);
  if (target.origin !== base.origin) throw new Error("FX endpoint host mismatch.");
  return target;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "GET" && req.method !== "POST") return respond({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return respond({ error: "FX service is not configured." }, 503);

  try {
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const requestUrl = new URL(req.url);
    const raw = req.method === "POST" ? await req.json() : {
      amount: requestUrl.searchParams.get("amount"),
      fromCurrency: requestUrl.searchParams.get("fromCurrency") ?? undefined,
      toCurrency: requestUrl.searchParams.get("toCurrency") ?? requestUrl.searchParams.get("currency") ?? undefined,
      country: requestUrl.searchParams.get("country") ?? undefined,
      currency: requestUrl.searchParams.get("currency") ?? undefined,
    };
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return respond({ error: "Invalid conversion request.", issues: parsed.error.flatten() }, 400);

    const { data: baseSetting, error: baseSettingError } = await db.from("platform_settings")
      .select("setting_value").eq("setting_key", "base_currency").maybeSingle();
    const configuredBase = typeof baseSetting?.setting_value === "string" ? baseSetting.setting_value.toUpperCase() : "";
    if (baseSettingError || !/^[A-Z]{3}$/.test(configuredBase)) {
      return respond({ error: "Platform base currency is not configured.", code: "BASE_CURRENCY_UNCONFIGURED" }, 503);
    }

    const edgeCountry = req.headers.get("cf-ipcountry")?.toUpperCase();
    const countryCode = parsed.data.country?.toUpperCase()
      ?? (edgeCountry && /^[A-Z]{2}$/.test(edgeCountry) ? edgeCountry : undefined);
    const countryRule = countryCode
      ? await db.from("country_currency_rules").select("country_code,currency_code,currency_symbol,locale_code,timezone_name")
          .eq("country_code", countryCode).eq("enabled", true).maybeSingle()
      : { data: null, error: null };
    if (countryRule.error) return respond({ error: "Country currency policy is unavailable." }, 503);
    if (countryCode && !countryRule.data) return respond({ error: "Selected country is not enabled for platform transactions." }, 422);

    const from = (parsed.data.fromCurrency ?? configuredBase).toUpperCase();
    const to = (parsed.data.toCurrency ?? parsed.data.currency ?? countryRule.data?.currency_code ?? "").toUpperCase();
    if (!/^[A-Z]{3}$/.test(to)) return respond({ error: "Provide a target currency or a supported country so its currency can be resolved." }, 400);
    const {data:currencyRows,error:currencyError}=await db.from("country_currency_rules").select("currency_code").eq("enabled",true);
    if(currencyError)return respond({error:"Enabled currency policy is unavailable."},503);
    const supportedCurrencies=new Set((currencyRows??[]).map(row=>row.currency_code));
    if(!supportedCurrencies.has(from)||!supportedCurrencies.has(to))return respond({error:"Source and target currencies must both be enabled ISO 4217 currencies."},422);
    if (from === to) {
      return respond({ country: countryCode ?? null, fromCurrency: from, toCurrency: to, original: parsed.data.amount,
        converted: parsed.data.amount, rate: 1, rateBase: from, provider: null, retrievedAt: new Date().toISOString(), cache: "identity" });
    }

    const now = new Date();
    const { data: cached } = await db.from("platform_fx_rate_cache")
      .select("rate,provider_key,retrieved_at,expires_at")
      .eq("base_currency", from).eq("quote_currency", to).gt("expires_at", now.toISOString())
      .order("retrieved_at", { ascending: false }).limit(1).maybeSingle();
    let rate = cached ? Number(cached.rate) : 0;
    let provider = cached?.provider_key ?? null;
    let retrievedAt = cached?.retrieved_at ?? null;
    let cache: "hit" | "miss" = cached ? "hit" : "miss";

    if (!cached) {
      const { data: bindings, error: bindingError } = await db.from("service_provider_bindings")
        .select("provider_key,base_url,endpoints,settings,is_live,priority")
        .eq("capability", "fx_rates").eq("enabled", true).eq("health_status", "healthy").is("removed_at", null)
        .order("priority", { ascending: true }).order("provider_key", { ascending: true });
      if (bindingError) return respond({ error: "FX provider routing is unavailable." }, 503);
      if (!bindings?.length) return respond({ error: "No active FX provider is configured.", code: "FX_PROVIDER_UNAVAILABLE" }, 503);

      const failures: string[] = [];
      for (const binding of bindings) {
        try {
          if (!binding.base_url) throw new Error("Provider base URL is missing.");
          const { data: secretRows, error: secretError } = await db.rpc("get_service_provider_admin_secret", {
            p_capability: "fx_rates", p_provider_key: binding.provider_key,
          });
          const secret = Array.isArray(secretRows) ? secretRows[0] : null;
          const credential = binding.is_live ? secret?.live_credential : secret?.test_credential;
          if (secretError || !credential) throw new Error("Credential unavailable for configured mode.");
          const ratesPath = binding.endpoints?.rates;
          if (typeof ratesPath !== "string") throw new Error("Relative rates endpoint is not configured.");
          const target = endpointFor(binding.base_url, ratesPath);
          target.searchParams.set("base", from);
          const authHeader = typeof binding.settings?.auth_header === "string" ? binding.settings.auth_header : "Authorization";
          const authPrefix = typeof binding.settings?.auth_prefix === "string" ? binding.settings.auth_prefix : "Bearer ";
          const upstream = await fetch(target, {
            headers: { [authHeader]: authPrefix + credential, Accept: "application/json" },
            signal: AbortSignal.timeout(8000),
          });
          if (!upstream.ok) throw new Error("Provider returned HTTP " + upstream.status);
          const payload: unknown = await upstream.json();
          const configuredPath = typeof binding.settings?.rates_response_path === "string" ? binding.settings.rates_response_path : "";
          const rawRates = (configuredPath ? readPath(payload, configuredPath) : undefined)
            ?? readPath(payload, "rates") ?? readPath(payload, "data.rates")
            ?? readPath(payload, "conversion_rates") ?? readPath(payload, "data.conversion_rates");
          if (!rawRates || typeof rawRates !== "object" || Array.isArray(rawRates)) throw new Error("Response has no rates object.");
          const rawRate = (rawRates as Record<string, unknown>)[to];
          const candidateRate = typeof rawRate === "number" ? rawRate : Number(rawRate);
          if (!Number.isFinite(candidateRate) || candidateRate <= 0) throw new Error("Requested currency rate is missing or invalid.");
          rate = candidateRate;
          provider = binding.provider_key;
          retrievedAt = new Date().toISOString();
          const ttlSetting = Number(binding.settings?.cache_ttl_seconds ?? 900);
          const ttlSeconds = Number.isFinite(ttlSetting) ? Math.min(86400, Math.max(60, Math.floor(ttlSetting))) : 900;
          const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
          const payloadHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)))
            .then(bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join(""));
          const { error: cacheError } = await db.from("platform_fx_rate_cache").upsert({
            base_currency: from, quote_currency: to, rate, provider_key: provider,
            retrieved_at: retrievedAt, expires_at: expiresAt, provider_payload_hash: payloadHash,
          }, { onConflict: "base_currency,quote_currency,provider_key" });
          if (cacheError) console.error("fx-cache-write", cacheError.message);
          break;
        } catch (error) {
          failures.push(binding.provider_key + ": " + (error instanceof Error ? error.message : "provider failure"));
          await db.from("service_provider_bindings").update({
            health_status: "unhealthy", health_checked_at: new Date().toISOString(),
            health_error: (error instanceof Error ? error.message : "Provider failure").slice(0, 500),
          }).eq("capability", "fx_rates").eq("provider_key", binding.provider_key);
        }
      }
      if (!rate || !provider) return respond({ error: "All configured FX providers failed. No estimated exchange rate was used.", code: "FX_PROVIDER_UNAVAILABLE", failures }, 503);
      await db.from("service_provider_bindings").update({
        health_status: "healthy", health_checked_at: new Date().toISOString(), health_error: null,
      }).eq("capability", "fx_rates").eq("provider_key", provider);
    }

    const converted = Number((parsed.data.amount * rate).toFixed(currencyDigits(to)));
    return respond({
      country: countryCode ?? null, fromCurrency: from, toCurrency: to,
      original: parsed.data.amount, converted, rate, rateBase: from, provider,
      retrievedAt, cache, currencyDigits: currencyDigits(to),
      countryCurrency: countryRule.data ?? null,
    });
  } catch (error) {
    console.error("convert-currency", error instanceof Error ? error.message : "Unknown FX error");
    return respond({ error: "Currency conversion is temporarily unavailable. No estimated exchange rate was used.", code: "FX_PROVIDER_UNAVAILABLE" }, 503);
  }
});
