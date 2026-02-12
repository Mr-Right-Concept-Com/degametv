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

      const { action } = await req.json();

      if (action === 'seed') {
        // 1. Create tenant
        const { data: tenant, error: tenantErr } = await supabase
          .from('tenants')
          .upsert({
            id: '00000000-0000-0000-0000-000000000001',
            name: 'DeGameTV',
            slug: 'degametv',
            type: 'platform',
            primary_color: '#E53E6B',
            secondary_color: '#D4A843',
            is_active: true,
          }, { onConflict: 'id' })
          .select()
          .single();

        if (tenantErr) throw tenantErr;
        const tenantId = tenant.id;

        // 2. Create content items
        const contentItems = [
          {
            id: '10000000-0000-0000-0000-000000000001',
            tenant_id: tenantId,
            title: 'Keleke',
            slug: 'keleke',
            description: 'A powerful festival drama exploring tradition, family bonds, and the clash between old and new Nigeria.',
            type: 'movie',
            status: 'published',
            thumbnail_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop',
            poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=1200&fit=crop',
            banner_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=1920&h=1080&fit=crop',
            duration: 7200,
            release_date: '2026-03-01',
            genres: ['Drama', 'Cultural', 'Family'],
            monetization: 'ticket',
            price: 5000,
            currency: 'NGN',
            is_featured: true,
            rating: 4.9,
            view_count: 250000,
            video_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            trailer_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          },
          {
            id: '10000000-0000-0000-0000-000000000002',
            tenant_id: tenantId,
            title: 'The Wedding Day',
            slug: 'the-wedding-day',
            description: 'A beautiful love story set in modern-day Lagos. Two souls from different worlds find love in the most unexpected way.',
            type: 'movie',
            status: 'published',
            thumbnail_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=600&fit=crop',
            poster_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=1200&fit=crop',
            banner_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&h=1080&fit=crop',
            duration: 6900,
            release_date: '2026-02-14',
            genres: ['Romance', 'Drama', 'Comedy'],
            monetization: 'ticket',
            price: 5000,
            currency: 'NGN',
            is_featured: true,
            rating: 4.7,
            view_count: 180000,
            video_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            trailer_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          },
          {
            id: '10000000-0000-0000-0000-000000000003',
            tenant_id: tenantId,
            title: 'Agabaidu',
            slug: 'agabaidu',
            description: 'An epic historical drama set in ancient Benin Kingdom. Warriors, royalty, and destiny intertwine.',
            type: 'movie',
            status: 'published',
            thumbnail_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop',
            poster_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=1200&fit=crop',
            banner_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop',
            duration: 8400,
            release_date: '2026-03-20',
            genres: ['Historical', 'Action', 'Cultural'],
            monetization: 'ticket',
            price: 7000,
            currency: 'NGN',
            is_featured: true,
            rating: 4.8,
            view_count: 0,
            video_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            trailer_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          },
          {
            id: '10000000-0000-0000-0000-000000000004',
            tenant_id: tenantId,
            title: 'Love in Lagos',
            slug: 'love-in-lagos',
            description: 'Two strangers meet in the vibrant streets of Lagos and discover that love knows no boundaries.',
            type: 'movie',
            status: 'published',
            thumbnail_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
            poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=1200&fit=crop',
            banner_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&h=1080&fit=crop',
            duration: 7200,
            release_date: '2026-04-01',
            genres: ['Romance', 'Comedy'],
            monetization: 'ticket',
            price: 4000,
            currency: 'NGN',
            is_featured: false,
            rating: 4.5,
            view_count: 95000,
            video_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          },
          {
            id: '10000000-0000-0000-0000-000000000005',
            tenant_id: tenantId,
            title: 'Omo Ghetto: The Return',
            slug: 'omo-ghetto-return',
            description: 'Hilarious and heartwarming — follow Lefty as she navigates two completely different worlds.',
            type: 'movie',
            status: 'published',
            thumbnail_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=600&fit=crop',
            poster_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&h=1200&fit=crop',
            banner_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1920&h=1080&fit=crop',
            duration: 7800,
            release_date: '2026-04-15',
            genres: ['Comedy', 'Drama'],
            monetization: 'ticket',
            price: 5000,
            currency: 'NGN',
            is_featured: true,
            rating: 4.6,
            view_count: 320000,
            video_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          },
        ];

        for (const item of contentItems) {
          await supabase.from('content').upsert(item, { onConflict: 'id' });
        }

        // 3. Create screenings
        const screenings = [
          {
            id: '20000000-0000-0000-0000-000000000001',
            tenant_id: tenantId,
            content_id: '10000000-0000-0000-0000-000000000001',
            title: 'Keleke - Exclusive Virtual Premiere',
            slug: 'keleke',
            description: 'Be among the first to experience this powerful festival drama. Virtual red carpet event included.',
            poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=1200&fit=crop',
            banner_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=1920&h=1080&fit=crop',
            trailer_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            screening_date: '2026-03-01T19:00:00Z',
            release_date: '2026-03-01T19:00:00Z',
            duration: 120,
            location_pricing: { nigeria: 5000, international: 15 },
            status: 'published',
          },
          {
            id: '20000000-0000-0000-0000-000000000002',
            tenant_id: tenantId,
            content_id: '10000000-0000-0000-0000-000000000002',
            title: 'The Wedding Day - Valentine\'s Premiere',
            slug: 'the-wedding-day',
            description: 'A beautiful love story set in modern-day Lagos. Perfect for Valentine\'s Day.',
            poster_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=1200&fit=crop',
            banner_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&h=1080&fit=crop',
            trailer_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            screening_date: '2026-02-14T20:00:00Z',
            release_date: '2026-02-14T20:00:00Z',
            duration: 115,
            location_pricing: { nigeria: 5000, international: 15 },
            status: 'published',
          },
          {
            id: '20000000-0000-0000-0000-000000000003',
            tenant_id: tenantId,
            content_id: '10000000-0000-0000-0000-000000000003',
            title: 'Agabaidu - World Premiere',
            slug: 'agabaidu',
            description: 'History comes alive in this epic tale of the Benin Kingdom.',
            poster_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=1200&fit=crop',
            banner_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop',
            trailer_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            screening_date: '2026-03-20T19:00:00Z',
            release_date: '2026-03-20T19:00:00Z',
            duration: 140,
            location_pricing: { nigeria: 7000, international: 20 },
            status: 'published',
          },
          {
            id: '20000000-0000-0000-0000-000000000004',
            tenant_id: tenantId,
            content_id: '10000000-0000-0000-0000-000000000004',
            title: 'Love in Lagos - Digital Premiere',
            slug: 'love-in-lagos',
            description: 'Two strangers meet in the vibrant streets of Lagos.',
            poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=1200&fit=crop',
            banner_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&h=1080&fit=crop',
            screening_date: '2026-04-01T20:00:00Z',
            release_date: '2026-04-01T20:00:00Z',
            duration: 120,
            location_pricing: { nigeria: 4000, international: 12 },
            status: 'published',
          },
          {
            id: '20000000-0000-0000-0000-000000000005',
            tenant_id: tenantId,
            content_id: '10000000-0000-0000-0000-000000000005',
            title: 'Omo Ghetto: The Return - Premiere Night',
            slug: 'omo-ghetto-return',
            description: 'Hilarious and heartwarming Nollywood comedy premiere.',
            poster_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&h=1200&fit=crop',
            banner_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1920&h=1080&fit=crop',
            screening_date: '2026-04-15T19:00:00Z',
            release_date: '2026-04-15T19:00:00Z',
            duration: 130,
            location_pricing: { nigeria: 5000, international: 15 },
            status: 'published',
          },
        ];

        for (const s of screenings) {
          await supabase.from('screenings').upsert(s, { onConflict: 'id' });
        }

        // 4. Seed default payment gateways
        const gateways = [
          { gateway_name: 'Stripe', tenant_id: tenantId, is_enabled: true, is_live: false, test_public_key: 'pk_test_demo', test_secret_key: 'sk_test_demo' },
          { gateway_name: 'Paystack', tenant_id: tenantId, is_enabled: true, is_live: false, test_public_key: 'pk_test_demo', test_secret_key: 'sk_test_demo' },
          { gateway_name: 'Flutterwave', tenant_id: tenantId, is_enabled: true, is_live: false, test_public_key: 'pk_test_demo', test_secret_key: 'sk_test_demo' },
        ];

        for (const gw of gateways) {
          await supabase.from('payment_gateways').upsert(gw, { onConflict: 'id' });
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Sample data seeded successfully', tenantId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (action === 'delete-all') {
        // Delete in order (respecting FK constraints)
        await supabase.from('screening_tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('screenings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('content').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payment_gateways').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('analytics_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        return new Response(
          JSON.stringify({ success: true, message: 'All sample data deleted. Ready for launch!' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "seed" or "delete-all"' }),
        { status: 400, headers: corsHeaders }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  });
}
