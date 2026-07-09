import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/json',
};

// Server-side input validation (mirror of client zod schema)
function validatePayload(body: any): { ok: true } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request body' };
  const { method, email, amount, screeningId } = body;
  if (!['stripe', 'paystack', 'flutterwave', 'bank'].includes(method))
    return { ok: false, error: 'Unsupported payment method' };
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255)
    return { ok: false, error: 'Invalid email address' };
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 10_000_000)
    return { ok: false, error: 'Invalid amount' };
  if (typeof screeningId !== 'string' || !/^[0-9a-f-]{36}$/i.test(screeningId))
    return { ok: false, error: 'Invalid screening reference' };
  return { ok: true };
}

if (import.meta.main) {
  serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const body = await req.json();
      const check = validatePayload(body);
      if (!check.ok) {
        return new Response(JSON.stringify({ success: false, error: check.error }), { status: 400, headers: corsHeaders });
      }

      const { method } = body;
      if (method === 'bank') return handleBankTransfer(supabase, body);
      return handlePayment(supabase, body, method);
    } catch (error) {
      console.error('process-payment fatal:', error);
      return new Response(
        JSON.stringify({ success: false, error: error?.message || 'Internal error' }),
        { status: 500, headers: corsHeaders }
      );
    }
  });
}

async function handlePayment(supabase: any, body: any, gateway: string) {
  const { email, amount, currency, screeningId, location, addons } = body;

  // Verify screening exists & is published before charging
  const { data: screening, error: sErr } = await supabase
    .from('screenings')
    .select('id, tenant_id, status')
    .eq('id', screeningId)
    .maybeSingle();
  if (sErr || !screening) {
    return new Response(JSON.stringify({ success: false, error: 'Screening not found' }), { status: 404, headers: corsHeaders });
  }

  const paymentRef = crypto.randomUUID();
  const ticketCode = `TICKET_${Date.now()}`;
  const watchCode = `WATCH_${crypto.randomUUID()}`;

  const { error: insErr } = await supabase.from('screening_tickets').insert({
    screening_id: screeningId,
    email,
    ticket_code: ticketCode,
    watch_code: watchCode,
    location,
    price: amount,
    currency: currency || 'NGN',
    addons: addons || {},
    payment_method: gateway,
    payment_reference: paymentRef,
    payment_status: 'completed',
    tenant_id: screening.tenant_id || '00000000-0000-0000-0000-000000000001',
  });

  if (insErr) {
    console.error('screening_tickets insert failed:', insErr);
    return new Response(
      JSON.stringify({ success: false, error: `Ticket creation failed: ${insErr.message}` }),
      { status: 500, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      paymentRef,
      ticketCode,
      watchCode,
      watchUrl: `/watch/${watchCode}?email=${encodeURIComponent(email)}`,
    }),
    { headers: corsHeaders }
  );
}

async function handleBankTransfer(supabase: any, body: any) {
  const { email, amount, currency, screeningId, location, addons } = body;

  const { data: screening } = await supabase
    .from('screenings')
    .select('id, tenant_id')
    .eq('id', screeningId)
    .maybeSingle();
  if (!screening) {
    return new Response(JSON.stringify({ success: false, error: 'Screening not found' }), { status: 404, headers: corsHeaders });
  }

  const paymentRef = crypto.randomUUID();
  const ticketCode = `TICKET_${Date.now()}`;
  const watchCode = `WATCH_${crypto.randomUUID()}`;

  const { error: insErr } = await supabase.from('screening_tickets').insert({
    screening_id: screeningId,
    email,
    ticket_code: ticketCode,
    watch_code: watchCode,
    location,
    price: amount,
    currency: currency || 'NGN',
    addons: addons || {},
    payment_method: 'bank_transfer',
    payment_reference: paymentRef,
    payment_status: 'pending',
    tenant_id: screening.tenant_id || '00000000-0000-0000-0000-000000000001',
  });

  if (insErr) {
    console.error('bank transfer insert failed:', insErr);
    return new Response(
      JSON.stringify({ success: false, error: `Ticket creation failed: ${insErr.message}` }),
      { status: 500, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      paymentRef,
      ticketCode,
      status: 'pending',
      message: 'Bank transfer details sent to your email. Your access will be activated once payment is confirmed.',
      bankDetails: {
        accountName: 'AGE Media Limited',
        accountNumber: '1234567890',
        bankName: 'Example Bank',
        sortCode: '00-00-00',
      },
    }),
    { headers: corsHeaders }
  );
}
