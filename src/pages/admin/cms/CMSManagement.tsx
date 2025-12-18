import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Plus, Search, Upload, FolderOpen, FileVideo, FileAudio, FileImage, Settings, Tag, Clock, MoreHorizontal, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';

const mockContent = [
  { id: '1', title: 'Hero Banner Video', type: 'video', size: '2.4 GB', format: 'mp4', status: 'ready', transcoded: true, tags: ['banner', 'promo'], uploadedAt: '2024-01-15' },
  { id: '2', title: 'Podcast Episode 45', type: 'audio', size: '156 MB', format: 'mp3', status: 'processing', transcoded: false, tags: ['podcast', 'tech'], uploadedAt: '2024-01-16' },
  { id: '3', title: 'Movie Poster', type: 'image', size: '4.5 MB', format: 'jpg', status: 'ready', transcoded: true, tags: ['poster', 'artwork'], uploadedAt: '2024-01-14' },
  { id: '4', title: 'Documentary Feature', type: 'video', size: '8.2 GB', format: 'mov', status: 'transcoding', transcoded: false, tags: ['documentary', 'featured'], uploadedAt: '2024-01-16' },
];

const mockWorkflows = [
  { id: '1', name: 'Video Ingest', status: 'active', tasks: 12, completed: 8 },
  { id: '2', name: 'Subtitle Generation', status: 'queued', tasks: 5, completed: 0 },
  { id: '3', name: 'DRM Packaging', status: 'active', tasks: 3, completed: 1 },
];

const stats = [
  { label: 'Total Assets', value: '12,458', change: '+8%', icon: FolderOpen },
  { label: 'Videos', value: '4,567', change: '+12%', icon: FileVideo },
  { label: 'Audio Files', value: '3,890', change: '+15%', icon: FileAudio },
  { label: 'Images', value: '4,001', change: '+5%', icon: FileImage },
];

export default function CMSManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const getTypeIcon = (type: string) => {
    const icons: Record<string, typeof FileVideo> = {
      video: FileVideo,
      audio: FileAudio,
      image: FileImage
    };
    const Icon = icons[type] || FolderOpen;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      ready: 'default',
      processing: 'secondary',
      transcoding: 'outline',
      failed: 'destructive' as any
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <AdminLayout
      title="CMS / Media Management"
      description="Universal content library with transcoding, AI tagging, and workflow automation"
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
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Tag className="h-4 w-4 mr-2" />
              AI Auto-Tag
            </Button>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Assets
            </Button>
          </div>
        </div>

        <Tabs defaultValue="library" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="library">Media Library</TabsTrigger>
            <TabsTrigger value="transcoding">Transcoding</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="subtitles">Subtitles & Languages</TabsTrigger>
            <TabsTrigger value="drm">DRM & Rights</TabsTrigger>
          </TabsList>

          {/* Media Library */}
          <TabsContent value="library" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">All Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockContent.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(asset.type)}
                            <span className="font-medium">{asset.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{asset.type}</TableCell>
                        <TableCell className="text-muted-foreground">{asset.size}</TableCell>
                        <TableCell className="uppercase text-xs">{asset.format}</TableCell>
                        <TableCell>{getStatusBadge(asset.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {asset.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{asset.uploadedAt}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Metadata</DropdownMenuItem>
                              <DropdownMenuItem>Transcode</DropdownMenuItem>
                              <DropdownMenuItem>Generate Subtitles</DropdownMenuItem>
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

          {/* Transcoding */}
          <TabsContent value="transcoding">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Transcoding Queue</CardTitle>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Profiles
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-secondary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Documentary Feature</span>
                    <span className="text-sm text-muted-foreground">67%</span>
                  </div>
                  <Progress value={67} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">Transcoding to HLS adaptive streaming profiles...</p>
                </div>
                <div className="p-4 border rounded-lg bg-secondary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Podcast Episode 45</span>
                    <span className="text-sm text-muted-foreground">Queued</span>
                  </div>
                  <Progress value={0} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">Waiting in queue...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflows */}
          <TabsContent value="workflows">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockWorkflows.map((workflow) => (
                <Card key={workflow.id} className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{workflow.name}</h4>
                      <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
                        {workflow.status}
                      </Badge>
                    </div>
                    <Progress value={(workflow.completed / workflow.tasks) * 100} className="h-2 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {workflow.completed} of {workflow.tasks} tasks completed
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Subtitles */}
          <TabsContent value="subtitles">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Subtitle management coming soon</p>
                <p className="text-sm mt-2">AI-powered transcription and multi-language support</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DRM */}
          <TabsContent value="drm">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>DRM management coming soon</p>
                <p className="text-sm mt-2">Configure content protection and licensing</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
