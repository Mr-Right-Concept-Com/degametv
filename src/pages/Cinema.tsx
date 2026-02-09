import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Search, Ticket, Users, Film, ArrowRight } from 'lucide-react';
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
      <div className="container mx-auto px-5 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-5 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-0.5 sm:mb-1">Virtual Cinema</h1>
          <p className="text-sm text-muted-foreground">Exclusive premieres and cinema experiences</p>
        </div>

        {/* Filters */}
        <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-4 mb-6 sm:mb-10">
          <div className="relative sm:flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-full bg-secondary border-0 focus-visible:ring-primary/30 h-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tags.map((tag) => (
              <button
                key={tag}
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
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
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
          {filteredEvents.map((event) => (
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
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <span className="text-xs sm:text-sm font-bold text-primary whitespace-nowrap">${event.price}</span>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 sm:mb-4">
                  {event.description}
                </p>

                <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {event.time} {event.timezone}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                    <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {event.availableTickets} left
                  </span>
                  <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1 text-[10px] sm:text-xs h-7 sm:h-8 px-3 sm:px-4">
                    <Ticket className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    Get Ticket
                  </Button>
                </div>

                {event.hasReplay && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3">
                    Includes {event.replayWindow}h replay
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-16 sm:py-20">
            <Film className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground/40" />
            <h3 className="text-base sm:text-lg font-semibold mb-1">No events found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
