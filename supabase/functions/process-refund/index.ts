import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

if (import.meta.main) {
  serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Verify caller is admin
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

      const { data: isAdmin } = await supabase.rpc('is_super_admin', { _user_id: user.id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Admin required' }), { status: 403, headers: corsHeaders });
      }

      const { ticketId, reason } = await req.json();
      if (!ticketId) {
        return new Response(JSON.stringify({ error: 'ticketId required' }), { status: 400, headers: corsHeaders });
      }

      const { data: ticket } = await supabase
        .from('screening_tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();

      if (!ticket) {
        return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404, headers: corsHeaders });
      }
      if (ticket.refunded_at) {
        return new Response(JSON.stringify({ error: 'Already refunded' }), { status: 400, headers: corsHeaders });
      }

      return new Response(
        JSON.stringify({ error: 'Automatic refunds are not connected to a payment processor. No refund was issued and ticket access was not changed.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  });
}
