import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabletSmartphone, Apple, SmartphoneNfc, Monitor, Globe, Download, Upload, Settings, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const platforms = [
  {
    id: 'ios',
    name: 'iOS App',
    icon: Apple,
    status: 'ready',
    version: '2.1.0',
    lastBuild: '2024-01-15',
    description: 'Native iOS app for iPhone and iPad',
    features: ['Push Notifications', 'Offline Mode', 'Deep Linking', 'Biometric Auth']
  },
  {
    id: 'android',
    name: 'Android App',
    icon: SmartphoneNfc,
    status: 'building',
    version: '2.0.9',
    lastBuild: '2024-01-14',
    buildProgress: 67,
    description: 'Native Android app for phones and tablets',
    features: ['Push Notifications', 'Offline Mode', 'Deep Linking', 'Picture-in-Picture']
  },
  {
    id: 'desktop',
    name: 'Desktop App',
    icon: Monitor,
    status: 'ready',
    version: '1.5.0',
    lastBuild: '2024-01-10',
    description: 'Desktop app for Windows, macOS, and Linux',
    features: ['Offline Mode', 'System Tray', 'Keyboard Shortcuts', 'Multi-window']
  },
  {
    id: 'pwa',
    name: 'PWA',
    icon: Globe,
    status: 'ready',
    version: '2.1.0',
    lastBuild: '2024-01-15',
    description: 'Progressive Web App - installable from browser',
    features: ['Offline Mode', 'Push Notifications', 'Install Prompt', 'Home Screen Icon']
  }
];

const deploymentHistory = [
  { platform: 'iOS', version: '2.1.0', status: 'live', deployedAt: '2024-01-15 14:30', deployedBy: 'System' },
  { platform: 'Android', version: '2.0.9', status: 'review', deployedAt: '2024-01-14 10:00', deployedBy: 'Admin' },
  { platform: 'Desktop', version: '1.5.0', status: 'live', deployedAt: '2024-01-10 16:45', deployedBy: 'System' },
];

export default function AppManagement() {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
      case 'live':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'building':
      case 'review':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      ready: 'default',
      live: 'default',
      building: 'secondary',
      review: 'secondary',
      failed: 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <AdminLayout
      title="App Add-On / Hybrid Deployment"
      description="Deploy to iOS, Android, Desktop, and PWA with managed services"
    >
      <div className="space-y-6">
        <Tabs defaultValue="platforms" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="builds">Build History</TabsTrigger>
            <TabsTrigger value="store">Store Listings</TabsTrigger>
            <TabsTrigger value="settings">App Settings</TabsTrigger>
          </TabsList>

          {/* Platforms */}
          <TabsContent value="platforms" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {platforms.map((platform) => (
                <Card key={platform.id} className="bg-card/50 border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <platform.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{platform.name}</CardTitle>
                          <CardDescription>v{platform.version}</CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(platform.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{platform.description}</p>
                    
                    {platform.buildProgress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Building...</span>
                          <span>{platform.buildProgress}%</span>
                        </div>
                        <Progress value={platform.buildProgress} className="h-2" />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {platform.features.map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Last build: {platform.lastBuild}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button size="sm" className="flex-1" disabled={platform.status === 'building'}>
                        <Upload className="h-4 w-4 mr-2" />
                        {platform.status === 'building' ? 'Building...' : 'Build & Deploy'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Build History */}
          <TabsContent value="builds">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Deployment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deploymentHistory.map((deploy, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(deploy.status)}
                        <div>
                          <p className="font-medium">{deploy.platform} v{deploy.version}</p>
                          <p className="text-sm text-muted-foreground">
                            Deployed by {deploy.deployedBy} • {deploy.deployedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(deploy.status)}
                        <Button variant="ghost" size="sm">View Logs</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Store Listings */}
          <TabsContent value="store">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <TabletSmartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Store listing management coming soon</p>
                <p className="text-sm mt-2">Manage App Store and Play Store listings with screenshots, descriptions, and metadata</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">App Branding</CardTitle>
                  <CardDescription>Customize app icons, splash screens, and theme</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Branding
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Push Notifications</CardTitle>
                  <CardDescription>Configure push notification settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Notifications
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Deep Linking</CardTitle>
                  <CardDescription>Set up universal links and app links</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Deep Links
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Analytics SDK</CardTitle>
                  <CardDescription>Configure app analytics and crash reporting</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
