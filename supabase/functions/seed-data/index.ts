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
        const tenantId = '00000000-0000-0000-0000-000000000001';

        // 1. Create tenant
        await supabase
          .from('tenants')
          .upsert({
            id: tenantId,
            name: 'DeGameTV',
            slug: 'degametv',
            type: 'platform',
            primary_color: '#E53E6B',
            secondary_color: '#D4A843',
            is_active: true,
          }, { onConflict: 'id' });

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
            description: 'A beautiful love story set in modern-day Lagos.',
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
            description: 'An epic historical drama set in ancient Benin Kingdom.',
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
            description: 'Two strangers meet in the vibrant streets of Lagos.',
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
            description: 'Hilarious and heartwarming Nollywood comedy.',
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

        // 3. Create screenings with cast/crew, gallery, ratings
        const castCrewSets = [
          [
            { name: 'Funke Akindele', character: 'Adaeze', role: 'Lead Actress', photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop' },
            { name: 'Ramsey Nouah', character: 'Chief Okafor', role: 'Lead Actor', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop' },
            { name: 'Omotola Jalade', character: 'Mama Nkechi', role: 'Supporting', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' },
            { name: 'Odunlade Adekola', character: 'Baba Sope', role: 'Supporting', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
          ],
          [
            { name: 'Genevieve Nnaji', character: 'Aisha', role: 'Lead Actress', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop' },
            { name: 'Richard Mofe-Damijo', character: 'Chief Williams', role: 'Lead Actor', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' },
            { name: 'Mercy Johnson', character: 'Ngozi', role: 'Supporting', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop' },
          ],
          [
            { name: 'Pete Edochie', character: 'Oba Ewuare', role: 'Lead Actor', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop' },
            { name: 'Stephanie Okereke', character: 'Queen Idia', role: 'Lead Actress', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop' },
            { name: 'Jim Iyke', character: 'Warrior Ogun', role: 'Supporting', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
          ],
          [
            { name: 'Adesua Etomi', character: 'Temi', role: 'Lead Actress', photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop' },
            { name: 'Banky W', character: 'Chidi', role: 'Lead Actor', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop' },
          ],
          [
            { name: 'Funke Akindele', character: 'Lefty', role: 'Lead Actress', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' },
            { name: 'Chioma Chukwuka', character: 'Busola', role: 'Supporting', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop' },
            { name: 'Tobi Bakre', character: 'Ade', role: 'Supporting', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' },
          ],
        ];

        const galleryImageSets = [
          [
            'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&h=450&fit=crop',
            'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=450&fit=crop',
            'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&h=450&fit=crop',
          ],
          [
            'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=450&fit=crop',
            'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=800&h=450&fit=crop',
          ],
          [
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=450&fit=crop',
            'https://images.unsplash.com/photo-1504598318550-17eba1008a68?w=800&h=450&fit=crop',
            'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&h=450&fit=crop',
          ],
          [
            'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=450&fit=crop',
            'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&h=450&fit=crop',
          ],
          [
            'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&h=450&fit=crop',
            'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&h=450&fit=crop',
          ],
        ];

        const ratings = [4.8, 4.6, 4.9, 4.5, 4.7];
        const ageRatings = ['PG-13', 'PG-13', '18+', 'PG', 'PG-13'];

        const screenings = [
          { id: '20000000-0000-0000-0000-000000000001', content_id: '10000000-0000-0000-0000-000000000001', title: 'Keleke - Exclusive Virtual Premiere', slug: 'keleke', description: 'Be among the first to experience this powerful festival drama.', poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=1200&fit=crop', banner_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=1920&h=1080&fit=crop', trailer_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', screening_date: '2026-03-01T19:00:00Z', release_date: '2026-03-01T19:00:00Z', duration: 120, location_pricing: { nigeria: 5000, international: 15 }, status: 'published' },
          { id: '20000000-0000-0000-0000-000000000002', content_id: '10000000-0000-0000-0000-000000000002', title: "The Wedding Day - Valentine's Premiere", slug: 'the-wedding-day', description: "A beautiful love story set in modern-day Lagos.", poster_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=1200&fit=crop', banner_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&h=1080&fit=crop', trailer_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', screening_date: '2026-02-14T20:00:00Z', release_date: '2026-02-14T20:00:00Z', duration: 115, location_pricing: { nigeria: 5000, international: 15 }, status: 'published' },
          { id: '20000000-0000-0000-0000-000000000003', content_id: '10000000-0000-0000-0000-000000000003', title: 'Agabaidu - World Premiere', slug: 'agabaidu', description: 'History comes alive in this epic tale of the Benin Kingdom.', poster_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=1200&fit=crop', banner_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop', trailer_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', screening_date: '2026-03-20T19:00:00Z', release_date: '2026-03-20T19:00:00Z', duration: 140, location_pricing: { nigeria: 7000, international: 20 }, status: 'published' },
          { id: '20000000-0000-0000-0000-000000000004', content_id: '10000000-0000-0000-0000-000000000004', title: 'Love in Lagos - Digital Premiere', slug: 'love-in-lagos', description: 'Two strangers meet in the vibrant streets of Lagos.', poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=1200&fit=crop', banner_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&h=1080&fit=crop', screening_date: '2026-04-01T20:00:00Z', release_date: '2026-04-01T20:00:00Z', duration: 120, location_pricing: { nigeria: 4000, international: 12 }, status: 'published' },
          { id: '20000000-0000-0000-0000-000000000005', content_id: '10000000-0000-0000-0000-000000000005', title: 'Omo Ghetto: The Return - Premiere Night', slug: 'omo-ghetto-return', description: 'Hilarious and heartwarming Nollywood comedy premiere.', poster_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&h=1200&fit=crop', banner_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1920&h=1080&fit=crop', screening_date: '2026-04-15T19:00:00Z', release_date: '2026-04-15T19:00:00Z', duration: 130, location_pricing: { nigeria: 5000, international: 15 }, status: 'published' },
        ];

        for (let i = 0; i < screenings.length; i++) {
          await supabase.from('screenings').upsert({
            ...screenings[i],
            tenant_id: tenantId,
            cast_crew: castCrewSets[i],
            gallery_images: galleryImageSets[i],
            star_rating: ratings[i],
            age_rating: ageRatings[i],
            review_count: Math.floor(Math.random() * 200) + 20,
          }, { onConflict: 'id' });
        }

        // 4. Payment gateways
        const gateways = [
          { gateway_name: 'Stripe', tenant_id: tenantId, is_enabled: true, is_live: false, test_public_key: 'pk_test_demo', test_secret_key: 'sk_test_demo' },
          { gateway_name: 'Paystack', tenant_id: tenantId, is_enabled: true, is_live: false, test_public_key: 'pk_test_demo', test_secret_key: 'sk_test_demo' },
          { gateway_name: 'Flutterwave', tenant_id: tenantId, is_enabled: true, is_live: false, test_public_key: 'pk_test_demo', test_secret_key: 'sk_test_demo' },
        ];

        for (const gw of gateways) {
          await supabase.from('payment_gateways').upsert(gw, { onConflict: 'id' });
        }

        // 5. Seed promo codes
        const promoCodes = [
          { code: 'WELCOME20', discount_type: 'percentage', discount_value: 20, max_uses: 100, tenant_id: tenantId, is_active: true },
          { code: 'NOLLYWOOD500', discount_type: 'fixed', discount_value: 500, max_uses: 50, tenant_id: tenantId, is_active: true },
          { code: 'PREMIERE10', discount_type: 'percentage', discount_value: 10, max_uses: 200, tenant_id: tenantId, is_active: true, screening_id: '20000000-0000-0000-0000-000000000001' },
        ];

        for (const promo of promoCodes) {
          await supabase.from('promo_codes').upsert(promo, { onConflict: 'id' });
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Sample data seeded with cast/crew, gallery, ratings, and promo codes', tenantId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (action === 'delete-all') {
        await supabase.from('screening_tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('promo_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('screening_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('screening_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('screenings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('content').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payment_gateways').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        return new Response(
          JSON.stringify({ success: true, message: 'All sample data deleted.' }),
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
