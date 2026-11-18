import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ExternalLink, CheckCircle, Clock, Ticket, Play, Loader2, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function MyTickets() {
  usePageTitle('My Tickets');
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { error: claimError } = await supabase.rpc('claim_guest_tickets');
      if (claimError) toast.message('Your tickets could not be claimed automatically. Contact support if a purchase is missing.');
      const { data } = await supabase
        .from('screening_tickets')
        .select('*, screening:screenings(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setTickets(data);
      setLoading(false);
    };

    fetchTickets();
  }, [user]);

  const now = new Date();
  const activeTickets = tickets.filter(t => t.payment_status === 'completed' && new Date(t.expires_at) > now);
  const expiredTickets = tickets.filter(t => t.payment_status === 'completed' && new Date(t.expires_at) <= now);
  const pendingTickets = tickets.filter(t => t.payment_status === 'pending');

  const copyLink = (watchCode: string, email: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/watch/${watchCode}?email=${encodeURIComponent(email)}`);
    toast.success('Watch link copied!');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="py-6 sm:py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-0.5">My Tickets</h1>
            <p className="text-sm text-muted-foreground">Access all your purchased screenings</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Active', value: activeTickets.length, icon: CheckCircle, color: 'text-success' },
              { label: 'Pending', value: pendingTickets.length, icon: Clock, color: 'text-warning' },
              { label: 'Expired', value: expiredTickets.length, icon: Ticket, color: 'text-muted-foreground' },
            ].map((s) => (
              <div key={s.label} className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <p className="text-lg sm:text-2xl font-bold">{s.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {tickets.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Film className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <h3 className="font-bold mb-1">No Tickets Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Start watching exclusive Nollywood premieres</p>
                <Button className="rounded-full" asChild>
                  <Link to="/cinema">Browse Screenings</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="active">
              <TabsList className="mb-4">
                <TabsTrigger value="active">Active ({activeTickets.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({pendingTickets.length})</TabsTrigger>
                <TabsTrigger value="expired">Expired ({expiredTickets.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-3">
                {activeTickets.map((t) => (
                  <TicketCard key={t.id} ticket={t} onCopy={copyLink} type="active" />
                ))}
              </TabsContent>

              <TabsContent value="pending" className="space-y-3">
                {pendingTickets.map((t) => (
                  <TicketCard key={t.id} ticket={t} onCopy={copyLink} type="pending" />
                ))}
              </TabsContent>

              <TabsContent value="expired" className="space-y-3">
                {expiredTickets.map((t) => (
                  <TicketCard key={t.id} ticket={t} onCopy={copyLink} type="expired" />
                ))}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

function TicketCard({ ticket, onCopy, type }: { ticket: any; onCopy: (wc: string, email: string) => void; type: string }) {
  const movieTitle = ticket.screening?.title || 'Movie';
  const symbol = ticket.currency === 'NGN' ? '₦' : '$';

  return (
    <Card className={`transition-all active:scale-[0.99] ${
      type === 'active' ? 'border-success/30' : type === 'pending' ? 'border-warning/30' : 'opacity-60'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {ticket.screening?.poster_url && (
            <div className="w-14 h-20 rounded-lg overflow-hidden shrink-0">
              <img src={ticket.screening.poster_url} alt={movieTitle} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm line-clamp-1">{movieTitle}</h3>
            <p className="text-xs text-muted-foreground capitalize">{ticket.location}</p>
            <p className="text-sm font-bold text-primary mt-1">{symbol}{Number(ticket.price).toLocaleString()}</p>
          </div>
          <Badge variant={type === 'active' ? 'default' : type === 'pending' ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
            {type === 'active' ? 'Active' : type === 'pending' ? 'Pending' : 'Expired'}
          </Badge>
        </div>

        {type === 'active' && (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 rounded-full h-9 text-xs" asChild>
              <Link to={`/watch/${ticket.watch_code}?email=${encodeURIComponent(ticket.email)}`}>
                <Play className="w-3.5 h-3.5 mr-1" /> Watch Now
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full h-9" onClick={() => onCopy(ticket.watch_code, ticket.email)}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {type === 'expired' && (
          <Button variant="outline" size="sm" className="w-full rounded-full h-9 text-xs" asChild>
            <Link to={`/buy/${ticket.screening?.slug || ''}`}>Buy Again</Link>
          </Button>
        )}

        <p className="text-[10px] text-muted-foreground mt-2">
          {type === 'active' ? `Expires ${new Date(ticket.expires_at).toLocaleDateString()}` : 
           type === 'pending' ? 'Awaiting payment confirmation' :
           `Expired ${new Date(ticket.expires_at).toLocaleDateString()}`}
        </p>
      </CardContent>
    </Card>
  );
}
