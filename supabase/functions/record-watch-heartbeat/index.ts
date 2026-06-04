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

      const { watchCode, email, sessionId, deltaSeconds, position } = await req.json();
      if (!watchCode || !email || !sessionId) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders });
      }

      const country = (req.headers.get('cf-ipcountry') || '').toUpperCase() || null;

      const { data: ticket } = await supabase
        .from('screening_tickets')
        .select('id, screening_id, active_session_token')
        .eq('watch_code', watchCode)
        .eq('email', email)
        .maybeSingle();

      if (!ticket) return new Response(JSON.stringify({ error: 'Invalid ticket' }), { status: 404, headers: corsHeaders });

      // Refresh active session timestamp (keeps lock alive)
      await supabase.from('screening_tickets')
        .update({ active_session_started_at: new Date().toISOString() })
        .eq('id', ticket.id)
        .eq('active_session_token', sessionId);

      // Upsert-style watch_history record per session
      const { data: existing } = await supabase
        .from('watch_history')
        .select('id, watch_duration_seconds')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existing) {
        await supabase.from('watch_history').update({
          watch_duration_seconds: (existing.watch_duration_seconds || 0) + Math.max(0, Math.round(deltaSeconds || 0)),
          watch_position: Math.round(position || 0),
          last_watched_at: new Date().toISOString(),
          country,
        }).eq('id', existing.id);
      } else {
        await supabase.from('watch_history').insert({
          screening_id: ticket.screening_id,
          session_id: sessionId,
          watch_duration_seconds: Math.max(0, Math.round(deltaSeconds || 0)),
          watch_position: Math.round(position || 0),
          country,
        });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  });
}
