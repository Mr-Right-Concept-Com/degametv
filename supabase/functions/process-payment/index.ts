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
  const { method, email, screeningId } = body;
  if (!['stripe', 'paystack', 'flutterwave', 'bank'].includes(method))
    return { ok: false, error: 'Unsupported payment method' };
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255)
    return { ok: false, error: 'Invalid email address' };
  if (!['nigeria', 'international'].includes(body.location))
    return { ok: false, error: 'Invalid location' };
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

async function getSetting(supabase: any, key: string, fallback: any) {
  const { data } = await supabase.from('platform_settings').select('setting_value').eq('setting_key', key).maybeSingle();
  return data?.setting_value ?? fallback;
}

// Server-authoritative price: never trust the browser-supplied amount
async function computePrice(supabase: any, screening: any, body: any) {
  const isNg = body.location === 'nigeria';
  const isReplay = screening.lifecycle === 'replay';
  let pricing = screening.location_pricing;
  if (typeof pricing === 'string') pricing = JSON.parse(pricing);
  let base = isReplay
    ? Number(isNg ? screening.replay_price_ngn : screening.replay_price_usd) || Number(pricing?.[body.location]) || 0
    : Number(pricing?.[body.location]) || 0;
  let addonsTotal = 0;
  const chosen: any[] = [];
  if (isNg && Array.isArray(body.addons)) {
    const catalog: any[] = await getSetting(supabase, 'addons_catalog', []);
    for (const a of body.addons) {
      const item = catalog.find((c) => c.name === a?.name);
      if (item) { addonsTotal += Number(item.price) || 0; chosen.push(item); }
    }
  }
  let subtotal = base + addonsTotal;
  if (typeof body.promoCode === 'string' && body.promoCode.trim()) {
    const { data: promo } = await supabase.from('promo_codes').select('*')
      .eq('code', body.promoCode.toUpperCase().trim()).eq('is_active', true).maybeSingle();
    const valid = promo && (!promo.valid_until || new Date(promo.valid_until) > new Date())
      && (!promo.max_uses || promo.current_uses < promo.max_uses)
      && (!promo.screening_id || promo.screening_id === screening.id);
    if (valid) {
      const d = promo.discount_type === 'percentage' ? Math.round(subtotal * Number(promo.discount_value) / 100) : Number(promo.discount_value);
      subtotal = Math.max(0, subtotal - d);
      await supabase.from('promo_codes').update({ current_uses: (promo.current_uses || 0) + 1 }).eq('id', promo.id);
    }
  }
  const rules = await getSetting(supabase, 'stream_rules', { default_access_hours: 48 });
  return {
    amount: subtotal,
    currency: isNg ? 'NGN' : 'USD',
    addons: chosen,
    ticketKind: isReplay ? 'replay' : 'live',
    accessHours: isReplay ? screening.replay_access_hours : Number(rules?.default_access_hours) || 48,
  };
}

// Guest checkout: link ticket to an account for this email, creating one silently if needed
async function ensureGuestUser(supabase: any, email: string): Promise<string | null> {
  try {
    const { data: prof } = await supabase.from('profiles').select('user_id').ilike('email', email).maybeSingle();
    if (prof?.user_id) return prof.user_id;
    const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { guest_checkout: true } });
    if (error) { console.error('guest provision failed', error.message); return null; }
    return data.user?.id ?? null;
  } catch (e) { console.error('guest provision error', e); return null; }
}

