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

      const { code, screeningId } = await req.json();

      if (!code) {
        return new Response(
          JSON.stringify({ valid: false, error: 'No promo code provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Look up the promo code
      const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (!promo || error) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Invalid promo code' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiry
      if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Promo code has expired' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check max uses
      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Promo code has been fully redeemed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check screening-specific
      if (promo.screening_id && screeningId && promo.screening_id !== screeningId) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Promo code not valid for this screening' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          valid: true,
          discount_type: promo.discount_type,
          discount_value: promo.discount_value,
          code: promo.code,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ valid: false, error: err instanceof Error ? err.message : "Unexpected promo validation failure." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  });
}
