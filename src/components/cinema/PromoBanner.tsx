import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const bannerSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).nullable(),
  image_url: z.string().url().max(2048),
  link_url: z.string().max(2048).nullable(),
  starts_at: z.string().datetime({ offset: true }).nullable(),
  ends_at: z.string().datetime({ offset: true }).nullable(),
});

type Banner = z.infer<typeof bannerSchema>;

function safeDestination(value: string | null): { internal: boolean; href: string } | null {
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) {
    return { internal: true, href: value };
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    return { internal: false, href: url.toString() };
  } catch {
    return null;
  }
}

/** Panoramic hero carousel for admin-approved placements. Renders nothing when empty. */
export function PromoBanner({ placement }: { placement: 'home' | 'cinema' }) {
  const [items, setItems] = useState<Banner[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    let active = true;
    const now = Date.now();

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('promo_banners')
          .select('id, title, subtitle, image_url, link_url, starts_at, ends_at')
          .eq('is_active', true)
          .in('placement', [placement, 'all'])
          .order('sort_order');

        if (error) throw error;
        const parsed = z.array(bannerSchema).safeParse(data ?? []);
        if (!parsed.success) {
          console.error('Promo banner response failed validation:', parsed.error);
          if (active) setItems([]);
          return;
        }

        const visible = parsed.data.filter((banner) => {
          const starts = banner.starts_at ? Date.parse(banner.starts_at) : Number.NEGATIVE_INFINITY;
          const ends = banner.ends_at ? Date.parse(banner.ends_at) : Number.POSITIVE_INFINITY;
          return starts <= now && ends >= now && ends >= starts;
        }).filter((banner) => safeDestination(banner.link_url) !== null || banner.link_url === null);

        if (active) {
          setItems(visible);
          setI(0);
        }
      } catch (error: unknown) {
        console.error('Unable to load promotional banners:', error);
        if (active) setItems([]);
      }
    };

    void load();
    return () => { active = false; };
  }, [placement]);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  const b = items[i];
  if (!b) return null;
  const destination = safeDestination(b.link_url);

  return (
    <section aria-label="Featured events" className="px-4 pt-4">
      <div className="relative max-w-6xl mx-auto overflow-hidden rounded-3xl aspect-[21/9] sm:aspect-[3/1] bg-muted">
        <img src={b.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-5 sm:p-10 max-w-xl">
          <h2 className="text-xl sm:text-4xl font-bold text-foreground">{b.title}</h2>
          {b.subtitle && <p className="text-sm sm:text-base text-muted-foreground mt-1 line-clamp-2">{b.subtitle}</p>}
          {destination && (
            <Button asChild className="rounded-full mt-3 w-fit">
              {destination.internal
                ? <Link to={destination.href}>Get tickets</Link>
                : <a href={destination.href} target="_blank" rel="noopener noreferrer">Get tickets</a>}
            </Button>
          )}
        </div>
        {items.length > 1 && (
          <>
            <Button size="icon" variant="secondary" aria-label="Previous banner" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8" onClick={() => setI((x) => (x - 1 + items.length) % items.length)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button size="icon" variant="secondary" aria-label="Next banner" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8" onClick={() => setI((x) => (x + 1) % items.length)}><ChevronRight className="w-4 h-4" /></Button>
            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show banner ${index + 1}`}
                  aria-current={index === i ? 'true' : undefined}
                  onClick={() => setI(index)}
                  className={`h-2 rounded-full transition-all ${index === i ? 'w-6 bg-primary' : 'w-2 bg-foreground/40'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
