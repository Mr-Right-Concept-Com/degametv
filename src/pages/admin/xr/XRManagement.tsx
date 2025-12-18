import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Glasses, Video, Gamepad2, Headphones, Globe, Sparkles, ArrowRight } from 'lucide-react';

const xrFeatures = [
  {
    id: 'vr-cinema',
    name: 'VR Cinemas',
    description: 'Immersive movie watching experiences in virtual reality environments',
    status: 'coming-soon',
    icon: Glasses,
    features: ['Virtual theaters', 'Social viewing', 'Custom environments', 'Spatial audio']
  },
  {
    id: '360-video',
    name: '360° Video',
    description: 'Spherical video content with interactive viewing',
    status: 'beta',
    icon: Video,
    features: ['VR headset support', 'Web player', 'Mobile gyroscope', 'Hotspot interactions']
  },
  {
    id: 'interactive',
    name: 'Interactive Storytelling',
    description: 'Choose-your-own-adventure and branching narratives',
    status: 'coming-soon',
    icon: Gamepad2,
    features: ['Branching paths', 'User choices', 'Multiple endings', 'Analytics']
  },
  {
    id: 'spatial-audio',
    name: 'Spatial Audio',
    description: '3D audio experiences for immersive content',
    status: 'beta',
    icon: Headphones,
    features: ['Binaural audio', 'Ambisonics', 'Head tracking', 'Room simulation']
  },
  {
    id: 'metaverse',
    name: 'Metaverse Ready',
    description: 'Future-proof integration with emerging platforms',
    status: 'planned',
    icon: Globe,
    features: ['Avatar support', 'Virtual events', 'NFT integration', 'Cross-platform']
  }
];

const stats = [
  { label: 'XR Content Items', value: '23', status: 'beta' },
  { label: '360° Videos', value: '15', status: 'active' },
  { label: 'VR Sessions', value: '1,234', status: 'beta' },
  { label: 'Avg Session Time', value: '18 min', status: 'beta' },
];

export default function XRManagement() {
  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      'active': { variant: 'default', label: 'Active' },
      'beta': { variant: 'secondary', label: 'Beta' },
      'coming-soon': { variant: 'outline', label: 'Coming Soon' },
      'planned': { variant: 'outline', label: 'Planned' }
    };
    const { variant, label } = config[status] || { variant: 'outline', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <AdminLayout
      title="XR / Immersive Media"
      description="AR, VR, 360° video, and next-generation immersive experiences"
    >
      <div className="space-y-6">
        {/* Hero Banner */}
        <Card className="bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 border-border/50">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">The Future of Media</h2>
                <p className="text-muted-foreground">XR features are being developed for the next generation of content experiences</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Button>
                Join Beta Program
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline">Learn More</Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <span className="text-2xl font-bold">{stat.value}</span>
                  </div>
                  {getStatusBadge(stat.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="features" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="content">XR Content</TabsTrigger>
            <TabsTrigger value="devices">Supported Devices</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Features */}
          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {xrFeatures.map((feature) => (
                <Card key={feature.id} className="bg-card/50 border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <feature.icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{feature.name}</CardTitle>
                      </div>
                      {getStatusBadge(feature.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription>{feature.description}</CardDescription>
                    <div className="flex flex-wrap gap-2">
                      {feature.features.map((f) => (
                        <Badge key={f} variant="outline" className="text-xs">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="sm"
                      disabled={feature.status === 'planned' || feature.status === 'coming-soon'}
                    >
                      {feature.status === 'beta' ? 'Configure' : 'Coming Soon'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Content */}
          <TabsContent value="content">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>XR Content Library coming soon</p>
                <p className="text-sm mt-2">Upload and manage 360° videos, VR experiences, and interactive content</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Devices */}
          <TabsContent value="devices">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Supported Devices</CardTitle>
                <CardDescription>XR content will be compatible with major platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Meta Quest 3', 'Apple Vision Pro', 'PSVR 2', 'HTC Vive', 'Pico 4', 'Web Browser', 'iOS/Android', 'Windows MR'].map((device) => (
                    <div key={device} className="p-4 border rounded-lg text-center bg-secondary/20">
                      <p className="text-sm font-medium">{device}</p>
                      <Badge variant="outline" className="mt-2 text-xs">Planned</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Glasses className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>XR Analytics coming soon</p>
                <p className="text-sm mt-2">Track engagement, heatmaps, and user behavior in immersive content</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
