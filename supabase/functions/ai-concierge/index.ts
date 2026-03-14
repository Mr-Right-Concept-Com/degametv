import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch current screenings for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: screenings } = await sb
      .from("screenings")
      .select("title, slug, description, screening_date, duration, location_pricing, status, star_rating, age_rating")
      .eq("status", "published")
      .order("screening_date", { ascending: true })
      .limit(10);

    const screeningContext = screenings && screenings.length > 0
      ? screenings.map(s => {
          const pricing = typeof s.location_pricing === "string" ? JSON.parse(s.location_pricing) : s.location_pricing;
          return `- "${s.title}" (${s.status}) — Nigeria: ₦${pricing?.nigeria || 'N/A'}, International: $${pricing?.international || 'N/A'}${s.screening_date ? `, Date: ${new Date(s.screening_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}${s.duration ? `, ${s.duration}min` : ''}${s.star_rating ? `, Rating: ${s.star_rating}/5` : ''}${s.age_rating ? `, Age: ${s.age_rating}` : ''}`;
        }).join("\n")
      : "No screenings currently available.";

    const systemPrompt = `You are the DeGameTV AI Concierge — a friendly, knowledgeable assistant for a virtual cinema platform specializing in Nollywood and African films.

Your job is to help users with:
- Information about current screenings, prices, and showtimes
- How to buy tickets and watch movies
- Filmmaker submission process
- General platform questions

CURRENT SCREENINGS:
${screeningContext}

PLATFORM INFO:
- Ticket purchase flow: Choose location (Nigeria/International) → Enter email → Apply promo code → Pay → Receive watch link via email
- Watch window: 90 days from purchase
- Payment methods: Stripe, Paystack, Flutterwave, Bank Transfer
- Filmmakers can submit via the Studio Dashboard after signing up
- Support email: support@degametv.net

RULES:
- Keep responses concise (2-3 sentences max)
- Be warm, helpful, and professional
- If you don't know something, direct users to support@degametv.net
- Never make up screening information — only use what's provided above
- Use ₦ for Nigerian pricing, $ for international`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []),
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I'm not sure how to help with that. Please contact support@degametv.net.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-concierge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
