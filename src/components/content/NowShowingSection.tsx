import { Link } from 'react-router-dom';
import { Ticket, Clock, Users, Star, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockCinemaEvents } from '@/data/mockData';

export function NowShowingSection() {
  const nowShowing = mockCinemaEvents.filter(e => e.isPremiere);

  if (nowShowing.length === 0) return null;

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 rounded-full bg-accent" />
            <div>
              <h2 className="text-2xl font-display font-bold">Now Showing</h2>
              <p className="text-muted-foreground text-sm">Virtual cinema premieres</p>
            </div>
          </div>
          <Button variant="ghost" className="gap-2 text-accent" asChild>
            <Link to="/cinema">
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nowShowing.map((event) => (
            <Link
              key={event.id}
              to={`/cinema/${event.id}`}
              className="group rounded-xl overflow-hidden bg-card border border-border/50 hover:border-accent/50 transition-all duration-300"
            >
              {/* Image */}
              <div className="relative aspect-video">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                {/* Premiere Badge */}
                <Badge className="absolute top-3 left-3 premiere-badge text-background border-0">
                  <Ticket className="w-3 h-3 mr-1" />
                  PREMIERE
                </Badge>

                {/* Price */}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-background/90 backdrop-blur-sm text-foreground border-0 font-semibold">
                    ${event.price}
                  </Badge>
                </div>

                {/* Ticket Count */}
                <div className="absolute bottom-3 right-3">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                    <Users className="w-3 h-3 mr-1" />
                    {event.availableTickets} tickets left
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-accent transition-colors">
                  {event.title}
                </h3>
                
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {event.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })} at {event.time}
                  </span>
                  {event.hasReplay && (
                    <Badge variant="outline" className="text-[10px]">
                      {event.replayWindow}h Replay
                    </Badge>
                  )}
                </div>

                {/* Starring */}
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-1">
                    {event.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
