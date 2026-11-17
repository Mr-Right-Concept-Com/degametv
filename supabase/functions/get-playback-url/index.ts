import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cf-ipcountry',
};

// Simple HMAC-based signed URL token (5 minute TTL)
async function signToken(payload: Record<string, unknown>) {
  const secret = Deno.env.get('PLAYBACK_SIGNING_KEY') || '';
  const data = btoa(JSON.stringify({ ...payload, exp: Date.now() + 5 * 60 * 1000 }));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${data}.${sigB64}`;
}

if (import.meta.main) {
  serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { watchCode, email, sessionId } = await req.json();
      if (!watchCode || !email) {
        return new Response(JSON.stringify({ error: 'watchCode and email required' }), { status: 400, headers: corsHeaders });
      }

      const country = (req.headers.get('cf-ipcountry') || '').toUpperCase() || null;
      const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

      const { data: ticket } = await supabase
        .from('screening_tickets')
        .select('*, screening:screenings(*)')
        .eq('watch_code', watchCode)
        .eq('email', email)
        .maybeSingle();

      if (!ticket || ticket.payment_status !== 'completed') {
        return new Response(JSON.stringify({ error: 'Invalid ticket' }), { status: 404, headers: corsHeaders });
      }
      if (ticket.refunded_at) {
        return new Response(JSON.stringify({ error: 'Ticket refunded' }), { status: 403, headers: corsHeaders });
      }
      if (new Date(ticket.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Ticket expired' }), { status: 403, headers: corsHeaders });
      }

      const s = ticket.screening;
      // Geo enforcement
      if (country) {
        if (Array.isArray(s.blocked_countries) && s.blocked_countries.includes(country)) {
          return new Response(JSON.stringify({ error: `Not available in ${country}` }), { status: 451, headers: corsHeaders });
        }
        if (Array.isArray(s.allowed_countries) && s.allowed_countries.length > 0 && !s.allowed_countries.includes(country)) {
          return new Response(JSON.stringify({ error: `Not available in ${country}` }), { status: 451, headers: corsHeaders });
        }
      }

      // Stream count cap
      const maxStreams = s.max_streams_per_ticket ?? 5;
      if (ticket.stream_count >= maxStreams) {
        return new Response(JSON.stringify({ error: `Stream limit reached (${maxStreams})` }), { status: 429, headers: corsHeaders });
      }

      // Concurrent sessions
      const maxConcurrent = s.max_concurrent_streams ?? 1;
      const sid = sessionId || crypto.randomUUID();
      if (maxConcurrent === 1 && ticket.active_session_token && ticket.active_session_token !== sid) {
        const started = ticket.active_session_started_at ? new Date(ticket.active_session_started_at) : null;
        // Allow takeover after 2 minutes of no heartbeat
        if (started && Date.now() - started.getTime() < 2 * 60 * 1000) {
          return new Response(JSON.stringify({ error: 'Already streaming on another device' }), { status: 409, headers: corsHeaders });
        }
      }

      await supabase.from('screening_tickets').update({
        stream_count: (ticket.stream_count || 0) + 1,
        active_session_token: sid,
        active_session_started_at: new Date().toISOString(),
        last_ip: ip,
        last_country: country,
        used_at: ticket.used_at || new Date().toISOString(),
      }).eq('id', ticket.id);

      const videoUrl = typeof s.video_url === 'string' ? s.video_url.trim() : '';
      if (!videoUrl || !/^https:\/\//i.test(videoUrl)) {
        return new Response(JSON.stringify({ error: 'Protected playback is not configured for this title. No fallback stream is available.' }), { status: 503, headers: corsHeaders });
      }
      if (!Deno.env.get('PLAYBACK_SIGNING_KEY')) {
        return new Response(JSON.stringify({ error: 'Playback signing is not configured. Contact the platform administrator.' }), { status: 503, headers: corsHeaders });
      }
      const token = await signToken({ ticketId: ticket.id, sid, screeningId: s.id });
      const playbackUrl = `${videoUrl}${videoUrl.includes('?') ? '&' : '?'}t=${encodeURIComponent(token)}`;

      return new Response(JSON.stringify({
        success: true,
        playbackUrl,
        sessionId: sid,
        country,
        expiresIn: 300,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  });
}
