import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketRow {
  id: string;
  email: string;
  watch_code: string;
  reminder_24h_sent_at: string | null;
  reminder_1h_sent_at: string | null;
  screening: { id: string; title: string; slug: string; screening_date: string; poster_url: string | null };
}

async function sendEmail(supabase: any, to: string, subject: string, html: string) {
  let key = Deno.env.get('RESEND_API_KEY') || '';
  let from = 'DeGameTV <noreply@degametv.com>';
  const { data: cfg } = await supabase.from('platform_settings').select('setting_value').eq('setting_key', 'email_provider').maybeSingle();
  if (cfg?.setting_value) {
    const s = cfg.setting_value as Record<string, string>;
    const k = s.mode === 'live' ? s.live_api_key : s.test_api_key;
    if (k && k !== 're_test_placeholder') key = k;
    if (s.from_name && s.from_email) from = `${s.from_name} <${s.from_email}>`;
  }
  if (!key) {
    console.log('[MOCK REMINDER]', to, subject);
    return true;
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  return r.ok;
}

function reminderHtml(title: string, when: string, watchUrl: string, posterUrl: string | null) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#0f0f0f;font-family:-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #333;">
    ${posterUrl ? `<img src="${posterUrl}" alt="${title}" style="width:100%;display:block;"/>` : ''}
    <div style="padding:28px;color:white;text-align:center;">
      <h1 style="margin:0 0 8px;font-size:24px;">🎬 ${when}!</h1>
      <p style="color:#aaa;margin:0 0 24px;"><strong>${title}</strong> is about to premiere.</p>
      <a href="${watchUrl}" style="display:inline-block;background:#EB6062;color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:700;">▶ Watch Now</a>
    </div>
  </div>
</div></body></html>`;
}

if (import.meta.main) {
  serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const now = new Date();
      const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
      const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      const in75m = new Date(now.getTime() + 75 * 60 * 1000);
      const in45m = new Date(now.getTime() + 45 * 60 * 1000);

      // 24h reminders
      const { data: t24 } = await supabase
        .from('screening_tickets')
        .select('id,email,watch_code,reminder_24h_sent_at,reminder_1h_sent_at,screening:screenings!inner(id,title,slug,screening_date,poster_url)')
        .eq('payment_status', 'completed')
        .is('reminder_24h_sent_at', null)
        .gte('screening.screening_date', in23h.toISOString())
        .lte('screening.screening_date', in25h.toISOString());

      const { data: t1 } = await supabase
        .from('screening_tickets')
        .select('id,email,watch_code,reminder_24h_sent_at,reminder_1h_sent_at,screening:screenings!inner(id,title,slug,screening_date,poster_url)')
        .eq('payment_status', 'completed')
        .is('reminder_1h_sent_at', null)
        .gte('screening.screening_date', in45m.toISOString())
        .lte('screening.screening_date', in75m.toISOString());

      const origin = Deno.env.get('PUBLIC_APP_URL') || 'https://degametv.com';
      let sent = 0;

      for (const t of (t24 || []) as unknown as TicketRow[]) {
        const url = `${origin}/watch/${t.watch_code}?email=${encodeURIComponent(t.email)}`;
        const ok = await sendEmail(supabase, t.email, `Reminder: "${t.screening.title}" premieres in 24 hours`, reminderHtml(t.screening.title, 'Premieres in 24 hours', url, t.screening.poster_url));
        if (ok) {
          await supabase.from('screening_tickets').update({ reminder_24h_sent_at: new Date().toISOString() }).eq('id', t.id);
          sent++;
        }
      }
      for (const t of (t1 || []) as unknown as TicketRow[]) {
        const url = `${origin}/watch/${t.watch_code}?email=${encodeURIComponent(t.email)}`;
        const ok = await sendEmail(supabase, t.email, `Starting soon: "${t.screening.title}" premieres in 1 hour`, reminderHtml(t.screening.title, 'Premieres in 1 hour', url, t.screening.poster_url));
        if (ok) {
          await supabase.from('screening_tickets').update({ reminder_1h_sent_at: new Date().toISOString() }).eq('id', t.id);
          sent++;
        }
      }

      return new Response(JSON.stringify({ success: true, sent, checked24h: t24?.length || 0, checked1h: t1?.length || 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  });
}
