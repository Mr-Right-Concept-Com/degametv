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
      <div className="relative h-[28vh] sm:h-[40vh] md:h-[50vh] bg-secondary">
        <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="container mx-auto px-5 -mt-16 sm:-mt-28 relative z-10 pb-12 sm:pb-16">
        <Button variant="ghost" size="sm" className="mb-4 sm:mb-6 rounded-full text-muted-foreground text-xs" asChild>
          <Link to="/cinema">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            All Events
          </Link>
        </Button>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main */}
          <div className="lg:col-span-2">
            {event.isPremiere && (
              <Badge className="bg-primary text-primary-foreground border-0 rounded-full text-[10px] sm:text-xs px-2.5 sm:px-3 mb-3 sm:mb-4">
                PREMIERE
              </Badge>
            )}

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3 sm:mb-4">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-5 sm:mb-6">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {event.time} {event.timezone}
              </span>
            </div>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 sm:mb-8">
              {event.description}
            </p>

            <div className="mb-5 sm:mb-8">
              <h3 className="font-bold text-[10px] sm:text-sm mb-2 sm:mb-3 text-muted-foreground uppercase tracking-wider">Starring</h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {event.starring.map((name) => (
                  <span key={name} className="text-[11px] sm:text-sm bg-secondary px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-5 sm:mb-8">
              <h3 className="font-bold text-[10px] sm:text-sm mb-2 sm:mb-3 text-muted-foreground uppercase tracking-wider">Director</h3>
              <span className="text-[11px] sm:text-sm bg-secondary px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium">{event.director}</span>
            </div>

            {event.hasReplay && (
              <p className="text-xs sm:text-sm text-muted-foreground bg-secondary rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 inline-block">
                ✓ Includes {event.replayWindow}h replay window
              </p>
            )}
          </div>

          {/* Booking Card — sticky on desktop, bottom sheet feel on mobile */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 monzo-card">
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Per ticket</p>
                  <p className="text-2xl sm:text-3xl font-extrabold mt-0.5">${event.price}</p>
                </div>
                <Badge className="bg-success/10 text-success border-0 rounded-full text-[10px] sm:text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {event.availableTickets} left
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-secondary mb-5 sm:mb-6">
                <span className="font-medium text-xs sm:text-sm">Tickets</span>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"
                    onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                    disabled={ticketCount <= 1}
                  >
                    <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                  <span className="w-5 sm:w-6 text-center font-bold text-sm sm:text-base">{ticketCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"
                    onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                    disabled={ticketCount >= 10}
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 sm:py-4 border-t border-border mb-5 sm:mb-6">
                <span className="font-medium text-xs sm:text-sm">Total</span>
                <span className="text-xl sm:text-2xl font-extrabold">${totalPrice}</span>
              </div>

              <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold h-11 sm:h-12 text-sm" size="lg">
                    <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
                    Book Tickets
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl mx-4 sm:mx-auto max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-lg">Confirm Booking</DialogTitle>
                    <DialogDescription className="text-sm">
                      {ticketCount} ticket(s) for {event.title}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-3 sm:py-4">
                    <div className="p-3 sm:p-4 rounded-xl bg-secondary text-sm">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Event</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{event.title}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Date</span>
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Tickets</span>
                        <span>{ticketCount}</span>
                      </div>
                      <div className="flex justify-between pt-2.5 border-t border-border mt-2">
                        <span className="font-semibold">Total</span>
                        <span className="font-extrabold text-base sm:text-lg">${totalPrice}</span>
                      </div>
                    </div>

                    <Button className="w-full rounded-full gap-2 font-semibold h-11" onClick={handleBooking}>
                      <CreditCard className="w-4 h-4" />
                      Pay ${totalPrice}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-3 sm:mt-4">
                Secure checkout · Instant delivery
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
