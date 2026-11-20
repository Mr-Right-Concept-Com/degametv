import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Radio, Users, Clock, DollarSign, Play, Pause, Settings,
  MessageSquare, Video, Calendar
} from 'lucide-react';
import { mockLiveStreams } from '@/data/mockData';

export default function StreamManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStreams = mockLiveStreams.filter((stream) =>
    stream.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const liveStreams = filteredStreams.filter((s) => s.status === 'live');
  const scheduledStreams = filteredStreams.filter((s) => s.status === 'scheduled');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ended': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const totalViewers = mockLiveStreams
    .filter((s) => s.status === 'live')
    .reduce((acc, s) => acc + (s.viewerCount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Live Streams</h1>
            <p className="text-muted-foreground">Manage live streaming events and broadcasts</p>
          </div>
          <Button className="gap-2 bg-gradient-primary">
            <Plus className="w-4 h-4" />
            Create Stream
          </Button>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-500/20 to-red-500/5 border-red-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Radio className="w-5 h-5 text-red-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{liveStreams.length}</p>
                  <p className="text-sm text-muted-foreground">Live Now</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalViewers.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Viewers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{scheduledStreams.length}</p>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
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
                  <p className="text-2xl font-bold">$84.5K</p>
                  <p className="text-sm text-muted-foreground">Ticket Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Streams */}
        {liveStreams.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Live Now
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveStreams.map((stream) => (
                <Card key={stream.id} className="bg-card border-border overflow-hidden">
                  <div className="relative">
                    <img
                      src={stream.bannerUrl || stream.thumbnailUrl}
                      alt={stream.title}
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-red-500 text-white gap-1">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        LIVE
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className="bg-black/50 text-white border-white/30">
                        <Users className="w-3 h-3 mr-1" />
                        {stream.viewerCount?.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">{stream.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {stream.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {stream.chatEnabled && (
                          <Badge variant="outline" className="gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Chat
                          </Badge>
                        )}
                        {stream.recordingEnabled && (
                          <Badge variant="outline" className="gap-1">
                            <Video className="w-3 h-3" />
                            Recording
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive">
                          <Pause className="w-4 h-4 mr-1" />
                          End
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search streams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* All Streams Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[350px]">Stream</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Viewers</TableHead>
                <TableHead>Monetization</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStreams.map((stream) => (
                <TableRow key={stream.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={stream.thumbnailUrl || stream.bannerUrl}
                        alt={stream.title}
                        className="w-20 h-12 object-cover rounded-lg"
                      />
                      <div>
                        <p className="font-medium">{stream.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {stream.description}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(stream.status)}>
                      {stream.status === 'live' && (
                        <span className="w-2 h-2 rounded-full bg-red-400 mr-1 animate-pulse" />
                      )}
                      {stream.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {stream.viewerCount?.toLocaleString() || '0'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {stream.isTicketed ? `$${stream.ticketPrice}` : 'Free'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {stream.scheduledStart
                      ? new Date(stream.scheduledStart).toLocaleDateString()
                      : 'N/A'}
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
                          Watch Stream
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Eye className="w-4 h-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Edit className="w-4 h-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Settings className="w-4 h-4" />
                          Stream Settings
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
      </div>
    </AdminLayout>
  );
}
