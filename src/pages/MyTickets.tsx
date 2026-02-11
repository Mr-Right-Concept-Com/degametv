import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, ExternalLink, CheckCircle, Clock, Ticket } from 'lucide-react';

const mockTickets = [
  {
    id: '1',
    movie: 'The Wedding Day',
    location: 'Nigeria',
    price: 5000,
    purchasedAt: '2025-02-10',
    expiresAt: '2025-05-10',
    status: 'active',
    watchCode: 'watch_abc123xyz',
  },
  {
    id: '2',
    movie: 'Love in Lagos',
    location: 'International',
    price: 15,
    purchasedAt: '2025-01-20',
    expiresAt: '2025-04-20',
    status: 'active',
    watchCode: 'watch_def456uvw',
  },
  {
    id: '3',
    movie: 'The Last Dance',
    location: 'Nigeria',
    price: 5000,
    purchasedAt: '2024-12-01',
    expiresAt: '2025-03-01',
    status: 'expired',
    watchCode: 'watch_ghi789rst',
  },
];

export default function MyTickets() {
  const activeTickets = mockTickets.filter(t => t.status === 'active');
  const expiredTickets = mockTickets.filter(t => t.status === 'expired');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">My Tickets</h1>
            <p className="text-muted-foreground">Access all your purchased screenings in one place</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Active Tickets</p>
                    <p className="text-3xl font-bold">{activeTickets.length}</p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Expired Tickets</p>
                    <p className="text-3xl font-bold">{expiredTickets.length}</p>
                  </div>
                  <Clock className="w-12 h-12 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Total Spent</p>
                    <p className="text-2xl font-bold">₦{(activeTickets.reduce((sum, t) => sum + (typeof t.price === 'string' ? 0 : t.price), 0) + expiredTickets.reduce((sum, t) => sum + (typeof t.price === 'string' ? 0 : t.price), 0)).toLocaleString()}</p>
                  </div>
                  <Ticket className="w-12 h-12 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tickets Tabs */}
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active">Active ({activeTickets.length})</TabsTrigger>
              <TabsTrigger value="expired">Expired ({expiredTickets.length})</TabsTrigger>
            </TabsList>

            {/* Active Tickets */}
            <TabsContent value="active" className="space-y-4">
              {activeTickets.length > 0 ? (
                <div className="space-y-4">
                  {activeTickets.map((ticket) => (
                    <Card key={ticket.id} className="bg-card/50 border-green-500/30 border-2">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center mb-4">
                          <div>
                            <h3 className="font-bold text-lg">{ticket.movie}</h3>
                            <p className="text-sm text-muted-foreground">{ticket.location}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Price</p>
                            <p className="font-bold">
                              {typeof ticket.price === 'number' && ticket.price > 100 ? '₦' : '$'}{typeof ticket.price === 'number' ? ticket.price.toLocaleString() : ticket.price}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Expires</p>
                            <p className="font-bold">{ticket.expiresAt}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="default" className="w-fit">Active</Badge>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button className="flex-1" size="sm">
                            Watch Now
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard(`${window.location.origin}/watch/${ticket.watchCode}`)}
                            className="sm:flex-none"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                          </Button>
                          <Button variant="ghost" size="sm" className="sm:flex-none">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-12 text-center">
                    <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="font-bold mb-2">No Active Tickets</h3>
                    <p className="text-muted-foreground mb-4">Start watching your favorite Nollywood movies today</p>
                    <Button>Browse Movies</Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Expired Tickets */}
            <TabsContent value="expired">
              {expiredTickets.length > 0 ? (
                <div className="space-y-4">
                  {expiredTickets.map((ticket) => (
                    <Card key={ticket.id} className="bg-card/50 border-border/50 opacity-60">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center mb-4">
                          <div>
                            <h3 className="font-bold text-lg">{ticket.movie}</h3>
                            <p className="text-sm text-muted-foreground">{ticket.location}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Price</p>
                            <p className="font-bold">
                              {typeof ticket.price === 'number' && ticket.price > 100 ? '₦' : '$'}{typeof ticket.price === 'number' ? ticket.price.toLocaleString() : ticket.price}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Expired</p>
                            <p className="font-bold">{ticket.expiresAt}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="w-fit">Expired</Badge>
                          </div>
                        </div>

                        <Button variant="outline" className="w-full">
                          Buy Again
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-12 text-center">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="font-bold mb-2">No Expired Tickets</h3>
                    <p className="text-muted-foreground">Keep enjoying your movies!</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
