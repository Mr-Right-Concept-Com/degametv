import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Minus, Plus, CreditCard, Ticket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const mockEvent = {
  id: '1',
  title: 'Dune: Part Three - Premiere Screening',
  description: 'Be among the first to experience the epic conclusion of the Dune saga on the big screen. This exclusive premiere screening features state-of-the-art IMAX projection and Dolby Atmos sound for the ultimate cinematic experience.',
  image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200',
  date: '2024-03-15',
  time: '19:00',
  venue: 'IMAX Cinema Downtown',
  address: '123 Main Street, Downtown',
  city: 'Los Angeles',
  price: 25,
  currency: 'USD',
  availableSeats: 120,
  totalSeats: 300,
  rating: 4.8,
  duration: 165,
  tags: ['Premiere', 'IMAX', 'Sci-Fi', 'Dolby Atmos'],
  amenities: ['Reserved Seating', 'Concessions Available', 'Wheelchair Accessible', 'Parking Available'],
};

export default function CinemaEvent() {
  const { id } = useParams<{ id: string }>();
  const [ticketCount, setTicketCount] = useState(1);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const totalPrice = ticketCount * mockEvent.price;

  const handleBooking = () => {
    toast.success(`Successfully booked ${ticketCount} ticket(s) for ${mockEvent.title}!`);
    setIsBookingOpen(false);
  };

  return (
    <MainLayout>
      {/* Hero Banner */}
      <div className="relative h-[50vh] md:h-[60vh]">
        <img
          src={mockEvent.image}
          alt={mockEvent.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {mockEvent.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              {mockEvent.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-muted-foreground mb-6">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {new Date(mockEvent.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {mockEvent.time} ({mockEvent.duration} min)
              </span>
            </div>

            <div className="flex items-start gap-2 text-muted-foreground mb-8">
              <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">{mockEvent.venue}</p>
                <p>{mockEvent.address}, {mockEvent.city}</p>
              </div>
            </div>

            <div className="prose prose-invert max-w-none mb-8">
              <h3 className="text-xl font-semibold mb-3">About this Event</h3>
              <p className="text-muted-foreground leading-relaxed">
                {mockEvent.description}
              </p>
            </div>

            {/* Amenities */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3">Amenities</h3>
              <div className="grid grid-cols-2 gap-3">
                {mockEvent.amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2 p-3 rounded-lg bg-card/50 border border-border/50"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 rounded-2xl bg-card border border-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-muted-foreground text-sm">Price per ticket</p>
                  <p className="text-3xl font-bold">${mockEvent.price}</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  <Users className="w-3 h-3 mr-1" />
                  {mockEvent.availableSeats} left
                </Badge>
              </div>

              {/* Ticket Selector */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 mb-6">
                <span className="font-medium">Tickets</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                    disabled={ticketCount <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold">{ticketCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                    disabled={ticketCount >= 10}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between py-4 border-t border-border mb-6">
                <span className="font-medium">Total</span>
                <span className="text-2xl font-bold">${totalPrice}</span>
              </div>

              {/* Book Button */}
              <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-gradient-primary hover:opacity-90 gap-2" size="lg">
                    <Ticket className="w-5 h-5" />
                    Book Tickets
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Booking</DialogTitle>
                    <DialogDescription>
                      You're about to book {ticketCount} ticket(s) for {mockEvent.title}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Event</span>
                        <span className="font-medium">{mockEvent.title}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Date</span>
                        <span>{new Date(mockEvent.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Time</span>
                        <span>{mockEvent.time}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Tickets</span>
                        <span>{ticketCount}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border mt-2">
                        <span className="font-medium">Total</span>
                        <span className="font-bold text-lg">${totalPrice}</span>
                      </div>
                    </div>

                    <Button className="w-full gap-2" onClick={handleBooking}>
                      <CreditCard className="w-4 h-4" />
                      Pay ${totalPrice}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <p className="text-center text-xs text-muted-foreground mt-4">
                Secure checkout powered by Stripe
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
