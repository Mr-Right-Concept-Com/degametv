import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code2, Key, Webhook, FileCode, Download, Copy, Eye, EyeOff, RefreshCw, Plus, ExternalLink } from 'lucide-react';
import { useState } from 'react';

const mockApiKeys = [
  { id: '1', name: 'Production API', key: 'pk_live_****************************abcd', type: 'publishable', created: '2024-01-01', lastUsed: '2024-01-16', requests: '1.2M' },
  { id: '2', name: 'Development API', key: 'pk_test_****************************efgh', type: 'publishable', created: '2024-01-05', lastUsed: '2024-01-16', requests: '45.6K' },
  { id: '3', name: 'Server Key', key: 'sk_live_****************************ijkl', type: 'secret', created: '2024-01-01', lastUsed: '2024-01-15', requests: '890K' },
];

const mockWebhooks = [
  { id: '1', url: 'https://api.example.com/webhooks/media', events: ['content.created', 'content.updated'], status: 'active', lastTriggered: '2024-01-16 14:30' },
  { id: '2', url: 'https://billing.example.com/hooks', events: ['subscription.created', 'payment.completed'], status: 'active', lastTriggered: '2024-01-16 12:15' },
];

const sdks = [
  { name: 'JavaScript SDK', version: '2.3.1', downloads: '45.2K', icon: '📦' },
  { name: 'React SDK', version: '2.1.0', downloads: '32.1K', icon: '⚛️' },
  { name: 'iOS SDK', version: '1.8.2', downloads: '12.4K', icon: '🍎' },
  { name: 'Android SDK', version: '1.7.5', downloads: '15.8K', icon: '🤖' },
  { name: 'Python SDK', version: '1.5.0', downloads: '8.9K', icon: '🐍' },
];

const stats = [
  { label: 'API Requests (30d)', value: '2.4M', change: '+18%' },
  { label: 'Active Integrations', value: '156', change: '+12%' },
  { label: 'Webhook Deliveries', value: '98.5%', change: '+0.5%' },
  { label: 'Avg Response Time', value: '45ms', change: '-5ms' },
];

export default function DeveloperPlatform() {
  const [showKey, setShowKey] = useState<string | null>(null);

  return (
    <AdminLayout
      title="Developer Platform"
      description="REST & GraphQL APIs, SDKs, webhooks, and integrations"
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

        <Tabs defaultValue="api-keys" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="sdks">SDKs</TabsTrigger>
            <TabsTrigger value="docs">API Docs</TabsTrigger>
            <TabsTrigger value="playground">Playground</TabsTrigger>
          </TabsList>

          {/* API Keys */}
          <TabsContent value="api-keys" className="space-y-4">
            <div className="flex justify-end">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </div>

            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">API Keys</CardTitle>
                <CardDescription>Manage your API keys for authentication</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockApiKeys.map((apiKey) => (
                      <TableRow key={apiKey.id}>
                        <TableCell className="font-medium">{apiKey.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-secondary/50 px-2 py-1 rounded">
                              {showKey === apiKey.id ? apiKey.key.replace(/\*/g, 'x') : apiKey.key}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                            >
                              {showKey === apiKey.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={apiKey.type === 'secret' ? 'destructive' : 'secondary'}>
                            {apiKey.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{apiKey.created}</TableCell>
                        <TableCell className="text-muted-foreground">{apiKey.lastUsed}</TableCell>
                        <TableCell>{apiKey.requests}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Rotate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex justify-end">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </div>

            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Webhook Endpoints</CardTitle>
                <CardDescription>Receive real-time notifications for events</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Triggered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockWebhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell>
                          <code className="text-xs">{webhook.url}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={webhook.status === 'active' ? 'default' : 'secondary'}>
                            {webhook.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{webhook.lastTriggered}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SDKs */}
          <TabsContent value="sdks">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sdks.map((sdk) => (
                <Card key={sdk.name} className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{sdk.icon}</span>
                        <div>
                          <h4 className="font-medium">{sdk.name}</h4>
                          <p className="text-xs text-muted-foreground">v{sdk.version}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{sdk.downloads} downloads</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <FileCode className="h-4 w-4 mr-2" />
                        Docs
                      </Button>
                      <Button size="sm" className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Install
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* API Docs */}
          <TabsContent value="docs">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center">
                <Code2 className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
                <h3 className="text-lg font-medium mb-2">API Documentation</h3>
                <p className="text-muted-foreground mb-4">
                  Explore our REST and GraphQL APIs with interactive documentation
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    REST API Docs
                  </Button>
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    GraphQL Explorer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Playground */}
          <TabsContent value="playground">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>API Playground coming soon</p>
                <p className="text-sm mt-2">Test API endpoints directly in the browser</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
