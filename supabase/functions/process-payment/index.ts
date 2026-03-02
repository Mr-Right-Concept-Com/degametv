import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

if (import.meta.main) {
  serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Parse body ONCE
      const body = await req.json();
      const { method } = body;

      if (method === 'stripe') {
        return handlePayment(supabase, body, 'stripe', corsHeaders);
      } else if (method === 'paystack') {
        return handlePayment(supabase, body, 'paystack', corsHeaders);
      } else if (method === 'flutterwave') {
        return handlePayment(supabase, body, 'flutterwave', corsHeaders);
      } else if (method === 'bank') {
        return handleBankTransfer(supabase, body, corsHeaders);
      }

      return new Response(
        JSON.stringify({ error: 'Unknown payment method' }),
        { status: 400, headers: corsHeaders }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  });
}

async function handlePayment(supabase: any, body: any, gateway: string, corsHeaders: any) {
  const gatewayName = gateway === 'stripe' ? 'Stripe' : gateway === 'paystack' ? 'Paystack' : 'Flutterwave';

  const { data: gatewayConfig } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('gateway_name', gatewayName)
    .eq('is_enabled', true)
    .maybeSingle();

  const { email, amount, currency, screeningId, location, addons } = body;

  const paymentRef = crypto.randomUUID();
  const ticketCode = `TICKET_${Date.now()}`;
  const watchCode = `WATCH_${crypto.randomUUID()}`;

  await supabase.from('screening_tickets').insert({
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
    tenant_id: '00000000-0000-0000-0000-000000000001',
  });

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

async function handleBankTransfer(supabase: any, body: any, corsHeaders: any) {
  const { email, amount, currency, screeningId, location, addons } = body;

  const paymentRef = crypto.randomUUID();
  const ticketCode = `TICKET_${Date.now()}`;
  const watchCode = `WATCH_${crypto.randomUUID()}`;

  await supabase.from('screening_tickets').insert({
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
    tenant_id: '00000000-0000-0000-0000-000000000001',
  });

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
