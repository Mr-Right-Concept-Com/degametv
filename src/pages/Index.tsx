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
      {/* Hero — Monzo-style: clean, bold, centered */}
      {featuredPremiere && (
        <section className="relative overflow-hidden bg-primary">
          <div className="container mx-auto px-4 py-20 md:py-28 text-center relative z-10">
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-6 text-xs font-semibold tracking-wider rounded-full px-4 py-1.5">
              VIRTUAL PREMIERE
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-primary-foreground mb-4 tracking-tight leading-[1.1]">
              {featuredPremiere.title.split(' - ')[0]}
            </h1>

            <p className="text-primary-foreground/80 text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              {featuredPremiere.description}
            </p>

            {/* Countdown — pill-style */}
            <div className="inline-flex items-center gap-3 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-6 py-3 mb-8">
              {[
                { val: countdown.days, label: 'd' },
                { val: countdown.hours, label: 'h' },
                { val: countdown.mins, label: 'm' },
                { val: countdown.secs, label: 's' },
              ].map((unit, i) => (
                <span key={i} className="flex items-baseline gap-0.5">
                  <span className="text-2xl md:text-3xl font-bold text-primary-foreground tabular-nums">{unit.val}</span>
                  <span className="text-xs text-primary-foreground/60 font-medium">{unit.label}</span>
                </span>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button size="lg" className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold gap-2 px-8" asChild>
                <Link to={`/cinema/${featuredPremiere.id}`}>
                  <Ticket className="w-5 h-5" />
                  Get Ticket — ${featuredPremiere.price}
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="rounded-full text-primary-foreground hover:bg-primary-foreground/10 font-semibold gap-2" asChild>
                <Link to={`/cinema/${featuredPremiere.id}`}>
                  <Play className="w-5 h-5" />
                  Watch Trailer
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-5 mt-8 text-sm text-primary-foreground/70">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(featuredPremiere.date).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {featuredPremiere.time} {featuredPremiere.timezone}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Now Showing */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Now Showing</h2>
              <p className="text-muted-foreground mt-1">Exclusive premieres available now</p>
            </div>
            <Button variant="ghost" className="rounded-full text-primary font-semibold gap-1" asChild>
              <Link to="/cinema">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {nowShowing.map((movie) => (
              <Link
                key={movie.id}
                to={`/content/${movie.id}`}
                className="group"
              >
                <div className="aspect-[2/3] relative rounded-2xl overflow-hidden bg-secondary mb-3">
                  <img
                    src={movie.thumbnailUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {movie.monetization === 'ticket' && movie.price && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
                      ${movie.price}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-primary-foreground/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-primary fill-primary ml-0.5" />
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                  {movie.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {movie.rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-accent fill-accent" />
                      {movie.rating.toFixed(1)}
                    </span>
                  )}
                  {movie.genres?.[0] && <span>{movie.genres[0]}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Screenings — Monzo card style */}
      <section className="py-16 bg-secondary/50">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Upcoming Screenings</h2>
              <p className="text-muted-foreground mt-1">Don't miss these exclusive premieres</p>
            </div>
            <Button variant="ghost" className="rounded-full text-primary font-semibold gap-1" asChild>
              <Link to="/cinema">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {upcomingScreenings.map((event) => (
              <Link
                key={event.id}
                to={`/cinema/${event.id}`}
                className="monzo-card group block"
              >
                <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-secondary">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <span className="text-sm font-bold text-primary whitespace-nowrap">${event.price}</span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {event.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {event.time}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {event.availableTickets} left
                  </span>
                  <span className="text-sm font-semibold text-primary flex items-center gap-1">
                    Get Ticket <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — Monzo-style clean steps */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-12">How It Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Ticket, title: 'Buy your ticket', desc: 'Choose a premiere and grab your ticket in seconds.', step: '1' },
              { icon: Clock, title: 'Join at showtime', desc: 'Access the virtual cinema when the screening begins.', step: '2' },
              { icon: Play, title: 'Enjoy the show', desc: 'Watch the exclusive premiere with replay included.', step: '3' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-base mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
