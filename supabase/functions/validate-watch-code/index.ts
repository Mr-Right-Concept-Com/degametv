import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cf-ipcountry',
};

if (import.meta.main) {
  serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { watchCode, email } = await req.json();
      if (!watchCode) {
        return new Response(JSON.stringify({ error: 'Watch code is required' }), { status: 400, headers: corsHeaders });
      }

      const country = (req.headers.get('cf-ipcountry') || '').toUpperCase() || null;
      const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

      const { data: ticket, error } = await supabase
        .from('screening_tickets')
        .select(`*, screening:screenings(*)`)
        .eq('watch_code', watchCode)
        .eq('payment_status', 'completed')
        .maybeSingle();

      if (error || !ticket) {
        return new Response(JSON.stringify({ error: 'Invalid or expired watch link' }), { status: 404, headers: corsHeaders });
      }
      if (email && ticket.email !== email) {
        return new Response(JSON.stringify({ error: 'Email does not match ticket' }), { status: 403, headers: corsHeaders });
      }
      if (ticket.refunded_at) {
        return new Response(JSON.stringify({ error: 'This ticket was refunded and is no longer valid' }), { status: 403, headers: corsHeaders });
      }
      if (new Date(ticket.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Ticket has expired' }), { status: 403, headers: corsHeaders });
      }

      // Timed entitlement: window starts at first play
      if (ticket.first_played_at && ticket.access_hours) {
        const ends = new Date(ticket.first_played_at).getTime() + ticket.access_hours * 3600000;
        if (Date.now() > ends) {
          return new Response(JSON.stringify({ error: `Your ${ticket.access_hours}-hour viewing window has ended` }), { status: 403, headers: corsHeaders });
        }
      }

      const s = ticket.screening;
      // Geo enforcement
      if (country) {
        if (Array.isArray(s.blocked_countries) && s.blocked_countries.includes(country)) {
          return new Response(JSON.stringify({ error: `This premiere is not available in ${country}` }), { status: 451, headers: corsHeaders });
        }
        if (Array.isArray(s.allowed_countries) && s.allowed_countries.length > 0 && !s.allowed_countries.includes(country)) {
          return new Response(JSON.stringify({ error: `This premiere is not available in ${country}` }), { status: 451, headers: corsHeaders });
        }
      }

      // Stream cap
      const maxStreams = s.max_streams_per_ticket ?? 5;
      const streamsRemaining = Math.max(0, maxStreams - (ticket.stream_count || 0));

      await supabase.from('screening_tickets').update({
        used_at: new Date().toISOString(),
        ...(ticket.first_played_at ? {} : { first_played_at: new Date().toISOString() }),
        last_ip: ip,
        last_country: country,
      }).eq('id', ticket.id);

      return new Response(JSON.stringify({
        success: true,
        ticket: {
          id: ticket.id,
          watchCode: ticket.watch_code,
          movieTitle: s.title,
          moviePoster: s.poster_url,
          expiresAt: ticket.expires_at,
          location: ticket.location,
          email: ticket.email,
          videoUrl: s.video_url,
          streamsRemaining,
          maxStreams,
          maxConcurrent: s.max_concurrent_streams ?? 1,
          country,
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  });
}
