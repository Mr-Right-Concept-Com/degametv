import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { 
  Palette, Globe, Save, Monitor, Loader2
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
  const [domains, setDomains] = useState({ controlDomain: 'degametv.com', releaseDomain: 'degametv.com' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isJsonRecord = (value: Json): value is { [key: string]: Json | undefined } =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [brandingResult, domainResult] = await Promise.all([
        supabase
          .from('platform_settings')
          .select('setting_value')
          .eq('setting_key', 'branding')
          .maybeSingle(),
        supabase
          .from('platform_settings')
          .select('setting_value')
          .eq('setting_key', 'domain_settings')
          .maybeSingle(),
      ]);

      if (brandingResult.error) {
        toast.error('Branding settings could not be loaded: ' + brandingResult.error.message);
      } else if (brandingResult.data && isJsonRecord(brandingResult.data.setting_value)) {
        const value = brandingResult.data.setting_value;
        const textValue = (key: string, fallback: string) =>
          typeof value[key] === 'string' ? value[key] : fallback;
        setBranding(previous => ({
          ...previous,
          platformName: textValue('platformName', previous.platformName),
          tagline: textValue('tagline', previous.tagline),
          primaryColor: textValue('primaryColor', previous.primaryColor),
          secondaryColor: textValue('secondaryColor', previous.secondaryColor),
          accentColor: textValue('accentColor', previous.accentColor),
          backgroundColor: textValue('backgroundColor', previous.backgroundColor),
          fontFamily: textValue('fontFamily', previous.fontFamily),
          customDomain: textValue('customDomain', previous.customDomain),
          supportEmail: textValue('supportEmail', previous.supportEmail),
          logoUrl: textValue('logoUrl', previous.logoUrl),
          faviconUrl: textValue('faviconUrl', previous.faviconUrl),
        }));
      }

      if (domainResult.error) {
        toast.error('Domain settings could not be loaded: ' + domainResult.error.message);
      } else if (domainResult.data && isJsonRecord(domainResult.data.setting_value)) {
        const value = domainResult.data.setting_value;
        setDomains(previous => ({
          controlDomain: typeof value.controlDomain === 'string' ? value.controlDomain : previous.controlDomain,
          releaseDomain: typeof value.releaseDomain === 'string' ? value.releaseDomain : previous.releaseDomain,
        }));
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load white-label settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    const validDomain = (value: string) => /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value.trim());
    if (!validDomain(domains.controlDomain) || !validDomain(domains.releaseDomain)) {
      toast.error('Enter valid domain names without https:// or paths.');
      return;
    }
    setSaving(true);
    setSaving(true);
    try {
      const { error: brandingError } = await supabase.from('platform_settings').upsert({
        setting_key: 'branding',
        setting_value: branding,
        is_public: true,
        description: 'Runtime platform identity, logo and design tokens'
      }, { onConflict: 'setting_key' });
      if (brandingError) {
        toast.error('Branding save failed: ' + brandingError.message);
        return;
      }
      toast.success('Branding saved.');

      const { error: domainError } = await supabase.from('platform_settings').upsert({
        setting_key: 'domain_settings',
        setting_value: domains,
        is_public: true,
        description: 'Canonical control domain and dedicated release subdomain root'
      }, { onConflict: 'setting_key' });
      if (domainError) toast.error('Domain settings could not be saved: ' + domainError.message);
      else toast.success('Domain settings saved.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save white-label settings');
    } finally {
      setSaving(false);
    }
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
                <CardTitle>Platform Domains</CardTitle>
                <CardDescription>Configure the control-plane domain and the root used for dedicated title storefronts. Both can be changed without rebuilding.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Control & Management Domain</Label>
                  <Input value={domains.controlDomain} onChange={e => setDomains({ ...domains, controlDomain: e.target.value.toLowerCase().trim() })} placeholder="degametv.com" />
                  <p className="text-sm text-muted-foreground">Creator studio, administration, commerce and platform management.</p>
                </div>
                <div className="space-y-2">
                  <Label>Dedicated Release Domain Root</Label>
                  <Input value={domains.releaseDomain} onChange={e => setDomains({ ...domains, releaseDomain: e.target.value.toLowerCase().trim() })} placeholder="degametv.com" />
                  <p className="text-sm text-muted-foreground">Each title receives its own hostname, for example title.degametv.com. Configure wildcard DNS and TLS at your hosting provider.</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <Label>SSL Certificate Provisioning</Label>
                  <p className="text-sm text-muted-foreground">
                    Certificate provisioning is managed by the configured domain and SSL provider. This screen does not toggle certificate issuance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
