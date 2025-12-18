import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Upload, Music, Mic, BookOpen, PlayCircle, MoreHorizontal, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';

const mockAudio = [
  { id: '1', title: 'Summer Vibes', artist: 'DJ Max', type: 'music', duration: '3:45', plays: 12500, status: 'published', uploadedAt: '2024-01-15' },
  { id: '2', title: 'Tech Talk Podcast', artist: 'TechCrew', type: 'podcast', duration: '45:20', plays: 8900, status: 'published', uploadedAt: '2024-01-14' },
  { id: '3', title: 'The Great Novel', artist: 'John Smith', type: 'audiobook', duration: '8:30:00', plays: 2340, status: 'processing', uploadedAt: '2024-01-16' },
];

const stats = [
  { label: 'Total Tracks', value: '4,567', change: '+12%', icon: Music },
  { label: 'Podcasts', value: '234', change: '+18%', icon: Mic },
  { label: 'Audiobooks', value: '89', change: '+5%', icon: BookOpen },
  { label: 'Total Plays', value: '1.2M', change: '+22%', icon: PlayCircle },
];

export default function AudioManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const getTypeBadge = (type: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'outline'> = {
      music: 'default',
      podcast: 'secondary',
      audiobook: 'outline'
    };
    return <Badge variant={colors[type]}>{type}</Badge>;
  };

  return (
    <AdminLayout
      title="Audio / Podcast"
      description="Manage music, podcasts, and audiobooks"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold">{stat.value}</span>
                      <span className="text-xs text-green-500">{stat.change}</span>
                    </div>
                  </div>
                  <stat.icon className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search audio content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Audio
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="all">All Audio</TabsTrigger>
            <TabsTrigger value="music">Music</TabsTrigger>
            <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
            <TabsTrigger value="audiobooks">Audiobooks</TabsTrigger>
            <TabsTrigger value="creators">Creators</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Audio Library</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Artist/Creator</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Plays</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockAudio.map((audio) => (
                      <TableRow key={audio.id}>
                        <TableCell className="font-medium">{audio.title}</TableCell>
                        <TableCell>{audio.artist}</TableCell>
                        <TableCell>{getTypeBadge(audio.type)}</TableCell>
                        <TableCell className="text-muted-foreground">{audio.duration}</TableCell>
                        <TableCell>{audio.plays.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={audio.status === 'published' ? 'default' : 'secondary'}>
                            {audio.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{audio.uploadedAt}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>View Analytics</DropdownMenuItem>
                              <DropdownMenuItem>Manage Royalties</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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

          {['music', 'podcasts', 'audiobooks'].map((type) => (
            <TabsContent key={type} value={type}>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Filtered view for {type} coming soon
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          <TabsContent value="creators">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Creator dashboard coming soon</p>
                <p className="text-sm mt-2">Manage creators, royalties, and payouts</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
