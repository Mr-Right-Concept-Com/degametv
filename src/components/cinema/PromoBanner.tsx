import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Banner { id: string; title: string; subtitle: string | null; image_url: string; link_url: string | null }

/** Panoramic hero carousel for admin-approved placements. Renders nothing when empty. */
export function PromoBanner({ placement }: { placement: 'home' | 'cinema' }) {
  const [items, setItems] = useState<Banner[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    const now = new Date().toISOString();
    supabase.from('promo_banners').select('id, title, subtitle, image_url, link_url, starts_at, ends_at')
      .eq('is_active', true).in('placement', [placement, 'all']).order('sort_order')
      .then(({ data }) => setItems(((data as any[]) || []).filter(b => (!b.starts_at || b.starts_at <= now) && (!b.ends_at || b.ends_at >= now))));
  }, [placement]);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setI(x => (x + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  const b = items[i];
  const internal = b.link_url?.startsWith('/');

  return (
    <section aria-label="Featured events" className="px-4 pt-4">
      <div className="relative max-w-6xl mx-auto overflow-hidden rounded-3xl aspect-[21/9] sm:aspect-[3/1] bg-muted">
        <img src={b.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-5 sm:p-10 max-w-xl">
          <h2 className="text-xl sm:text-4xl font-bold text-foreground">{b.title}</h2>
          {b.subtitle && <p className="text-sm sm:text-base text-muted-foreground mt-1 line-clamp-2">{b.subtitle}</p>}
          {b.link_url && (
            <Button asChild className="rounded-full mt-3 w-fit">
              {internal ? <Link to={b.link_url}>Get tickets</Link> : <a href={b.link_url} rel="noopener noreferrer">Get tickets</a>}
            </Button>
          )}
        </div>
        {items.length > 1 && (
          <>
            <Button size="icon" variant="secondary" aria-label="Previous banner" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8" onClick={() => setI(x => (x - 1 + items.length) % items.length)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button size="icon" variant="secondary" aria-label="Next banner" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8" onClick={() => setI(x => (x + 1) % items.length)}><ChevronRight className="w-4 h-4" /></Button>
            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {items.map((it, j) => (
                <button key={it.id} aria-label={`Show banner ${j + 1}`} aria-current={j === i} onClick={() => setI(j)}
                  className={`h-2 rounded-full transition-all ${j === i ? 'w-6 bg-primary' : 'w-2 bg-foreground/40'}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
