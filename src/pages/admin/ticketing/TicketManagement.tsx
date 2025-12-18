import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Download, QrCode, Mail, Filter, MoreHorizontal, Eye, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';

const mockTickets = [
  { id: '1', code: 'TKT-001-LIVE', type: 'live', event: 'Concert 2024', buyer: 'John Doe', email: 'john@example.com', price: 49.99, status: 'valid', purchasedAt: '2024-01-15', expiresAt: '2024-02-01' },
  { id: '2', code: 'TKT-002-VOD', type: 'vod', event: 'Premium Movie', buyer: 'Jane Smith', email: 'jane@example.com', price: 12.99, status: 'used', purchasedAt: '2024-01-14', expiresAt: '2024-01-21' },
  { id: '3', code: 'TKT-003-RPL', type: 'replay', event: 'Film Festival', buyer: 'Bob Wilson', email: 'bob@example.com', price: 24.99, status: 'expired', purchasedAt: '2024-01-10', expiresAt: '2024-01-12' },
  { id: '4', code: 'TKT-004-EDU', type: 'elearning', event: 'React Course', buyer: 'Alice Brown', email: 'alice@example.com', price: 99.99, status: 'valid', purchasedAt: '2024-01-16', expiresAt: '2024-04-16' },
];

const stats = [
  { label: 'Total Tickets', value: '12,458', change: '+12%' },
  { label: 'Revenue', value: '$245,890', change: '+18%' },
  { label: 'Valid Tickets', value: '8,234', change: '+5%' },
  { label: 'Used Today', value: '456', change: '+23%' },
];

export default function TicketManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      valid: 'default',
      used: 'secondary',
      expired: 'destructive',
      refunded: 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      live: 'Live Event',
      vod: 'VOD Access',
      replay: 'Replay',
      elearning: 'eLearning',
      screening: 'Screening'
    };
    return <Badge variant="outline" className="text-xs">{labels[type] || type}</Badge>;
  };

  return (
    <AdminLayout
      title="Ticketing & Access"
      description="Manage tickets for live events, VOD, replays, and eLearning"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span className="text-xs text-green-500">{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets, codes, or emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <QrCode className="h-4 w-4 mr-2" />
              Scan Ticket
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="all">All Tickets</TabsTrigger>
            <TabsTrigger value="live">Live Events</TabsTrigger>
            <TabsTrigger value="vod">VOD Access</TabsTrigger>
            <TabsTrigger value="replay">Replays</TabsTrigger>
            <TabsTrigger value="elearning">eLearning</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">All Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Event/Content</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-sm">{ticket.code}</TableCell>
                        <TableCell>{getTypeBadge(ticket.type)}</TableCell>
                        <TableCell>{ticket.event}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ticket.buyer}</p>
                            <p className="text-xs text-muted-foreground">{ticket.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>${ticket.price.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ticket.expiresAt}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                Resend Email
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <QrCode className="h-4 w-4 mr-2" />
                                Show QR Code
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Revoke Ticket
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {['live', 'vod', 'replay', 'elearning'].map((type) => (
            <TabsContent key={type} value={type}>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Filtered view for {type} tickets coming soon
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
