import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cf-ipcountry',
};

// Country -> currency mapping for top markets
const COUNTRY_CCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', ZA: 'ZAR',
  GH: 'GHS', KE: 'KES', NG: 'NGN', EG: 'EGP', DE: 'EUR',
  FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR',
  IE: 'EUR', PT: 'EUR', AT: 'EUR', IN: 'INR', JP: 'JPY',
  CN: 'CNY', BR: 'BRL', MX: 'MXN', AE: 'AED', SA: 'SAR',
};

const CCY_SYMBOL: Record<string, string> = {
  USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$',
  ZAR: 'R', GHS: 'GH₵', KES: 'KSh', NGN: '₦', EGP: 'E£',
  INR: '₹', JPY: '¥', CNY: '¥', BRL: 'R$', MXN: 'Mex$',
  AED: 'AED', SAR: 'SAR',
};

let cache: { at: number; rates: Record<string, number> } | null = null;

async function getRates(base = 'NGN'): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < 6 * 60 * 60 * 1000) return cache.rates;
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    const j = await r.json();
    if (j?.rates) {
      cache = { at: Date.now(), rates: j.rates };
      return j.rates;
    }
  } catch {}
  // Fallback static approx (NGN base)
  return { USD: 0.00065, GBP: 0.00052, EUR: 0.0006, NGN: 1, ZAR: 0.012, GHS: 0.01, KES: 0.085, CAD: 0.00089, AUD: 0.00099 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const amount = Number(url.searchParams.get('amount') || '0');
    const fromBody = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const baseAmount = Number(fromBody.amount ?? amount);
    const country = (req.headers.get('cf-ipcountry') || fromBody.country || url.searchParams.get('country') || '').toUpperCase();
    const targetCcy = (fromBody.currency || COUNTRY_CCY[country] || 'USD').toUpperCase();
    const rates = await getRates('NGN');
    const rate = rates[targetCcy] ?? rates.USD ?? 0.00065;
    const converted = Math.round(baseAmount * rate * 100) / 100;
    return new Response(JSON.stringify({
      country, currency: targetCcy, symbol: CCY_SYMBOL[targetCcy] || targetCcy + ' ',
      original: baseAmount, converted, rate,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
