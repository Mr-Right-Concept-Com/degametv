import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, Search, MoreHorizontal, Eye, Edit, Trash2, 
  Clapperboard, Users, Calendar, DollarSign, Play, 
  Clock, Ticket, Film, RefreshCw, Lock
} from 'lucide-react';

const mockScreenings = [
  {
    id: '1',
    title: 'Indie Film Festival 2024 - Opening Night',
    film: 'The Last Frontier',
    status: 'live',
    type: 'premiere',
    scheduledStart: '2024-03-15T19:00:00Z',
    replayUntil: '2024-03-17T19:00:00Z',
    ticketsSold: 2450,
    ticketPrice: 14.99,
    viewers: 1820,
    isDRM: true,
  },
  {
    id: '2',
    title: 'Cannes Selection - Midnight Protocol',
    film: 'Midnight Protocol',
    status: 'scheduled',
    type: 'festival',
    scheduledStart: '2024-03-20T20:00:00Z',
    replayUntil: '2024-03-22T20:00:00Z',
    ticketsSold: 890,
    ticketPrice: 12.99,
    viewers: 0,
    isDRM: true,
  },
  {
    id: '3',
    title: 'Director\'s Cut Exclusive',
    film: 'Echoes of Tomorrow',
    status: 'replay',
    type: 'exclusive',
    scheduledStart: '2024-03-10T18:00:00Z',
    replayUntil: '2024-03-15T18:00:00Z',
    ticketsSold: 5200,
    ticketPrice: 9.99,
    viewers: 3400,
    isDRM: true,
  },
  {
    id: '4',
    title: 'Classic Cinema Series',
    film: 'Shadow Empire',
    status: 'ended',
    type: 'series',
    scheduledStart: '2024-03-01T17:00:00Z',
    replayUntil: '2024-03-08T17:00:00Z',
    ticketsSold: 8900,
    ticketPrice: 7.99,
    viewers: 0,
    isDRM: true,
  },
];

const mockFestivals = [
  {
    id: 'f1',
    name: 'Indie Film Festival 2024',
    status: 'active',
    startDate: '2024-03-15',
    endDate: '2024-03-25',
    screenings: 24,
    totalTickets: 45000,
    revenue: 450000,
  },
  {
    id: 'f2',
    name: 'International Documentary Week',
    status: 'upcoming',
    startDate: '2024-04-01',
    endDate: '2024-04-07',
    screenings: 14,
    totalTickets: 0,
    revenue: 0,
  },
];

export default function ScreeningManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'replay': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'ended': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const totalRevenue = mockScreenings.reduce(
    (acc, s) => acc + s.ticketsSold * s.ticketPrice,
    0
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Virtual Cinema</h1>
            <p className="text-muted-foreground">Manage screenings, festivals, and premiere events</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              Schedule Festival
            </Button>
            <Button className="gap-2 bg-gradient-primary">
              <Plus className="w-4 h-4" />
              New Screening
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Clapperboard className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mockScreenings.length}</p>
                  <p className="text-sm text-muted-foreground">Screenings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Ticket className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {mockScreenings.reduce((acc, s) => acc + s.ticketsSold, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Tickets Sold</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${(totalRevenue / 1000).toFixed(1)}K</p>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Users className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {mockScreenings.reduce((acc, s) => acc + s.viewers, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Viewers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="screenings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="screenings">Screenings</TabsTrigger>
            <TabsTrigger value="festivals">Festivals</TabsTrigger>
            <TabsTrigger value="replays">Replay Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="screenings" className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search screenings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Screenings Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[300px]">Screening</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Replay Until</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockScreenings.map((screening) => (
                    <TableRow key={screening.id} className="border-border">
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{screening.title}</p>
                            {screening.isDRM && (
                              <Lock className="w-3 h-3 text-green-400" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {screening.film}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(screening.status)}>
                          {screening.status === 'live' && (
                            <span className="w-2 h-2 rounded-full bg-red-400 mr-1 animate-pulse" />
                          )}
                          {screening.status === 'replay' && (
                            <RefreshCw className="w-3 h-3 mr-1" />
                          )}
                          {screening.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {screening.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {screening.ticketsSold.toLocaleString()} @ ${screening.ticketPrice}
                      </TableCell>
                      <TableCell>
                        ${(screening.ticketsSold * screening.ticketPrice).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {new Date(screening.replayUntil).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                              <Play className="w-4 h-4" />
                              Watch
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Eye className="w-4 h-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Edit className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive">
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="festivals" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockFestivals.map((festival) => (
                <Card key={festival.id} className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{festival.name}</CardTitle>
                      <Badge 
                        variant="outline" 
                        className={festival.status === 'active' 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }
                      >
                        {festival.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {festival.startDate} - {festival.endDate}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{festival.screenings}</p>
                        <p className="text-sm text-muted-foreground">Screenings</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{festival.totalTickets.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Tickets</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">${(festival.revenue / 1000).toFixed(0)}K</p>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Button variant="outline" className="flex-1 gap-2">
                        <Calendar className="w-4 h-4" />
                        View Schedule
                      </Button>
                      <Button className="flex-1 gap-2">
                        <Edit className="w-4 h-4" />
                        Manage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="replays" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Live-to-Replay Settings</CardTitle>
                <CardDescription>
                  Configure how live screenings are converted to replay content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Replay Window</label>
                    <select className="w-full p-2 rounded-lg border border-border bg-background">
                      <option value="24">24 hours</option>
                      <option value="48">48 hours</option>
                      <option value="72">72 hours</option>
                      <option value="168">7 days</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Auto-Convert to Replay</label>
                    <select className="w-full p-2 rounded-lg border border-border bg-background">
                      <option value="immediate">Immediately after live ends</option>
                      <option value="1h">1 hour after</option>
                      <option value="manual">Manual approval</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">DRM Protection</label>
                    <select className="w-full p-2 rounded-lg border border-border bg-background">
                      <option value="widevine">Widevine + FairPlay</option>
                      <option value="playready">PlayReady</option>
                      <option value="all">All DRM Systems</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Replay Ticket Pricing</label>
                    <select className="w-full p-2 rounded-lg border border-border bg-background">
                      <option value="same">Same as live</option>
                      <option value="discount">Discounted (configurable)</option>
                      <option value="free">Free for ticket holders</option>
                    </select>
                  </div>
                </div>
                <Button className="bg-gradient-primary">Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
