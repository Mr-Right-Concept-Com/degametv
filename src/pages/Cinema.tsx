import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Search, Ticket, Users, Play, Film, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockCinemaEvents } from '@/data/mockData';

export default function Cinema() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  const tags = ['All', 'Premiere', 'Marathon', 'Classics', 'World Premiere'];

  const filteredEvents = mockCinemaEvents.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'All' || event.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-1">Virtual Cinema</h1>
          <p className="text-muted-foreground">Exclusive premieres and cinema experiences</p>
        </div>

        {/* Filters — pill style */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-full bg-secondary border-0 focus-visible:ring-primary/30"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {tags.map((tag) => (
              <button
                key={tag}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Events */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((event) => (
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

              <div className="flex items-start justify-between gap-2 mb-1">
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
                  {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {event.time} {event.timezone}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <span>Starring: </span>
                <span className="text-foreground font-medium">{event.starring.slice(0, 2).join(', ')}</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  {event.availableTickets} tickets left
                </span>
                <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1 text-xs h-8 px-4">
                  <Ticket className="w-3.5 h-3.5" />
                  Get Ticket
                </Button>
              </div>

              {event.hasReplay && (
                <p className="text-xs text-muted-foreground mt-3">
                  Includes {event.replayWindow}h replay window
                </p>
              )}
            </Link>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-20">
            <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold mb-1">No events found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
