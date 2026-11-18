import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Palette, Globe, Mail, Upload, Eye, Save,
  Smartphone, Monitor, Image, Loader2
} from 'lucide-react';

export default function WhiteLabel() {
  const [branding, setBranding] = useState({
    platformName: '',
    tagline: '',
    primaryColor: '#ed1c18',
    secondaryColor: '#171717',
    accentColor: '#ffffff',
    backgroundColor: '#080808',
    fontFamily: 'Inter',
    customDomain: '',
    supportEmail: '',
    logoUrl: '/brand/degametv.svg',
    faviconUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .eq('setting_key', 'branding')
        .maybeSingle();
      
      if (data?.setting_value && typeof data.setting_value === 'object') {
        const val = data.setting_value as Record<string, any>;
        setBranding(prev => ({
          ...prev,
          platformName: val.platformName || prev.platformName,
          tagline: val.tagline || prev.tagline,
          primaryColor: val.primaryColor || prev.primaryColor,
          secondaryColor: val.secondaryColor || prev.secondaryColor,
          accentColor: val.accentColor || prev.accentColor,
          backgroundColor: val.backgroundColor || prev.backgroundColor,
          fontFamily: val.fontFamily || prev.fontFamily,
          customDomain: val.customDomain || prev.customDomain,
          supportEmail: val.supportEmail || prev.supportEmail,
          logoUrl: val.logoUrl || prev.logoUrl,
          faviconUrl: val.faviconUrl || prev.faviconUrl,
        }));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // Upsert into platform_settings
    const { data: existing } = await supabase
      .from('platform_settings')
      .select('id')
      .eq('setting_key', 'branding')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('platform_settings')
        .update({ setting_value: branding as any })
        .eq('id', existing.id);
      if (error) toast.error('Save failed: ' + error.message);
      else toast.success('Branding saved');
    } else {
      const { error } = await supabase
        .from('platform_settings')
        .insert({ setting_key: 'branding', setting_value: branding as any, is_public: true });
      if (error) toast.error('Save failed: ' + error.message);
      else toast.success('Branding saved');
    }
    setSaving(false);
  };

  const colorPresets = [
    { name: 'DeGame', primary: '#ed1c18', secondary: '#171717', accent: '#ffffff' },
    { name: 'Monochrome', primary: '#ed1c18', secondary: '#171717', accent: '#f5f5f5' },
  ];

  if (loading) {
    return (
      <AdminLayout title="White-Label Settings">
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="White-Label Settings" description="Customize your platform's branding and appearance">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div />
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </div>

        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Colors</span>
            </TabsTrigger>
            <TabsTrigger value="domain" className="gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Domain</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Platform Identity</CardTitle>
                  <CardDescription>Basic information about your platform</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Platform Name</Label>
                    <Input value={branding.platformName} onChange={e => setBranding({ ...branding, platformName: e.target.value })} placeholder="My Platform" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input value={branding.tagline} onChange={e => setBranding({ ...branding, tagline: e.target.value })} placeholder="Stream Without Limits" />
                  </div>
                  <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input type="email" value={branding.supportEmail} onChange={e => setBranding({ ...branding, supportEmail: e.target.value })} placeholder="support@yourdomain.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <select className="w-full p-2 rounded-lg border border-border bg-background" value={branding.fontFamily} onChange={e => setBranding({ ...branding, fontFamily: e.target.value })}>
                      <option value="Inter">Inter</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Montserrat">Montserrat</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Logo & Favicon</CardTitle>
                  <CardDescription>Upload your brand assets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input value={branding.logoUrl} onChange={e => setBranding({ ...branding, logoUrl: e.target.value })} placeholder="https://..." />
                    {branding.logoUrl && <img src={branding.logoUrl} alt="Logo" className="h-10 mt-2" />}
                  </div>
                  <div className="space-y-2">
                    <Label>Favicon URL</Label>
                    <Input value={branding.faviconUrl} onChange={e => setBranding({ ...branding, faviconUrl: e.target.value })} placeholder="https://..." />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Preview */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl overflow-hidden border border-border">
                  <div className="h-16 flex items-center px-6 gap-4" style={{ backgroundColor: branding.backgroundColor }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}>
                      <Monitor className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold" style={{ color: branding.primaryColor }}>
                      {branding.platformName || 'Platform'}
                    </span>
                  </div>
                  <div className="p-6 bg-gradient-to-b from-muted/50 to-background">
                    <p className="text-lg font-medium mb-2">{branding.tagline || 'Your tagline here'}</p>
                    <div className="flex gap-2">
                      <Button size="sm" style={{ backgroundColor: branding.primaryColor }}>Get Started</Button>
                      <Button size="sm" variant="outline" style={{ borderColor: branding.secondaryColor, color: branding.secondaryColor }}>Learn More</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colors" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Brand Colors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Primary', key: 'primaryColor' as const },
                    { label: 'Secondary', key: 'secondaryColor' as const },
                    { label: 'Accent', key: 'accentColor' as const },
                  ].map(({ label, key }) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={branding[key]} onChange={e => setBranding({ ...branding, [key]: e.target.value })} className="w-12 h-10 rounded-lg cursor-pointer" />
                        <Input value={branding[key]} onChange={e => setBranding({ ...branding, [key]: e.target.value })} className="flex-1" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Color Presets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    {colorPresets.map(preset => (
                      <button key={preset.name} onClick={() => setBranding({ ...branding, primaryColor: preset.primary, secondaryColor: preset.secondary, accentColor: preset.accent })}
                        className="flex items-center gap-4 p-3 rounded-xl border border-border hover:border-primary/50 transition-all text-left">
                        <div className="flex -space-x-1">
                          {[preset.primary, preset.secondary, preset.accent].map((c, i) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-background" style={{ backgroundColor: c }} />
                          ))}
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
                  <Input value={branding.customDomain} onChange={e => setBranding({ ...branding, customDomain: e.target.value })} placeholder="stream.yourdomain.com" />
                  <p className="text-sm text-muted-foreground">Add a CNAME record pointing to your deployment URL</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SSL Certificate</Label>
                    <p className="text-sm text-muted-foreground">Auto-provision SSL</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
