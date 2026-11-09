import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Copy, Eye, EyeOff, Save, TestTube, Zap, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenant } from '@/hooks/useTenant';

interface GatewayRow {
  id: string;
  gateway_name: string;
  is_enabled: boolean;
  is_live: boolean;
  test_public_key: string | null;
  test_secret_key: string | null;
  live_public_key: string | null;
  live_secret_key: string | null;
  webhook_secret: string | null;
}

const GATEWAY_ICONS: Record<string, string> = { stripe: '💳', paystack: '🔗', flutterwave: '⚡' };
const GATEWAY_NAMES = ['stripe', 'paystack', 'flutterwave'];

export default function PaymentGatewaySettings() {
  const [gateways, setGateways] = useState<GatewayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [editKeys, setEditKeys] = useState<Record<string, { test_public_key: string; test_secret_key: string; live_public_key: string; live_secret_key: string }>>({});
  const { tenant } = useTenant();

  useEffect(() => {
    const fetchGateways = async () => {
      setLoading(true);
      const { data } = await supabase.from('payment_gateways')
        .select('id,gateway_name,is_enabled,is_live,test_public_key,live_public_key');
      if (data && data.length > 0) {
        setGateways(data as GatewayRow[]);
      } else {
        // Initialize default gateways if none exist
        setGateways(GATEWAY_NAMES.map(name => ({
          id: '', gateway_name: name, is_enabled: false, is_live: false,
          test_public_key: null, test_secret_key: null, live_public_key: null, live_secret_key: null, webhook_secret: null,
        })));
      }
      setLoading(false);
    };
    fetchGateways();
  }, []);

  const currentGateway = gateways.find(g => g.gateway_name === selectedGateway);

  const saveGateway = async (gw: GatewayRow, updates: Partial<GatewayRow>) => {
    setSaving(true);
    const tenantId = tenant?.id !== 'default' ? tenant?.id : '00000000-0000-0000-0000-000000000000';
    
    if (gw.id) {
      const { error } = await supabase.from('payment_gateways').update(updates).eq('id', gw.id);
      if (error) { toast.error('Save failed: ' + error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('payment_gateways')
        .insert({ gateway_name: gw.gateway_name, tenant_id: tenantId, ...updates })
        .select('id').single();
      if (error) { toast.error('Save failed: ' + error.message); setSaving(false); return; }
      gw.id = data.id;
    }

    setGateways(prev => prev.map(g => g.gateway_name === gw.gateway_name ? { ...g, ...updates, id: gw.id } : g));
    toast.success('Settings saved');
    setSaving(false);
  };

  const toggleEnabled = (gw: GatewayRow) => saveGateway(gw, { is_enabled: !gw.is_enabled });

  const saveKeys = (gw: GatewayRow) => {
    void gw;
    toast.error('Secure provider-key setup is not connected. No key was saved.');
  };

  const switchMode = (gw: GatewayRow, goLive: boolean) => saveGateway(gw, { is_live: goLive });

  if (loading) {
    return (
      <AdminLayout title="Payment Gateway Settings" description="Configure payment processors">
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Payment Gateway Settings" description="Configure and manage payment processors">
      <div className="space-y-6">
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <TestTube className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            Provider credentials are not handled in this browser. Payment processing remains unavailable until secure server-side credentials and verified payment callbacks are configured.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="overview">All Gateways</TabsTrigger>
            <TabsTrigger value="configure">Configure</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gateways.map(gw => (
                <Card key={gw.gateway_name} className={`bg-card/50 border-border/50 cursor-pointer transition hover:border-primary/50 ${selectedGateway === gw.gateway_name ? 'border-primary ring-2 ring-primary/20' : ''}`}
                  onClick={() => setSelectedGateway(gw.gateway_name)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{GATEWAY_ICONS[gw.gateway_name] || '💳'}</span>
                        <div>
                          <h3 className="font-bold capitalize">{gw.gateway_name}</h3>
                          <p className="text-xs text-muted-foreground">Payment Processor</p>
                        </div>
                      </div>
                      <Switch checked={gw.is_enabled} onCheckedChange={() => toggleEnabled(gw)} />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Mode:</span>
                        <Badge variant={gw.is_live ? 'destructive' : 'secondary'}>{gw.is_live ? 'LIVE' : 'TEST'}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={gw.is_enabled ? 'default' : 'secondary'}>{gw.is_enabled ? 'Enabled' : 'Disabled'}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="configure" className="space-y-6">
            {currentGateway ? (
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-3xl">{GATEWAY_ICONS[currentGateway.gateway_name] || '💳'}</span>
                    <span className="capitalize">{currentGateway.gateway_name}</span> Configuration
                  </CardTitle>
                  <CardDescription>{currentGateway.is_live ? 'Live mode - Real transactions' : 'Test mode - No real charges'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Test Keys */}
                  <div className="space-y-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <h3 className="font-bold flex items-center gap-2"><TestTube className="w-4 h-4" /> Test Keys</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Test Public Key</Label>
                        <Input
                          value={editKeys[currentGateway.gateway_name]?.test_public_key ?? currentGateway.test_public_key ?? ''}
                          onChange={e => setEditKeys(prev => ({ ...prev, [currentGateway.gateway_name]: { ...(prev[currentGateway.gateway_name] || { test_public_key: '', test_secret_key: '', live_public_key: '', live_secret_key: '' }), test_public_key: e.target.value } }))}
                          placeholder="pk_test_..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Test Secret Key</Label>
                        <Input
                          type={showSecrets[`${currentGateway.gateway_name}_test`] ? 'text' : 'password'}
                          value=""
                          disabled
                          onChange={e => setEditKeys(prev => ({ ...prev, [currentGateway.gateway_name]: { ...(prev[currentGateway.gateway_name] || { test_public_key: '', test_secret_key: '', live_public_key: '', live_secret_key: '' }), test_secret_key: e.target.value } }))}
                          placeholder="sk_test_..."
                        />
                        <Button variant="ghost" size="sm" onClick={() => setShowSecrets(prev => ({ ...prev, [`${currentGateway.gateway_name}_test`]: !prev[`${currentGateway.gateway_name}_test`] }))}>
                          {showSecrets[`${currentGateway.gateway_name}_test`] ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                          {showSecrets[`${currentGateway.gateway_name}_test`] ? 'Hide' : 'Show'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Live Keys */}
                  <div className="space-y-4 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <h3 className="font-bold flex items-center gap-2"><Zap className="w-4 h-4" /> Live Keys</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Live Public Key</Label>
                        <Input
                          value={editKeys[currentGateway.gateway_name]?.live_public_key ?? currentGateway.live_public_key ?? ''}
                          onChange={e => setEditKeys(prev => ({ ...prev, [currentGateway.gateway_name]: { ...(prev[currentGateway.gateway_name] || { test_public_key: '', test_secret_key: '', live_public_key: '', live_secret_key: '' }), live_public_key: e.target.value } }))}
                          placeholder="pk_live_..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Live Secret Key</Label>
                        <Input
                          type={showSecrets[`${currentGateway.gateway_name}_live`] ? 'text' : 'password'}
                          value=""
                          disabled
                          onChange={e => setEditKeys(prev => ({ ...prev, [currentGateway.gateway_name]: { ...(prev[currentGateway.gateway_name] || { test_public_key: '', test_secret_key: '', live_public_key: '', live_secret_key: '' }), live_secret_key: e.target.value } }))}
                          placeholder="sk_live_..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={() => saveKeys(currentGateway)} disabled className="flex-1">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Keys
                    </Button>
                    <Button variant={currentGateway.is_live ? 'outline' : 'destructive'} onClick={() => switchMode(currentGateway, !currentGateway.is_live)} className="flex-1" disabled>
                      Live mode unavailable
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/50"><CardContent className="p-12 text-center"><p className="text-muted-foreground">Select a gateway from the overview tab</p></CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
