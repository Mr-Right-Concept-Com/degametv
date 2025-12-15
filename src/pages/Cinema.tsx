import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Clock, Search, Ticket, Users, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const mockCinemaEvents = [
  {
    id: '1',
    title: 'Dune: Part Three - Premiere Screening',
    description: 'Be among the first to experience the epic conclusion of the Dune saga on the big screen.',
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
    date: '2024-03-15',
    time: '19:00',
    venue: 'IMAX Cinema Downtown',
    city: 'Los Angeles',
    price: 25,
    currency: 'USD',
    availableSeats: 120,
    totalSeats: 300,
    rating: 4.8,
    tags: ['Premiere', 'IMAX', 'Sci-Fi'],
  },
  {
    id: '2',
    title: 'Classic Film Festival: Casablanca',
    description: 'Experience the timeless classic on the silver screen with a live orchestra.',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
    date: '2024-03-20',
    time: '20:00',
    venue: 'Grand Theatre',
    city: 'New York',
    price: 35,
    currency: 'USD',
    availableSeats: 80,
    totalSeats: 200,
    rating: 4.9,
    tags: ['Classic', 'Live Orchestra', 'Romance'],
  },
  {
    id: '3',
    title: 'Marvel Marathon: Complete Saga',
    description: '24-hour marathon featuring all MCU films back-to-back.',
    image: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800',
    date: '2024-03-25',
    time: '10:00',
    venue: 'Multiplex Central',
    city: 'Chicago',
    price: 50,
    currency: 'USD',
    availableSeats: 250,
    totalSeats: 500,
    rating: 4.7,
    tags: ['Marathon', 'Action', 'Superhero'],
  },
  {
    id: '4',
    title: 'Anime Night: Studio Ghibli Collection',
    description: 'A magical evening featuring beloved Studio Ghibli masterpieces.',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
    date: '2024-04-01',
    time: '18:00',
    venue: 'Art House Cinema',
    city: 'San Francisco',
    price: 20,
    currency: 'USD',
    availableSeats: 45,
    totalSeats: 100,
    rating: 4.9,
    tags: ['Anime', 'Animation', 'Family'],
  },
];

export default function Cinema() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');

  const cities = ['All', 'Los Angeles', 'New York', 'Chicago', 'San Francisco'];

  const filteredEvents = mockCinemaEvents.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'All' || event.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold mb-2 flex items-center gap-3">
            <Ticket className="w-10 h-10 text-primary" />
            Cinema Events
          </h1>
          <p className="text-muted-foreground">
            Book tickets for exclusive screenings and cinema experiences
          </p>
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
            {cities.map((city) => (
              <Badge
                key={city}
                variant={selectedCity === city ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => setSelectedCity(city)}
              >
                <MapPin className="w-3 h-3 mr-1" />
                {city}
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
              className="group rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-primary/50 transition-all"
            >
              <div className="aspect-video relative">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                
                {/* Tags */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {event.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} className="bg-background/80 backdrop-blur-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Price */}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-primary text-white border-0 text-lg px-3 py-1">
                    ${event.price}
                  </Badge>
                </div>

                {/* Rating */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {event.rating}
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors line-clamp-1">
                  {event.title}
                </h3>
                <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                  {event.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {event.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {event.city}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{event.availableSeats} seats left</span>
                  </div>
                  <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                    Book Now
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground">Try adjusting your search or location</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
