import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

// CORS headers
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

      const { method } = await req.json();

      if (method === 'stripe') {
        return handleStripePayment(supabase, req, corsHeaders);
      } else if (method === 'paystack') {
        return handlePaystackPayment(supabase, req, corsHeaders);
      } else if (method === 'flutterwave') {
        return handleFlutterWavePayment(supabase, req, corsHeaders);
      } else if (method === 'bank') {
        return handleBankTransfer(supabase, req, corsHeaders);
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

async function handleStripePayment(supabase: any, req: Request, corsHeaders: any) {
  // For now, using test key - admin can configure live key via settings
  const TEST_PUBLIC_KEY = 'pk_test_51234567890';
  const TEST_SECRET_KEY = 'sk_test_abcdefghijklmnop';

  // Get live keys from payment_gateways table if configured
  const { data: gatewayConfig } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('gateway_name', 'Stripe')
    .eq('is_enabled', true)
    .maybeSingle();

  const secretKey = gatewayConfig?.is_live 
    ? gatewayConfig.live_secret_key 
    : gatewayConfig?.test_secret_key || TEST_SECRET_KEY;

  const { email, amount, currency, screeningId, location, addons } = await req.json();

  // Mock payment processing
  const paymentRef = crypto.randomUUID();
  const ticketCode = `TICKET_${Date.now()}`;
  const watchCode = `WATCH_${crypto.randomUUID()}`;

  // Create ticket record
  await supabase.from('screening_tickets').insert({
    screening_id: screeningId,
    email,
    ticket_code: ticketCode,
    watch_code: watchCode,
    location,
    price: amount,
    currency: currency || 'NGN',
    addons: addons || {},
    payment_method: 'stripe',
    payment_reference: paymentRef,
    payment_status: 'completed',
    tenant_id: (await supabase.auth.getUser()).data?.user?.id,
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

async function handlePaystackPayment(supabase: any, req: Request, corsHeaders: any) {
  const TEST_SECRET_KEY = 'sk_test_paystack_key';

  const { data: gatewayConfig } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('gateway_name', 'Paystack')
    .eq('is_enabled', true)
    .maybeSingle();

  const secretKey = gatewayConfig?.is_live 
    ? gatewayConfig.live_secret_key 
    : gatewayConfig?.test_secret_key || TEST_SECRET_KEY;

  const { email, amount, currency, screeningId, location, addons } = await req.json();

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
    payment_method: 'paystack',
    payment_reference: paymentRef,
    payment_status: 'completed',
    tenant_id: (await supabase.auth.getUser()).data?.user?.id,
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

async function handleFlutterWavePayment(supabase: any, req: Request, corsHeaders: any) {
  const TEST_SECRET_KEY = 'sk_test_flutterwave_key';

  const { data: gatewayConfig } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('gateway_name', 'Flutterwave')
    .eq('is_enabled', true)
    .maybeSingle();

  const secretKey = gatewayConfig?.is_live 
    ? gatewayConfig.live_secret_key 
    : gatewayConfig?.test_secret_key || TEST_SECRET_KEY;

  const { email, amount, currency, screeningId, location, addons } = await req.json();

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
    payment_method: 'flutterwave',
    payment_reference: paymentRef,
    payment_status: 'completed',
    tenant_id: (await supabase.auth.getUser()).data?.user?.id,
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

async function handleBankTransfer(supabase: any, req: Request, corsHeaders: any) {
  const { email, amount, currency, screeningId, location, addons } = await req.json();

  const paymentRef = crypto.randomUUID();
  const ticketCode = `TICKET_${Date.now()}`;
  const watchCode = `WATCH_${crypto.randomUUID()}`;

  // Bank transfers start as pending
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
    tenant_id: (await supabase.auth.getUser()).data?.user?.id,
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
