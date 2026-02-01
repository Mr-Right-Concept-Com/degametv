import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Radio, Users, Calendar, Play, Clock, Ticket } from 'lucide-react';
import { mockLiveStreams, mockChannels } from '@/data/mockData';
import { Link } from 'react-router-dom';

export default function Live() {
  const [searchQuery, setSearchQuery] = useState('');

  const liveNow = mockLiveStreams.filter((s) => s.status === 'live');
  const upcoming = mockLiveStreams.filter((s) => s.status === 'scheduled');

  const filteredChannels = mockChannels.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Radio className="w-10 h-10 text-primary animate-pulse" />
            <div>
              <h1 className="text-4xl font-display font-bold">Live</h1>
              <p className="text-muted-foreground">
                Watch live events and African TV channels
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="streams" className="w-full">
          <TabsList className="mb-6 bg-card">
            <TabsTrigger value="streams" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Live Events
            </TabsTrigger>
            <TabsTrigger value="channels" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              TV Channels
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Upcoming
            </TabsTrigger>
          </TabsList>

          {/* Live Streams */}
          <TabsContent value="streams">
            {liveNow.length === 0 ? (
              <div className="text-center py-16">
                <Radio className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No live events right now</h3>
                <p className="text-muted-foreground">Check back later or browse upcoming events</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveNow.map((stream) => (
                  <Link
                    key={stream.id}
                    to={`/live/${stream.id}`}
                    className="group relative rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/50 transition-all"
                  >
                    <div className="aspect-video relative">
                      <img
                        src={stream.thumbnailUrl || stream.bannerUrl}
                        alt={stream.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                      
                      {/* Live Badge */}
                      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-0 animate-pulse">
                        <span className="w-2 h-2 bg-white rounded-full mr-1.5" />
                        LIVE
                      </Badge>

                      {/* Ticketed Badge */}
                      {stream.isTicketed && (
                        <Badge className="absolute top-3 right-3 bg-accent text-background border-0">
                          <Ticket className="w-3 h-3 mr-1" />
                          ${stream.ticketPrice}
                        </Badge>
                      )}

                      {/* Viewer Count */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-1 text-sm text-white/90">
                        <Users className="w-4 h-4" />
                        {stream.viewerCount?.toLocaleString()}
                      </div>

                      {/* Play Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                          <Play className="w-8 h-8 text-white fill-white ml-1" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                        {stream.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {stream.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TV Channels */}
          <TabsContent value="channels">
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredChannels.map((channel) => (
                <Link
                  key={channel.id}
                  to={`/channel/${channel.id}`}
                  className="group p-4 rounded-xl bg-card border border-border/50 hover:border-accent/50 transition-all text-center"
                >
                  <div className="relative w-16 h-16 mx-auto mb-3">
                    <img
                      src={channel.logoUrl}
                      alt={channel.name}
                      className="w-full h-full object-contain rounded-lg"
                    />
                    {channel.isLive && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                    )}
                  </div>
                  <h4 className="font-medium text-sm group-hover:text-accent transition-colors line-clamp-1">
                    {channel.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">{channel.category}</p>
                </Link>
              ))}
            </div>
          </TabsContent>

          {/* Upcoming Streams */}
          <TabsContent value="upcoming">
            {upcoming.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No upcoming events</h3>
                <p className="text-muted-foreground">Stay tuned for new scheduled events</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcoming.map((stream) => (
                  <div
                    key={stream.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50"
                  >
                    <img
                      src={stream.thumbnailUrl || stream.bannerUrl}
                      alt={stream.title}
                      className="w-32 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{stream.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{stream.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {stream.scheduledStart
                            ? new Date(stream.scheduledStart).toLocaleDateString()
                            : 'TBD'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {stream.scheduledStart
                            ? new Date(stream.scheduledStart).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'TBD'}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-background">
                      Set Reminder
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
