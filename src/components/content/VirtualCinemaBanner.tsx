import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Clock, Calendar, Users, Star, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockCinemaEvents } from '@/data/mockData';

export function VirtualCinemaBanner() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  const featuredEvent = mockCinemaEvents[0]; // Keleke premiere

  useEffect(() => {
    const targetDate = new Date(featuredEvent.date + 'T' + featuredEvent.time);
    
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [featuredEvent.date, featuredEvent.time]);

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="relative rounded-2xl overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0">
            <img
              src={featuredEvent.image}
              alt={featuredEvent.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/50" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="relative p-6 md:p-10 lg:p-12">
            <div className="max-w-2xl">
              {/* Premiere Badge */}
              <Badge className="mb-4 premiere-badge text-background border-0 font-semibold">
                <Ticket className="w-3 h-3 mr-1" />
                EXCLUSIVE PREMIERE
              </Badge>

              {/* Title */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-3">
                {featuredEvent.title}
              </h2>

              {/* Description */}
              <p className="text-muted-foreground mb-4 line-clamp-2 md:line-clamp-3">
                {featuredEvent.description}
              </p>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(featuredEvent.date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {featuredEvent.time} {featuredEvent.timezone}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {featuredEvent.availableTickets} tickets left
                </span>
              </div>

              {/* Countdown */}
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Starts in:</span>
                <div className="flex items-center gap-1">
                  {[
                    { value: timeLeft.days, label: 'd' },
                    { value: timeLeft.hours, label: 'h' },
                    { value: timeLeft.minutes, label: 'm' },
                    { value: timeLeft.seconds, label: 's' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div className="bg-primary/20 border border-primary/30 px-2 py-1 rounded">
                        <span className="font-mono font-bold text-lg text-accent">
                          {String(item.value).padStart(2, '0')}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{item.label}</span>
                      </div>
                      {index < 3 && <span className="text-muted-foreground mx-1">:</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Starring */}
              <div className="mb-6">
                <span className="text-xs text-muted-foreground">Starring: </span>
                <span className="text-sm">{featuredEvent.starring.join(', ')}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button size="lg" className="gradient-gold text-background hover:opacity-90 gap-2">
                  <Ticket className="w-5 h-5" />
                  Buy Ticket - ${featuredEvent.price}
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <Link to={`/cinema/${featuredEvent.id}`}>
                    <Play className="w-5 h-5" />
                    Watch Trailer
                  </Link>
                </Button>
              </div>

              {/* Replay info */}
              {featuredEvent.hasReplay && (
                <p className="text-xs text-muted-foreground mt-4">
                  🎬 Includes {featuredEvent.replayWindow}h replay window after premiere
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
