import { useState, useEffect } from 'react';
import { z } from 'zod';
import { PromoBanner } from '@/components/cinema/PromoBanner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Search, Ticket, Film, Star } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchCatalogRows } from '@/integrations/supabase/catalog';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

const contentRowSchema = z.object({
  id: z.string(), title: z.string(), type: z.string(),
  description: z.string().nullable().optional(), poster_url: z.string().nullable().optional(),
  genres: z.array(z.string()).nullable().optional(), release_date: z.string().nullable().optional(),
}).passthrough();
type ContentRow = z.infer<typeof contentRowSchema>;

const screeningRowSchema = z.object({
  id: z.string(), content_id: z.string().nullable().optional(), event_type: z.string().nullable().optional(),
  title: z.string(), slug: z.string(), description: z.string().nullable().optional(),
  poster_url: z.string().nullable().optional(), banner_url: z.string().nullable().optional(),
  screening_date: z.string().nullable().optional(), duration: z.number().nullable().optional(),
  location_pricing: z.unknown().nullable().optional(), status: z.string(),
  star_rating: z.number().nullable().optional(), age_rating: z.string().nullable().optional(),
}).passthrough();
type ScreeningRow = z.infer<typeof screeningRowSchema>;

export default function Cinema() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [screenings, setScreenings] = useState<ScreeningRow[]>([]);
  const [titles, setTitles] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  usePageTitle('Virtual Cinema');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const fetchScreenings = async () => {
      try {
        const [titleData, screeningData] = await Promise.all([
          fetchCatalogRows({ view: 'public_content_catalog', select: 'id,title,type,description,poster_url,genres,release_date', order: 'created_at.desc', signal: controller.signal }, contentRowSchema),
          fetchCatalogRows({ view: 'public_screenings_catalog', select: 'id,content_id,title,slug,description,poster_url,banner_url,screening_date,duration,location_pricing,status,event_type,star_rating,age_rating', filters: { status: 'eq.published' }, order: 'screening_date.asc', signal: controller.signal }, screeningRowSchema),
        ]);
        if (active) { setTitles(titleData); setScreenings(screeningData); }
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('cinema_catalogue_load_failed', error);
          setLoadError('The cinema catalogue could not be loaded. Please try again later.');
        }
      } finally { if (active) setLoading(false); }
    };
    void fetchScreenings();
    return () => { active = false; controller.abort(); };
  }, []);

  const filtered = screenings.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTitles = titles.filter(title => title.title.toLowerCase().includes(searchQuery.toLowerCase()) || (title.genres || []).some(genre => genre.toLowerCase().includes(searchQuery.toLowerCase())));

  const getPrice = (pricing: unknown) => {
    let value: unknown = pricing;
    if (typeof value === 'string') {
      try { value = JSON.parse(value) as unknown; } catch { return 'Price unavailable'; }
    }
    const parsed = z.object({ nigeria: z.union([z.number(), z.string()]).optional() }).passthrough().safeParse(value);
    return parsed.success && parsed.data.nigeria !== undefined
      ? `₦${Number(parsed.data.nigeria).toLocaleString()}`
      : 'Price unavailable';
  };

  return (
    <MainLayout>
      <PromoBanner placement="cinema" />
      <div className="container mx-auto px-4 py-7 sm:px-5 sm:py-12">
        <div className="mb-7 rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-primary/10 p-6 shadow-sm sm:mb-10 sm:p-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-primary">Explore DeGameTV</p><h1 className="mb-2 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">Stories worth gathering for.</h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">Discover African films, original series, ticketed premieres and live experiences — all in one virtual cinema.</p>
        </div>

        <div className="mb-6 sm:mb-10">
          <div className="relative sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search screenings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-full bg-secondary border-0 focus-visible:ring-primary/30 h-10"
            />
          </div>
        </div>

        {loadError && <p role="alert" className="mb-5 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{loadError}</p>}
        {!loading && (
          <section className="mb-12">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div><h2 className="text-xl font-semibold">Explore the catalogue</h2><p className="text-sm text-muted-foreground">Films, series, episodes, shorts, trailers and on-demand titles from approved creators.</p></div>
              <span className="text-xs text-muted-foreground">{filteredTitles.length} titles</span>
            </div>
            {filteredTitles.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filteredTitles.map(title => <Link key={title.id} to={`/content/${title.id}`} className="group overflow-hidden rounded-[1.4rem] border border-border/70 bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="aspect-[2/3] overflow-hidden bg-secondary">{title.poster_url ? <img src={title.poster_url} alt={title.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105"/> : <div className="flex h-full items-center justify-center"><Film className="h-10 w-10 text-muted-foreground/50"/></div>}</div>
                <div className="p-4"><Badge variant="secondary" className="mb-2 capitalize">{title.type}</Badge><h3 className="line-clamp-1 text-sm font-semibold">{title.title}</h3><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{title.description || (title.genres || []).join(' · ') || 'Explore this title'}</p></div>
              </Link>)}
            </div> : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No published titles match this search.</p>}
          </section>
        )}
        <section>
          <div className="mb-5"><h2 className="text-xl font-semibold">Premieres & scheduled screenings</h2><p className="text-sm text-muted-foreground">Book a seat or live pass for upcoming cinema events.</p></div>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {filtered.map((s) => (
              <Link
                key={s.id}
                to={s.event_type === 'live' && s.content_id ? `/content/${s.content_id}` : `/movie/${s.slug}`}
                className="monzo-card group flex flex-row gap-4 rounded-[1.5rem] p-4 sm:flex-col sm:gap-0 sm:p-5"
              >
                <div className="w-24 h-32 sm:w-full sm:h-auto sm:aspect-video flex-shrink-0 rounded-xl overflow-hidden bg-secondary sm:mb-4">
                  <img
                    src={s.poster_url || s.banner_url || '/placeholder.svg'}
                    alt={s.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="font-bold text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">
                      {s.title}
                    </h2>
                    <span className="text-xs sm:text-sm font-bold text-primary whitespace-nowrap">
                      {getPrice(s.location_pricing)}
                    </span>
                  </div>

                  {s.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 sm:mb-4">
                      {s.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4">
                    {s.screening_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {new Date(s.screening_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {s.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {s.duration}min
                      </span>
                    )}
                    {(s.star_rating ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-accent text-accent" />
                        {Number(s.star_rating).toFixed(1)}
                      </span>
                    )}
                    {s.age_rating && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-accent text-accent">
                        {(s as any).age_rating}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-border">
                    <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1 text-[10px] sm:text-xs h-7 sm:h-8 px-3 sm:px-4">
                      <Ticket className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {s.event_type === 'live' ? 'View live event' : 'View Movie'}
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 sm:py-20">
            <Film className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground/40" />
            <h3 className="text-base sm:text-lg font-semibold mb-1">No screenings found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Browse the catalogue above or check back for upcoming premieres</p>
          </div>
        )}
        </section>
      </div>
    </MainLayout>
  );
}
