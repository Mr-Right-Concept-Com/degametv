import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Ticket, Clock, Calendar, Star, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockMovies, mockCinemaEvents } from '@/data/mockData';
import { useState, useEffect } from 'react';

export default function Index() {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  const featuredPremiere = mockCinemaEvents.find(e => e.isPremiere) || mockCinemaEvents[0];

  const nowShowing = mockMovies
    .filter(m => m.monetization === 'ticket' || m.isFeatured)
    .slice(0, 6);

  const upcomingScreenings = mockCinemaEvents.slice(0, 3);

  useEffect(() => {
    if (!featuredPremiere) return;
    const targetDate = new Date(featuredPremiere.date).getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const diff = targetDate - now;
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
  }, [featuredPremiere]);

  return (
    <MainLayout>
      {/* Hero */}
      {featuredPremiere && (
        <section className="relative overflow-hidden bg-primary">
          <div className="container mx-auto px-5 py-14 sm:py-20 md:py-28 text-center relative z-10">
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-4 sm:mb-6 text-[10px] sm:text-xs font-semibold tracking-wider rounded-full px-3 sm:px-4 py-1">
              VIRTUAL PREMIERE
            </Badge>

            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold text-primary-foreground mb-3 sm:mb-4 tracking-tight leading-[1.1]">
              {featuredPremiere.title.split(' - ')[0]}
            </h1>

            <p className="text-primary-foreground/80 text-sm sm:text-base md:text-lg max-w-xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2">
              {featuredPremiere.description}
            </p>

            {/* Countdown */}
            <div className="inline-flex items-center gap-2 sm:gap-3 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2.5 sm:py-3 mb-6 sm:mb-8">
              {[
                { val: countdown.days, label: 'd' },
                { val: countdown.hours, label: 'h' },
                { val: countdown.mins, label: 'm' },
                { val: countdown.secs, label: 's' },
              ].map((unit, i) => (
                <span key={i} className="flex items-baseline gap-0.5">
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground tabular-nums">{unit.val}</span>
                  <span className="text-[10px] sm:text-xs text-primary-foreground/60 font-medium">{unit.label}</span>
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="w-full sm:w-auto rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold gap-2 px-6 sm:px-8 h-12" asChild>
                <Link to={`/cinema/${featuredPremiere.id}`}>
                  <Ticket className="w-5 h-5" />
                  Get Ticket — ${featuredPremiere.price}
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="w-full sm:w-auto rounded-full text-primary-foreground hover:bg-primary-foreground/10 font-semibold gap-2 h-12" asChild>
                <Link to={`/cinema/${featuredPremiere.id}`}>
                  <Play className="w-5 h-5" />
                  Watch Trailer
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-4 sm:gap-5 mt-6 sm:mt-8 text-xs sm:text-sm text-primary-foreground/70">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {new Date(featuredPremiere.date).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {featuredPremiere.time} {featuredPremiere.timezone}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Now Showing */}
      <section className="py-10 sm:py-16">
        <div className="container mx-auto px-5">
          <div className="flex items-end justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Now Showing</h2>
              <p className="text-muted-foreground text-sm mt-0.5 sm:mt-1">Exclusive premieres available now</p>
            </div>
            <Button variant="ghost" size="sm" className="rounded-full text-primary font-semibold gap-1 text-xs sm:text-sm hidden sm:flex" asChild>
              <Link to="/cinema">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>

          {/* Horizontal scroll on mobile, grid on desktop */}
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:gap-4 sm:overflow-visible sm:pb-0">
            {nowShowing.map((movie) => (
              <Link
                key={movie.id}
                to={`/content/${movie.id}`}
                className="group flex-shrink-0 w-[140px] sm:w-auto snap-start"
              >
                <div className="aspect-[2/3] relative rounded-2xl overflow-hidden bg-secondary mb-2 sm:mb-3">
                  <img
                    src={movie.thumbnailUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {movie.monetization === 'ticket' && movie.price && (
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                      ${movie.price}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary-foreground/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary fill-primary ml-0.5" />
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors">
                  {movie.title}
                </h3>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] sm:text-xs text-muted-foreground">
                  {movie.rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-accent fill-accent" />
                      {movie.rating.toFixed(1)}
                    </span>
                  )}
                  {movie.genres?.[0] && <span>{movie.genres[0]}</span>}
                </div>
              </Link>
            ))}
          </div>

          <Button variant="ghost" size="sm" className="rounded-full text-primary font-semibold gap-1 text-xs mt-4 w-full sm:hidden" asChild>
            <Link to="/cinema">
              View all screenings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Upcoming Screenings */}
      <section className="py-10 sm:py-16 bg-secondary/50">
        <div className="container mx-auto px-5">
          <div className="flex items-end justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Upcoming Screenings</h2>
              <p className="text-muted-foreground text-sm mt-0.5 sm:mt-1">Don't miss these exclusive premieres</p>
            </div>
            <Button variant="ghost" size="sm" className="rounded-full text-primary font-semibold gap-1 text-xs sm:text-sm hidden sm:flex" asChild>
              <Link to="/cinema">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>

          <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {upcomingScreenings.map((event) => (
              <Link
                key={event.id}
                to={`/cinema/${event.id}`}
                className="monzo-card group flex flex-row sm:flex-col gap-4 sm:gap-0"
              >
                {/* Mobile: side image. Desktop: top image */}
                <div className="w-24 h-32 sm:w-full sm:h-auto sm:aspect-video flex-shrink-0 rounded-xl overflow-hidden bg-secondary sm:mb-4">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
                    <h3 className="font-bold text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <span className="text-xs sm:text-sm font-bold text-primary whitespace-nowrap">${event.price}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 sm:mb-4">
                    {event.description}
                  </p>

                  <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {event.time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border">
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                      <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {event.availableTickets} left
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-primary flex items-center gap-1">
                      Get Ticket <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Button variant="ghost" size="sm" className="rounded-full text-primary font-semibold gap-1 text-xs mt-4 w-full sm:hidden" asChild>
            <Link to="/cinema">
              View all events <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-10 sm:py-16">
        <div className="container mx-auto px-5 max-w-3xl">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center mb-8 sm:mb-12">How It Works</h2>

          <div className="grid grid-cols-3 gap-4 sm:gap-8">
            {[
              { icon: Ticket, title: 'Buy ticket', desc: 'Grab your ticket in seconds.', step: '1' },
              { icon: Clock, title: 'Join showtime', desc: 'Access the virtual cinema.', step: '2' },
              { icon: Play, title: 'Enjoy', desc: 'Watch with replay included.', step: '3' },
            ].map((item) => (
              <div key={item.step} className="text-center">
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
    </MainLayout>
  );
}
