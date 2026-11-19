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
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
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
      ? await db.from("country_currency_rules").select("country_code,currency_code,currency_symbol")
          .eq("country_code", countryCode).eq("enabled", true).maybeSingle()
      : { data: null, error: null };
    if (countryRule.error) return respond({ error: "Country currency policy is unavailable." }, 503);

    const from = (parsed.data.fromCurrency ?? configuredBase).toUpperCase();
    const to = (parsed.data.toCurrency ?? parsed.data.currency ?? countryRule.data?.currency_code ?? "").toUpperCase();
    if (!/^[A-Z]{3}$/.test(to)) {
      return respond({ error: "Provide a target currency or a supported country so its currency can be resolved." }, 400);
    }
    if (from === to) {
      return respond({ country: countryCode ?? null, fromCurrency: from, toCurrency: to, original: parsed.data.amount, converted: parsed.data.amount, rate: 1, rateBase: from, provider: null, retrievedAt: new Date().toISOString() });
    }

    const { data: binding, error: bindingError } = await db.from("service_provider_bindings")
      .select("provider_key,base_url,endpoints,settings,is_live")
      .eq("capability", "fx_rates").eq("enabled", true).is("removed_at", null)
      .order("priority", { ascending: true }).limit(1).maybeSingle();
    if (bindingError || !binding?.base_url) {
      return respond({ error: "No active FX provider is configured.", code: "FX_PROVIDER_UNAVAILABLE" }, 503);
    }

    const { data: secretRows, error: secretError } = await db.rpc("get_service_provider_admin_secret", {
      p_capability: "fx_rates", p_provider_key: binding.provider_key,
    });
    const secret = Array.isArray(secretRows) ? secretRows[0] : null;
    const credential = binding.is_live ? secret?.live_credential : secret?.test_credential;
    if (secretError || !credential) return respond({ error: "The selected FX provider has no credential for its active mode." }, 503);

    const ratesPath = binding.endpoints?.rates;
    if (typeof ratesPath !== "string" || !ratesPath.startsWith("/") || ratesPath.startsWith("//")) {
      return respond({ error: "Configure a relative rates endpoint for the FX provider." }, 503);
    }
    const target = new URL(ratesPath, binding.base_url);
    if (target.origin !== new URL(binding.base_url).origin) return respond({ error: "FX endpoint host mismatch." }, 400);
    target.searchParams.set("base", from);
    const authHeader = typeof binding.settings?.auth_header === "string" ? binding.settings.auth_header : "Authorization";
    const authPrefix = typeof binding.settings?.auth_prefix === "string" ? binding.settings.auth_prefix : "Bearer ";
    const upstream = await fetch(target, {
      headers: { [authHeader]: authPrefix + credential, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) return respond({ error: "FX provider request failed.", providerStatus: upstream.status }, 502);

    const payload: unknown = await upstream.json();
    const configuredPath = typeof binding.settings?.rates_response_path === "string" ? binding.settings.rates_response_path : "";
    const rawRates = (configuredPath ? readPath(payload, configuredPath) : undefined)
      ?? readPath(payload, "rates")
      ?? readPath(payload, "data.rates")
      ?? readPath(payload, "conversion_rates")
      ?? readPath(payload, "data.conversion_rates");
    if (!rawRates || typeof rawRates !== "object" || Array.isArray(rawRates)) {
      return respond({ error: "FX provider response did not contain a supported rates object." }, 502);
    }
    const rates: Record<string, number> = {};
    for (const [code, value] of Object.entries(rawRates as Record<string, unknown>)) {
      const normalizedCode = code.toUpperCase();
      const normalizedRate = typeof value === "number" ? value : Number(value);
      if (/^[A-Z]{3}$/.test(normalizedCode) && Number.isFinite(normalizedRate) && normalizedRate > 0) {
        rates[normalizedCode] = normalizedRate;
      }
    }
    const rate = rates[to];
    if (!rate) return respond({ error: "The requested currency is not supported by the FX provider." }, 422);
    const converted = Math.round(parsed.data.amount * rate * 100) / 100;
    return respond({
      country: countryCode ?? null, fromCurrency: from, toCurrency: to,
      original: parsed.data.amount, converted, rate, rateBase: from,
      provider: binding.provider_key, mode: binding.is_live ? "live" : "test",
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("convert-currency", error);
    return respond({ error: "Currency conversion is temporarily unavailable. No estimated exchange rate was used.", code: "FX_PROVIDER_UNAVAILABLE" }, 503);
  }
});
