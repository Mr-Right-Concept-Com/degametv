import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

if (import.meta.main) {
  serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );

      const { watchCode, email } = await req.json();

      if (!watchCode) {
        return new Response(
          JSON.stringify({ error: 'Watch code is required' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Find ticket by watch code
      const { data: ticket, error } = await supabase
        .from('screening_tickets')
        .select(`
          *,
          screening:screenings(*)
        `)
        .eq('watch_code', watchCode)
        .eq('payment_status', 'completed')
        .maybeSingle();

      if (error || !ticket) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired watch link' }),
          { status: 404, headers: corsHeaders }
        );
      }

      // Check if email matches (if provided)
      if (email && ticket.email !== email) {
        return new Response(
          JSON.stringify({ error: 'Email does not match ticket' }),
          { status: 403, headers: corsHeaders }
        );
      }

      // Check if ticket has expired
      if (new Date(ticket.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Ticket has expired' }),
          { status: 403, headers: corsHeaders }
        );
      }

      // Update last accessed
      await supabase
        .from('screening_tickets')
        .update({ used_at: new Date().toISOString() })
        .eq('id', ticket.id);

      return new Response(
        JSON.stringify({
          success: true,
          ticket: {
            id: ticket.id,
            movieTitle: ticket.screening.title,
            moviePoster: ticket.screening.poster_url,
            expiresAt: ticket.expires_at,
            location: ticket.location,
            email: ticket.email,
            videoUrl: ticket.screening.video_url, // Would be actual video URL in production
          },
        }),
        { headers: corsHeaders }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  });
}
