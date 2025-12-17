import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Palette, Globe, Mail, Upload, Eye, Save,
  Smartphone, Monitor, Image, Type, Layout
} from 'lucide-react';

export default function WhiteLabel() {
  const [branding, setBranding] = useState({
    platformName: 'AGE Media',
    tagline: 'Stream Without Limits',
    primaryColor: '#8b5cf6',
    secondaryColor: '#06b6d4',
    accentColor: '#f97316',
    backgroundColor: '#0a0a0a',
    fontFamily: 'Inter',
    customDomain: 'stream.agemedia.com',
    supportEmail: 'support@agemedia.com',
    logoUrl: '',
    faviconUrl: '',
  });

  const colorPresets = [
    { name: 'Purple Dream', primary: '#8b5cf6', secondary: '#06b6d4', accent: '#f97316' },
    { name: 'Ocean Blue', primary: '#3b82f6', secondary: '#14b8a6', accent: '#f59e0b' },
    { name: 'Sunset', primary: '#f97316', secondary: '#ec4899', accent: '#8b5cf6' },
    { name: 'Forest', primary: '#22c55e', secondary: '#14b8a6', accent: '#f59e0b' },
    { name: 'Midnight', primary: '#6366f1', secondary: '#8b5cf6', accent: '#ec4899' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">White-Label Settings</h1>
            <p className="text-muted-foreground">Customize your platform's branding and appearance</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </Button>
            <Button className="gap-2 bg-gradient-primary">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>

        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="gap-2">
              <Layout className="w-4 h-4" />
              <span className="hidden sm:inline">Colors</span>
            </TabsTrigger>
            <TabsTrigger value="domain" className="gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Domain</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="apps" className="gap-2">
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Apps</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Platform Identity</CardTitle>
                  <CardDescription>Basic information about your platform</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Platform Name</Label>
                    <Input
                      value={branding.platformName}
                      onChange={(e) => setBranding({ ...branding, platformName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input
                      value={branding.tagline}
                      onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <select 
                      className="w-full p-2 rounded-lg border border-border bg-background"
                      value={branding.fontFamily}
                      onChange={(e) => setBranding({ ...branding, fontFamily: e.target.value })}
                    >
                      <option value="Inter">Inter</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Montserrat">Montserrat</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Logo & Favicon */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Logo & Favicon</CardTitle>
                  <CardDescription>Upload your brand assets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Drop your logo here or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, SVG • Max 2MB • Recommended: 200x60px
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Image className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Upload favicon (32x32px)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Preview */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>See how your branding looks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl overflow-hidden border border-border">
                  <div 
                    className="h-16 flex items-center px-6 gap-4"
                    style={{ backgroundColor: branding.backgroundColor }}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
                    >
                      <Monitor className="w-5 h-5 text-white" />
                    </div>
                    <span 
                      className="text-xl font-bold"
                      style={{ color: branding.primaryColor }}
                    >
                      {branding.platformName}
                    </span>
                  </div>
                  <div className="p-6 bg-gradient-to-b from-muted/50 to-background">
                    <p className="text-lg font-medium mb-2">{branding.tagline}</p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        style={{ backgroundColor: branding.primaryColor }}
                      >
                        Get Started
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        style={{ borderColor: branding.secondaryColor, color: branding.secondaryColor }}
                      >
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colors" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Color Picker */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Brand Colors</CardTitle>
                  <CardDescription>Define your platform's color scheme</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        className="w-12 h-10 rounded-lg cursor-pointer"
                      />
                      <Input
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                        className="w-12 h-10 rounded-lg cursor-pointer"
                      />
                      <Input
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={branding.accentColor}
                        onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                        className="w-12 h-10 rounded-lg cursor-pointer"
                      />
                      <Input
                        value={branding.accentColor}
                        onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Color Presets */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Color Presets</CardTitle>
                  <CardDescription>Quick-apply pre-made color schemes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => setBranding({
                          ...branding,
                          primaryColor: preset.primary,
                          secondaryColor: preset.secondary,
                          accentColor: preset.accent,
                        })}
                        className="flex items-center gap-4 p-3 rounded-xl border border-border hover:border-primary/50 transition-all text-left"
                      >
                        <div className="flex -space-x-1">
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-background"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-background"
                            style={{ backgroundColor: preset.secondary }}
                          />
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-background"
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                        <span className="font-medium">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="domain" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Custom Domain</CardTitle>
                <CardDescription>Configure your own domain for the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Primary Domain</Label>
                  <Input
                    value={branding.customDomain}
                    onChange={(e) => setBranding({ ...branding, customDomain: e.target.value })}
                    placeholder="stream.yourdomain.com"
                  />
                  <p className="text-sm text-muted-foreground">
                    Add a CNAME record pointing to platform.agemedia.com
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <h4 className="font-medium mb-2">DNS Configuration</h4>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between p-2 rounded bg-background">
                      <span className="text-muted-foreground">Type:</span>
                      <span>CNAME</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-background">
                      <span className="text-muted-foreground">Name:</span>
                      <span>stream</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-background">
                      <span className="text-muted-foreground">Value:</span>
                      <span>platform.agemedia.com</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SSL Certificate</Label>
                    <p className="text-sm text-muted-foreground">Auto-provision Let's Encrypt SSL</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>Customize email communications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    value={branding.supportEmail}
                    onChange={(e) => setBranding({ ...branding, supportEmail: e.target.value })}
                    placeholder="noreply@yourdomain.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Footer</Label>
                  <Textarea
                    placeholder="Custom footer text for all emails..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {['Welcome Email', 'Password Reset', 'Ticket Confirmation', 'Subscription'].map((template) => (
                    <Button key={template} variant="outline" className="justify-start gap-2">
                      <Mail className="w-4 h-4" />
                      {template}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apps" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Smartphone className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <CardTitle>iOS App</CardTitle>
                      <CardDescription>App Store configuration</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>App Name</Label>
                    <Input placeholder="Your App Name" />
                  </div>
                  <div className="space-y-2">
                    <Label>App Icon</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50">
                      <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-sm text-muted-foreground">1024x1024px PNG</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">Configure iOS</Button>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Smartphone className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <CardTitle>Android App</CardTitle>
                      <CardDescription>Play Store configuration</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>App Name</Label>
                    <Input placeholder="Your App Name" />
                  </div>
                  <div className="space-y-2">
                    <Label>App Icon</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50">
                      <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-sm text-muted-foreground">512x512px PNG</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">Configure Android</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
