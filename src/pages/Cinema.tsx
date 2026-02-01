import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Search, Ticket, Users, Star, Play, Film } from 'lucide-react';
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Ticket className="w-10 h-10 text-accent" />
            <div>
              <h1 className="text-4xl font-display font-bold">Virtual Cinema</h1>
              <p className="text-muted-foreground">
                Exclusive premieres and cinema experiences
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                className={`cursor-pointer transition-colors ${
                  selectedTag === tag 
                    ? 'bg-accent text-background hover:bg-accent/90' 
                    : 'hover:bg-accent/20 hover:border-accent'
                }`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEvents.map((event) => (
            <Link
              key={event.id}
              to={`/cinema/${event.id}`}
              className="group rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-accent/50 transition-all duration-300"
            >
              <div className="aspect-video relative">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                
                {/* Tags */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {event.isPremiere && (
                    <Badge className="premiere-badge text-background border-0">
                      <Ticket className="w-3 h-3 mr-1" />
                      PREMIERE
                    </Badge>
                  )}
                </div>

                {/* Price */}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-accent text-background border-0 text-lg px-3 py-1 font-semibold">
                    ${event.price}
                  </Badge>
                </div>

                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center">
                    <Play className="w-8 h-8 text-background fill-background ml-1" />
                  </div>
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-xl font-display font-semibold group-hover:text-accent transition-colors line-clamp-1">
                  {event.title}
                </h3>
                <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                  {event.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-accent" />
                    {new Date(event.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-accent" />
                    {event.time} {event.timezone}
                  </span>
                </div>

                {/* Starring */}
                <div className="mt-3 text-sm">
                  <span className="text-muted-foreground">Starring: </span>
                  <span className="text-foreground">{event.starring.slice(0, 2).join(', ')}</span>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{event.availableTickets} tickets left</span>
                  </div>
                  <Button size="sm" className="gradient-gold text-background hover:opacity-90">
                    <Ticket className="w-4 h-4 mr-1" />
                    Get Ticket
                  </Button>
                </div>

                {/* Replay Window */}
                {event.hasReplay && (
                  <p className="text-xs text-muted-foreground mt-3">
                    🎬 Includes {event.replayWindow}h replay window
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
