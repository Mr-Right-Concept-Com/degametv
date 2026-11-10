import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/json',
};

if (import.meta.main) {
  serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), { status: 400, headers: corsHeaders });
    }

    const method = typeof body === 'object' && body !== null && 'method' in body
      ? String((body as { method: unknown }).method)
      : '';
    if (!['stripe', 'paystack', 'flutterwave', 'bank'].includes(method)) {
      return new Response(JSON.stringify({ success: false, error: 'Unsupported payment method' }), { status: 400, headers: corsHeaders });
    }

    const message = method === 'bank'
      ? 'Bank transfer checkout is not configured. No ticket was issued.'
      : 'Secure payment processing is not configured. No charge was made and no ticket was issued.';
    return new Response(JSON.stringify({ success: false, error: message }), { status: 503, headers: corsHeaders });
  });
}
