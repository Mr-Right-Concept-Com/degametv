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

      // Mark refunded — actual gateway-side refund integration is gateway-specific and noted
      // in payment_gateways admin notes. For now we record the refund and invalidate access.
      await supabase
        .from('screening_tickets')
        .update({
          refunded_at: new Date().toISOString(),
          refund_reason: reason || 'Admin refund',
          payment_status: 'refunded',
        })
        .eq('id', ticketId);

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'ticket_refund',
        resource_type: 'screening_ticket',
        resource_id: ticketId,
        metadata: { reason, amount: ticket.price, currency: ticket.currency },
      });

      return new Response(
        JSON.stringify({ success: true, refundedAt: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  });
}
