import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Search, Ticket, Film, Star } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

interface ScreeningRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  poster_url: string | null;
  banner_url: string | null;
  screening_date: string | null;
  duration: number | null;
  location_pricing: any;
  status: string;
  star_rating: number | null;
  age_rating: string | null;
}

export default function Cinema() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [screenings, setScreenings] = useState<ScreeningRow[]>([]);
  const [loading, setLoading] = useState(true);
  usePageTitle('Virtual Cinema');

  useEffect(() => {
    const fetchScreenings = async () => {
      const { data } = await supabase
        .from('screenings')
        .select('*')
        .eq('status', 'published')
        .order('screening_date', { ascending: true });
      if (data) setScreenings(data as unknown as ScreeningRow[]);
      setLoading(false);
    };
    fetchScreenings();
  }, []);

  const filtered = screenings.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPrice = (pricing: any) => {
    const p = typeof pricing === 'string' ? JSON.parse(pricing) : pricing;
    return p?.nigeria ? `₦${Number(p.nigeria).toLocaleString()}` : '$15';
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-5 py-6 sm:py-10">
        <div className="mb-5 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-0.5 sm:mb-1">Virtual Cinema</h1>
          <p className="text-sm text-muted-foreground">Exclusive premieres and cinema experiences</p>
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

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {filtered.map((s) => (
              <Link
                key={s.id}
                to={`/movie/${s.slug}`}
                className="monzo-card group flex flex-row sm:flex-col gap-4 sm:gap-0"
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
                    {(s as any).star_rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-accent text-accent" />
                        {Number((s as any).star_rating).toFixed(1)}
                      </span>
                    )}
                    {(s as any).age_rating && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-accent text-accent">
                        {(s as any).age_rating}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-border">
                    <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1 text-[10px] sm:text-xs h-7 sm:h-8 px-3 sm:px-4">
                      <Ticket className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      View Movie
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
            <p className="text-xs sm:text-sm text-muted-foreground">Check back soon for upcoming premieres</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