async function handlePayment(supabase: any, body: any, gateway: string) {
  return new Response(
    JSON.stringify({ success: false, error: 'Online payments are not connected to a payment processor yet. No charge was made.' }),
    { status: 503, headers: corsHeaders }
  );

  const { email, screeningId, location } = body;

  const { data: screening, error: sErr } = await supabase
    .from('screenings')
    .select('id, tenant_id, status, lifecycle, location_pricing, replay_price_ngn, replay_price_usd, replay_access_hours, content_id')
    .eq('id', screeningId)
    .maybeSingle();
  if (sErr || !screening) {
    return new Response(JSON.stringify({ success: false, error: 'Screening not found' }), { status: 404, headers: corsHeaders });
  }
  if (['archived', 'cancelled'].includes(screening.lifecycle)) {
    return new Response(JSON.stringify({ success: false, error: 'This event is no longer on sale' }), { status: 409, headers: corsHeaders });
  }

  const priced = await computePrice(supabase, screening, body);
  const amount = priced.amount;
  const currency = priced.currency;
  const userId = await ensureGuestUser(supabase, email);

  const paymentRef = crypto.randomUUID();
  const ticketCode = `TICKET_${Date.now()}`;
  const watchCode = `WATCH_${crypto.randomUUID()}`;

  const { data: ticketRow, error: insErr } = await supabase.from('screening_tickets').insert({
    screening_id: screeningId,
    user_id: userId,
    email,
    ticket_code: ticketCode,
    watch_code: watchCode,
    location,
    price: amount,
    currency,
    addons: priced.addons,
    ticket_kind: priced.ticketKind,
    access_hours: priced.accessHours,
    payment_method: gateway,
    payment_reference: paymentRef,
    payment_status: 'completed',
    tenant_id: screening.tenant_id || '00000000-0000-0000-0000-000000000001',
  }).select('id').single();

  // Organizer wallet: commission rates and escrow hold come from platform settings
  if (!insErr && ticketRow) {
    try {
      const { data: c } = await supabase.from('content').select('creator_id').eq('id', screening.content_id).maybeSingle();
      if (c?.creator_id) {
        const rates = await getSetting(supabase, 'commission_rates', { creator: 0.10, business: 0.075 });
        const holdDays = Number(await getSetting(supabase, 'escrow_hold_days', 7)) || 7;
        const { data: acct } = await supabase.from('studio_accounts').select('tier, status').eq('user_id', c.creator_id).maybeSingle();
        const rate = acct?.tier === 'business' && acct?.status === 'approved' ? Number(rates.business) : Number(rates.creator);
        const fee = Math.round(amount * rate * 100) / 100;
        await supabase.from('wallet_ledger').insert({
          user_id: c.creator_id, ticket_id: ticketRow.id, screening_id: screeningId,
          gross: amount, fee, net: amount - fee, currency, kind: 'sale',
          settles_at: new Date(Date.now() + holdDays * 86400000).toISOString(),
        });
      }
    } catch (e) { console.error('ledger write failed', e); }
  }

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
      amount,
      currency,
      watchUrl: `/watch/${watchCode}?email=${encodeURIComponent(email)}`,
    }),
    { headers: corsHeaders }
  );
}

async function handleBankTransfer(supabase: any, body: any) {
  return new Response(
    JSON.stringify({ success: false, error: 'Bank transfer checkout is not configured yet. No ticket was issued.' }),
    { status: 503, headers: corsHeaders }
  );

  const { email, screeningId, location } = body;

  const { data: screening } = await supabase
    .from('screenings')
    .select('id, tenant_id, lifecycle, location_pricing, replay_price_ngn, replay_price_usd, replay_access_hours')
    .eq('id', screeningId)
    .maybeSingle();
  if (!screening) {
    return new Response(JSON.stringify({ success: false, error: 'Screening not found' }), { status: 404, headers: corsHeaders });
  }

  const priced = await computePrice(supabase, screening, body);
  const guestId = await ensureGuestUser(supabase, email);
  const paymentRef = crypto.randomUUID();
  const ticketCode = `TICKET_${Date.now()}`;
  const watchCode = `WATCH_${crypto.randomUUID()}`;

  const { error: insErr } = await supabase.from('screening_tickets').insert({
    screening_id: screeningId,
    user_id: guestId,
    email,
    ticket_code: ticketCode,
    watch_code: watchCode,
    location,
    price: priced.amount,
    currency: priced.currency,
    addons: priced.addons,
    ticket_kind: priced.ticketKind,
    access_hours: priced.accessHours,
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
