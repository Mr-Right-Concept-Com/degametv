import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Minus, Plus, CreditCard, Ticket, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { mockCinemaEvents } from '@/data/mockData';
import { toast } from 'sonner';

export default function CinemaEvent() {
  const { id } = useParams<{ id: string }>();
  const [ticketCount, setTicketCount] = useState(1);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const event = mockCinemaEvents.find(e => e.id === id) || mockCinemaEvents[0];
  const totalPrice = (ticketCount * event.price).toFixed(2);

  const handleBooking = () => {
    toast.success(`Successfully booked ${ticketCount} ticket(s) for ${event.title}!`);
    setIsBookingOpen(false);
  };

  return (
    <MainLayout>
      {/* Hero */}
      <div className="relative h-[40vh] md:h-[50vh] bg-secondary">
        <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-28 relative z-10 pb-16">
        <Button variant="ghost" size="sm" className="mb-6 rounded-full text-muted-foreground" asChild>
          <Link to="/cinema">
            <ArrowLeft className="w-4 h-4 mr-1" />
            All Events
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2">
            {event.isPremiere && (
              <Badge className="bg-primary text-primary-foreground border-0 rounded-full text-xs px-3 mb-4">
                PREMIERE
              </Badge>
            )}

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {event.time} {event.timezone}
              </span>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              {event.description}
            </p>

            <div className="mb-8">
              <h3 className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Starring</h3>
              <div className="flex flex-wrap gap-2">
                {event.starring.map((name) => (
                  <span key={name} className="text-sm bg-secondary px-3 py-1.5 rounded-full font-medium">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Director</h3>
              <span className="text-sm bg-secondary px-3 py-1.5 rounded-full font-medium">{event.director}</span>
            </div>

            {event.hasReplay && (
              <p className="text-sm text-muted-foreground mt-6 bg-secondary rounded-xl px-4 py-3 inline-block">
                ✓ Includes {event.replayWindow}h replay window after screening
              </p>
            )}
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 monzo-card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Price per ticket</p>
                  <p className="text-3xl font-extrabold mt-1">${event.price}</p>
                </div>
                <Badge className="bg-success/10 text-success border-0 rounded-full">
                  <Users className="w-3 h-3 mr-1" />
                  {event.availableTickets} left
                </Badge>
              </div>

              {/* Ticket Selector */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary mb-6">
                <span className="font-medium text-sm">Tickets</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                    disabled={ticketCount <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-6 text-center font-bold">{ticketCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                    disabled={ticketCount >= 10}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-t border-border mb-6">
                <span className="font-medium text-sm">Total</span>
                <span className="text-2xl font-extrabold">${totalPrice}</span>
              </div>

              <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold" size="lg">
                    <Ticket className="w-5 h-5" />
                    Book Tickets
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Confirm Booking</DialogTitle>
                    <DialogDescription>
                      You're about to book {ticketCount} ticket(s) for {event.title}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="p-4 rounded-xl bg-secondary">
                      <div className="flex justify-between mb-2 text-sm">
                        <span className="text-muted-foreground">Event</span>
                        <span className="font-medium">{event.title}</span>
                      </div>
                      <div className="flex justify-between mb-2 text-sm">
                        <span className="text-muted-foreground">Date</span>
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between mb-2 text-sm">
                        <span className="text-muted-foreground">Time</span>
                        <span>{event.time}</span>
                      </div>
                      <div className="flex justify-between mb-2 text-sm">
                        <span className="text-muted-foreground">Tickets</span>
                        <span>{ticketCount}</span>
                      </div>
                      <div className="flex justify-between pt-3 border-t border-border mt-2">
                        <span className="font-semibold">Total</span>
                        <span className="font-extrabold text-lg">${totalPrice}</span>
                      </div>
                    </div>

                    <Button className="w-full rounded-full gap-2 font-semibold" onClick={handleBooking}>
                      <CreditCard className="w-4 h-4" />
                      Pay ${totalPrice}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <p className="text-center text-xs text-muted-foreground mt-4">
                Secure checkout · Instant delivery
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
