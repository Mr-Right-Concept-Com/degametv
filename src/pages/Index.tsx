import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Ticket, Clock, Calendar, Star, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockMovies, mockCinemaEvents } from '@/data/mockData';
import { useState, useEffect } from 'react';

// Virtual Cinema - Spixie-style homepage
export default function Index() {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  
  // Get featured premiere (next upcoming event)
  const featuredPremiere = mockCinemaEvents.find(e => e.isPremiere) || mockCinemaEvents[0];
  
  // Now showing - movies with ticket monetization
  const nowShowing = mockMovies
    .filter(m => m.monetization === 'ticket' || m.isFeatured)
    .slice(0, 6);
  
  // Upcoming screenings
  const upcomingScreenings = mockCinemaEvents.slice(0, 4);

  // Countdown timer
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
      {/* Hero - Featured Premiere */}
      {featuredPremiere && (
        <section className="relative h-[85vh] overflow-hidden">
          <img
            src={featuredPremiere.image}
            alt={featuredPremiere.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
          
          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl">
                <Badge className="premiere-badge text-background border-0 mb-4">
                  <Ticket className="w-3 h-3 mr-1" />
                  VIRTUAL PREMIERE
                </Badge>
                
                <h1 className="text-5xl md:text-7xl font-display font-bold mb-4">
                  {featuredPremiere.title}
                </h1>
                
                <p className="text-muted-foreground text-lg mb-6 line-clamp-3">
                  {featuredPremiere.description}
                </p>
                
                {/* Starring */}
                <p className="text-sm text-muted-foreground mb-6">
                  Starring: <span className="text-foreground">{featuredPremiere.starring.join(', ')}</span>
                </p>
                
                {/* Countdown */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent">{countdown.days}</div>
                    <div className="text-xs text-muted-foreground">DAYS</div>
                  </div>
                  <span className="text-2xl text-muted-foreground">:</span>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent">{countdown.hours}</div>
                    <div className="text-xs text-muted-foreground">HOURS</div>
                  </div>
                  <span className="text-2xl text-muted-foreground">:</span>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent">{countdown.mins}</div>
                    <div className="text-xs text-muted-foreground">MINS</div>
                  </div>
                  <span className="text-2xl text-muted-foreground">:</span>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent">{countdown.secs}</div>
                    <div className="text-xs text-muted-foreground">SECS</div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-4">
                  <Button size="lg" className="gradient-gold text-background hover:opacity-90 gap-2" asChild>
                    <Link to={`/cinema/${featuredPremiere.id}`}>
                      <Ticket className="w-5 h-5" />
                      Buy Ticket - ${featuredPremiere.price}
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2 border-border/50" asChild>
                    <Link to={`/cinema/${featuredPremiere.id}`}>
                      Watch Trailer
                    </Link>
                  </Button>
                </div>
                
                {/* Date & Time */}
                <div className="flex items-center gap-4 mt-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-accent" />
                    {new Date(featuredPremiere.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-accent" />
                    {featuredPremiere.time} {featuredPremiere.timezone}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Now Showing Section */}
      <section className="py-12 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-display font-bold">Now Showing</h2>
              <p className="text-muted-foreground">Watch these exclusive premieres now</p>
            </div>
            <Button variant="link" className="text-accent gap-1" asChild>
              <Link to="/cinema">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {nowShowing.map((movie) => (
              <Link
                key={movie.id}
                to={`/content/${movie.id}`}
                className="group relative rounded-xl overflow-hidden bg-card border border-border/30 hover:border-accent/50 transition-all"
              >
                <div className="aspect-[2/3] relative">
                  <img
                    src={movie.thumbnailUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {movie.monetization === 'ticket' && (
                    <Badge className="absolute top-2 right-2 bg-accent text-background text-xs border-0">
                      ${movie.price}
                    </Badge>
                  )}
                  
                  {/* Play button on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center">
                      <Play className="w-6 h-6 text-background fill-background ml-0.5" />
                    </div>
                  </div>
                </div>
                
                <div className="p-3">
                  <h3 className="font-medium text-sm line-clamp-1 group-hover:text-accent transition-colors">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {movie.rating && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-accent fill-accent" />
                        {movie.rating.toFixed(1)}
                      </span>
                    )}
                    {movie.genres?.[0] && <span>{movie.genres[0]}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Screenings */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-display font-bold">Upcoming Screenings</h2>
              <p className="text-muted-foreground">Don't miss these exclusive virtual premieres</p>
            </div>
            <Button variant="link" className="text-accent gap-1" asChild>
              <Link to="/cinema">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingScreenings.map((event) => (
              <Link
                key={event.id}
                to={`/cinema/${event.id}`}
                className="group flex gap-4 p-4 rounded-2xl bg-card border border-border/30 hover:border-accent/50 transition-all"
              >
                <div className="w-32 h-44 flex-shrink-0 rounded-xl overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {event.isPremiere && (
                        <Badge className="premiere-badge text-background text-xs border-0 mb-2">
                          PREMIERE
                        </Badge>
                      )}
                      <h3 className="text-xl font-display font-semibold group-hover:text-accent transition-colors line-clamp-1">
                        {event.title}
                      </h3>
                    </div>
                    <Badge className="bg-accent text-background text-sm border-0 flex-shrink-0">
                      ${event.price}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {event.description}
                  </p>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-accent" />
                      {new Date(event.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-accent" />
                      {event.time}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {event.availableTickets} tickets left
                    </div>
                    <Button size="sm" className="gradient-gold text-background hover:opacity-90 gap-1">
                      <Ticket className="w-4 h-4" />
                      Get Ticket
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 bg-card/30 border-y border-border/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-display font-bold text-center mb-10">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-8 h-8 text-background" />
              </div>
              <h3 className="font-semibold text-lg mb-2">1. Buy Your Ticket</h3>
              <p className="text-muted-foreground text-sm">
                Purchase a ticket for your chosen premiere screening
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">2. Join at Showtime</h3>
              <p className="text-muted-foreground text-sm">
                Access the virtual cinema at the scheduled premiere time
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-background" />
              </div>
              <h3 className="font-semibold text-lg mb-2">3. Enjoy the Show</h3>
              <p className="text-muted-foreground text-sm">
                Watch the exclusive premiere with replay access included
              </p>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
