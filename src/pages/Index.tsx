import { useState, useEffect } from 'react';
import { PromoBanner } from '@/components/cinema/PromoBanner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Ticket, Clock, Calendar, Star, ArrowRight, Loader2, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Screening {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_url: string;
  banner_url: string;
  screening_date: string;
  duration: number;
  location_pricing: any;
  status: string;
}

export default function Index() {
  usePageTitle('Virtual Cinema Premieres');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('screenings')
        .select('id,content_id,title,slug,description,poster_url,banner_url,trailer_url,release_date,screening_date,duration,location_pricing,status,event_type,lifecycle,live_price_ngn,live_price_usd,live_recording_status,live_started_at,live_ended_at,live_replay_ready_at,replay_price_ngn,replay_price_usd,replay_access_hours,refund_policy,cast_crew,gallery_images,age_rating,star_rating,review_count,allowed_countries,blocked_countries,cancelled_at,created_at,updated_at')
        .eq('status', 'published')
        .order('screening_date', { ascending: true });
      if (data && data.length > 0) {
        setScreenings(data.map(s => ({
          ...s,
          location_pricing: typeof s.location_pricing === 'string' ? JSON.parse(s.location_pricing) : s.location_pricing,
        })));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const featuredScreening = screenings[0] || null;

  // Countdown
  const targetDate = featuredScreening?.screening_date
    ? new Date(featuredScreening.screening_date).getTime()
    : 0;

  useEffect(() => {
    if (!targetDate) return;
    const timer = setInterval(() => {
      const diff = targetDate - Date.now();
      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          secs: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <MainLayout>
      <PromoBanner placement="home" />
      {/* Hero */}
      <section className="relative isolate min-h-[560px] overflow-hidden bg-[#090909] animate-fade-in sm:min-h-[620px]">
        <div className="absolute inset-0 -z-20 bg-cover bg-center opacity-55" style={{ backgroundImage: `url(${featuredScreening?.banner_url || featuredScreening?.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1800&auto=format&fit=crop'})` }} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/85 to-black/35" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-transparent to-black/20" />
        <div className="container relative z-10 mx-auto flex min-h-[560px] flex-col items-start justify-center px-5 py-16 sm:min-h-[620px] sm:py-20">
          <Badge className="mb-5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-semibold tracking-[.18em] text-white backdrop-blur sm:mb-7 sm:text-xs">
            🎬 VIRTUAL PREMIERE
          </Badge>

          {loading ? (
            <div className="py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-foreground mx-auto" /></div>
          ) : featuredScreening ? (
            <>
              <h1 className="mb-4 max-w-4xl text-left text-4xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-5xl md:text-7xl lg:text-8xl">
                {featuredScreening.title}
              </h1>
              <p className="mb-7 max-w-xl text-left text-sm leading-relaxed text-white/75 sm:text-base md:text-lg">
                {featuredScreening.description}
              </p>

              {/* Countdown */}
              <div className="mb-7 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur sm:gap-3 sm:px-6">
                {[
                  { val: countdown.days, label: 'd' },
                  { val: countdown.hours, label: 'h' },
                  { val: countdown.mins, label: 'm' },
                  { val: countdown.secs, label: 's' },
                ].map((unit, i) => (
                  <span key={i} className="flex items-baseline gap-0.5">
                    <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground tabular-nums">{unit.val}</span>
                    <span className="text-[10px] sm:text-xs text-primary-foreground/85 font-medium">{unit.label}</span>
                  </span>
                ))}
              </div>

              <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Button size="lg" className="h-12 w-full gap-2 rounded-full bg-primary px-7 font-semibold text-white shadow-xl shadow-primary/20 hover:bg-primary/90 tap-scale sm:w-auto" asChild>
                  <Link to={`/buy/${featuredScreening.slug}`}>
                    <Ticket className="w-5 h-5" />
                    Get Ticket{featuredScreening.location_pricing?.nigeria ? ` — ₦${Number(featuredScreening.location_pricing.nigeria).toLocaleString()}` : ''}
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" className="h-12 w-full gap-2 rounded-full border border-white/20 bg-white/10 font-semibold text-white hover:bg-white/15 tap-scale sm:w-auto" asChild>
                  <Link to={`/movie/${featuredScreening.slug}`}>
                    <Play className="w-5 h-5" />
                    Watch Trailer
                  </Link>
                </Button>
              </div>

              {featuredScreening.screening_date && (
                <div className="mt-7 flex items-center justify-start gap-4 text-xs text-white/70 sm:text-sm">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {new Date(featuredScreening.screening_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="py-8">
              <Film className="w-16 h-16 text-primary-foreground/50 mx-auto mb-4" />
              <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-foreground mb-3">Coming Soon</h1>
              <p className="text-primary-foreground/90">No screenings available yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Now Showing */}
      <section className="py-10 sm:py-16">
        <div className="container mx-auto px-5">
          <div className="flex items-end justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Now Showing</h2>
              <p className="text-muted-foreground text-sm mt-0.5 sm:mt-1">Exclusive premieres available now</p>
            </div>
            <Button variant="ghost" size="sm" className="rounded-full text-primary font-semibold gap-1 text-xs sm:text-sm hidden sm:flex" asChild>
              <Link to="/cinema">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : screenings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No screenings available yet</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide scroll-momentum sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:gap-4 sm:overflow-visible sm:pb-0">
              {screenings.slice(0, 6).map((s, i) => (
                <Link
                  key={s.id}
                  to={`/movie/${s.slug}`}
                  className="group flex-shrink-0 w-[140px] sm:w-auto snap-start snap-card tap-scale animate-fade-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="aspect-[2/3] relative rounded-2xl overflow-hidden bg-secondary mb-2 sm:mb-3">
                    <img src={s.poster_url || ''} alt={s.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                      {s.location_pricing?.nigeria ? `₦${Number(s.location_pricing.nigeria).toLocaleString()}` : 'Price unavailable'}
                    </div>
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary-foreground/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary fill-primary ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors">{s.title}</h3>
                  {s.screening_date && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {new Date(s.screening_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}

          <Button variant="ghost" size="sm" className="rounded-full text-primary font-semibold gap-1 text-xs mt-4 w-full sm:hidden tap-scale" asChild>
            <Link to="/cinema">View all screenings <ArrowRight className="w-3.5 h-3.5" /></Link>
          </Button>
        </div>
      </section>

      {/* Upcoming Screenings */}
      {screenings.length > 0 && (
        <section className="py-10 sm:py-16 bg-secondary/50">
          <div className="container mx-auto px-5">
            <div className="flex items-end justify-between mb-6 sm:mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Upcoming Screenings</h2>
                <p className="text-muted-foreground text-sm mt-0.5 sm:mt-1">Don't miss these exclusive premieres</p>
              </div>
            </div>

            <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {screenings.slice(0, 3).map((item, i) => (
                <Link
                  key={item.id}
                  to={`/movie/${item.slug}`}
                  className="monzo-card group flex flex-row sm:flex-col gap-4 sm:gap-0 tap-scale animate-slide-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="w-24 h-32 sm:w-full sm:h-auto sm:aspect-video flex-shrink-0 rounded-xl overflow-hidden bg-secondary sm:mb-4">
                    <img src={item.banner_url || item.poster_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
                      <h3 className="font-bold text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">{item.title}</h3>
                      <span className="text-xs sm:text-sm font-bold text-primary whitespace-nowrap">{item.location_pricing?.nigeria ? `₦${Number(item.location_pricing.nigeria).toLocaleString()}` : 'Price unavailable'}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 sm:mb-4">{item.description}</p>
                    <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {new Date(item.screening_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-end mt-3 pt-3 border-t border-border">
                      <span className="text-xs sm:text-sm font-semibold text-primary flex items-center gap-1">
                        Get Ticket <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-10 sm:py-16">
        <div className="container mx-auto px-5 max-w-3xl">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center mb-8 sm:mb-12">How It Works</h2>
          <div className="grid grid-cols-3 gap-4 sm:gap-8">
            {[
              { icon: Ticket, title: 'Buy ticket', desc: 'Grab your ticket in seconds.', step: '1' },
              { icon: Clock, title: 'Join showtime', desc: 'Access the virtual cinema.', step: '2' },
              { icon: Play, title: 'Enjoy', desc: 'Watch with 90-day replay.', step: '3' },
            ].map((item, i) => (
              <div key={item.step} className="text-center animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="font-bold text-xs sm:text-base mb-1">{item.title}</h3>
                <p className="text-[10px] sm:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Install CTA for PWA */}
      <section className="py-8 sm:py-12 bg-primary/5">
        <div className="container mx-auto px-5 text-center max-w-md">
          <h3 className="text-lg sm:text-xl font-bold mb-2">Install DeGameTV</h3>
          <p className="text-sm text-muted-foreground mb-4">Add to your home screen for instant access to premieres and a native app experience.</p>
          <p className="text-xs text-muted-foreground">
            📱 <strong>iPhone:</strong> Tap Share → Add to Home Screen<br />
            🤖 <strong>Android:</strong> Tap Menu → Install App
          </p>
        </div>
      </section>
    </MainLayout>
  );
}
