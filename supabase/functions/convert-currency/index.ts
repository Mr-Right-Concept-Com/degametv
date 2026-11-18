import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cf-ipcountry",
  "Content-Type": "application/json",
};

const COUNTRY_CCY: Record<string, string> = {
  US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", ZA: "ZAR",
  GH: "GHS", KE: "KES", NG: "NGN", EG: "EGP", DE: "EUR",
  FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR",
  IE: "EUR", PT: "EUR", AT: "EUR", IN: "INR", JP: "JPY",
  CN: "CNY", BR: "BRL", MX: "MXN", AE: "AED", SA: "SAR",
};

const CCY_SYMBOL: Record<string, string> = {
  USD: "$", GBP: "£", EUR: "€", CAD: "C$", AUD: "A$",
  ZAR: "R", GHS: "GH₵", KES: "KSh", NGN: "₦", EGP: "E£",
  INR: "₹", JPY: "¥", CNY: "¥", BRL: "R$", MXN: "Mex$",
  AED: "AED", SAR: "SAR",
};

const requestSchema = z.object({
  amount: z.coerce.number().finite().positive().max(1_000_000_000),
  country: z.string().trim().length(2).optional(),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).optional(),
}).strict();

const responseSchema = z.object({
  rates: z.record(z.string(), z.number().finite().positive()),
}).passthrough();

const CACHE_TTL_MS = 5 * 60 * 1000;
const rateCache = new Map<string, { at: number; rates: Record<string, number> }>();

async function getRates(base: string): Promise<Record<string, number>> {
  const cached = rateCache.get(base);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.rates;

  const endpoint = Deno.env.get("FX_RATES_ENDPOINT");
  if (!endpoint) throw new Error("FX provider is not configured");

  const endpointUrl = new URL(endpoint);
  endpointUrl.searchParams.set("base", base);
  const apiKey = Deno.env.get("FX_RATES_API_KEY");
  const response = await fetch(endpointUrl, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`FX provider returned HTTP ${response.status}`);

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success || !parsed.data.rates[base]) throw new Error("FX provider returned an invalid rate set");

  rateCache.set(base, { at: Date.now(), rates: parsed.data.rates });
  return parsed.data.rates;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rawBody: unknown = req.method === "POST" ? await req.json() : {
      amount: url.searchParams.get("amount"),
      country: url.searchParams.get("country"),
      currency: url.searchParams.get("currency"),
    };
    const parsed = requestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid conversion request", issues: parsed.error.flatten() }), {
        status: 400, headers: corsHeaders,
      });
    }

    const country = (req.headers.get("cf-ipcountry") || parsed.data.country || "").toUpperCase();
    const targetCurrency = (parsed.data.currency || COUNTRY_CCY[country] || "USD").toUpperCase();
    const rates = await getRates("NGN");
    const rate = rates[targetCurrency];
    if (!rate) {
      return new Response(JSON.stringify({ error: "The requested currency is not supported by the configured FX provider." }), {
        status: 422, headers: corsHeaders,
      });
    }

    const converted = Math.round(parsed.data.amount * rate * 100) / 100;
    return new Response(JSON.stringify({
      country, currency: targetCurrency, symbol: CCY_SYMBOL[targetCurrency] || `${targetCurrency} `,
      original: parsed.data.amount, converted, rate, rateBase: "NGN", retrievedAt: new Date().toISOString(),
    }), { headers: corsHeaders });
  } catch {
    return new Response(JSON.stringify({
      error: "Currency conversion is temporarily unavailable. No estimated exchange rate was used.",
      code: "FX_PROVIDER_UNAVAILABLE",
    }), { status: 503, headers: corsHeaders });
  }
});
