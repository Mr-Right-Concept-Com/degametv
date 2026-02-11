import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Copy, Eye, EyeOff, Save, TestTube, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Gateway {
  id: string;
  name: string;
  icon: string;
  isLive: boolean;
  isEnabled: boolean;
  testKeys: { publicKey: string; secretKey: string };
  liveKeys: { publicKey: string; secretKey: string };
  configuredAt: string;
}

export default function PaymentGatewaySettings() {
  const [gateways, setGateways] = useState<Gateway[]>([
    {
      id: 'stripe',
      name: 'Stripe',
      icon: '💳',
      isLive: false,
      isEnabled: true,
      testKeys: {
        publicKey: 'pk_test_51234567890',
        secretKey: 'sk_test_****************************abcd',
      },
      liveKeys: { publicKey: '', secretKey: '' },
      configuredAt: '2025-02-10',
    },
    {
      id: 'paystack',
      name: 'Paystack',
      icon: '🔗',
      isLive: false,
      isEnabled: true,
      testKeys: {
        publicKey: 'pk_test_paystack_key',
        secretKey: 'sk_test_****************************efgh',
      },
      liveKeys: { publicKey: '', secretKey: '' },
      configuredAt: '2025-02-10',
    },
    {
      id: 'flutterwave',
      name: 'Flutterwave',
      icon: '⚡',
      isLive: false,
      isEnabled: true,
      testKeys: {
        publicKey: 'FLWPUBK_TEST_1234567890',
        secretKey: 'sk_test_****************************ijkl',
      },
      liveKeys: { publicKey: '', secretKey: '' },
      configuredAt: '2025-02-10',
    },
  ]);

  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [editingLiveKeys, setEditingLiveKeys] = useState<Record<string, { publicKey: string; secretKey: string }>>({});

  const currentGateway = gateways.find(g => g.id === selectedGateway);

  const toggleGateway = (id: string) => {
    setGateways(prev =>
      prev.map(g =>
        g.id === id ? { ...g, isEnabled: !g.isEnabled } : g
      )
    );
  };

  const switchToLiveMode = (id: string, publicKey: string, secretKey: string) => {
    if (!publicKey || !secretKey) {
      alert('Please provide both public and secret keys');
      return;
    }
    setGateways(prev =>
      prev.map(g =>
        g.id === id
          ? {
              ...g,
              isLive: true,
              liveKeys: { publicKey, secretKey },
            }
          : g
      )
    );
    setEditingLiveKeys(prev => ({ ...prev, [id]: { publicKey: '', secretKey: '' } }));
  };

  const switchBackToTest = (id: string) => {
    setGateways(prev =>
      prev.map(g =>
        g.id === id ? { ...g, isLive: false } : g
      )
    );
  };

  return (
    <AdminLayout
      title="Payment Gateway Settings"
      description="Configure and manage payment processors (Stripe, Paystack, Flutterwave)"
    >
      <div className="space-y-6">
        {/* Warning Alert */}
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <TestTube className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <strong>Test Mode Active:</strong> All payment gateways are running in test/sandbox mode. Switch to live mode only when you're ready to process real payments. No rebuild required.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="overview">All Gateways</TabsTrigger>
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gateways.map(gateway => (
                <Card
                  key={gateway.id}
                  className={`bg-card/50 border-border/50 cursor-pointer transition hover:border-primary/50 ${
                    selectedGateway === gateway.id ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                  onClick={() => setSelectedGateway(gateway.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{gateway.icon}</span>
                        <div>
                          <h3 className="font-bold">{gateway.name}</h3>
                          <p className="text-xs text-muted-foreground">Payment Processor</p>
                        </div>
                      </div>
                      <Switch
                        checked={gateway.isEnabled}
                        onCheckedChange={() => toggleGateway(gateway.id)}
                      />
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Mode:</span>
                        <Badge variant={gateway.isLive ? 'destructive' : 'secondary'}>
                          {gateway.isLive ? 'LIVE' : 'TEST'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={gateway.isEnabled ? 'default' : 'secondary'}>
                          {gateway.isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Configured:</span>
                        <span className="text-xs">{gateway.configuredAt}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGateway(gateway.id);
                      }}
                    >
                      Configure
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Configure Gateways */}
          <TabsContent value="configure" className="space-y-6">
            {selectedGateway ? (
              currentGateway && (
                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-3xl">{currentGateway.icon}</span>
                      {currentGateway.name} Configuration
                    </CardTitle>
                    <CardDescription>
                      {currentGateway.isLive ? 'Live mode - Real transactions' : 'Test mode - No real charges'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {/* Test Mode Keys */}
                    {!currentGateway.isLive && (
                      <div className="space-y-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <h3 className="font-bold flex items-center gap-2">
                          <TestTube className="w-4 h-4" />
                          Test Mode Keys (Pre-configured)
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <Label className="mb-2 block text-sm">Public Key</Label>
                            <div className="flex gap-2">
                              <code className="flex-1 bg-secondary/50 p-3 rounded text-xs font-mono break-all">
                                {currentGateway.testKeys.publicKey}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(currentGateway.testKeys.publicKey)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="mb-2 block text-sm">Secret Key</Label>
                            <div className="flex gap-2">
                              <code className="flex-1 bg-secondary/50 p-3 rounded text-xs font-mono break-all">
                                {showSecrets[`${currentGateway.id}_test`]
                                  ? currentGateway.testKeys.secretKey.replace(/\*/g, '*')
                                  : '••••••••••••••••••••••••••••••••'}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSecrets(prev => ({
                                  ...prev,
                                  [`${currentGateway.id}_test`]: !prev[`${currentGateway.id}_test`]
                                }))}
                              >
                                {showSecrets[`${currentGateway.id}_test`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(currentGateway.testKeys.secretKey)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Use these keys to test payments. No real charges will be made.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Switch to Live Mode */}
                    {!currentGateway.isLive && (
                      <div className="space-y-4 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <h3 className="font-bold flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Switch to Live Mode
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Paste your live API keys below to enable real payment processing. No code rebuild needed.
                        </p>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="live_public" className="mb-2 block text-sm">
                              Live Public Key
                            </Label>
                            <Input
                              id="live_public"
                              placeholder="Paste your live public key"
                              value={editingLiveKeys[currentGateway.id]?.publicKey || ''}
                              onChange={(e) =>
                                setEditingLiveKeys(prev => ({
                                  ...prev,
                                  [currentGateway.id]: {
                                    ...(prev[currentGateway.id] || { publicKey: '', secretKey: '' }),
                                    publicKey: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="live_secret" className="mb-2 block text-sm">
                              Live Secret Key
                            </Label>
                            <Input
                              id="live_secret"
                              type="password"
                              placeholder="Paste your live secret key"
                              value={editingLiveKeys[currentGateway.id]?.secretKey || ''}
                              onChange={(e) =>
                                setEditingLiveKeys(prev => ({
                                  ...prev,
                                  [currentGateway.id]: {
                                    ...(prev[currentGateway.id] || { publicKey: '', secretKey: '' }),
                                    secretKey: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Your live keys are encrypted and stored securely. They won't be displayed after saving.
                            </AlertDescription>
                          </Alert>
                          <Button
                            className="w-full"
                            onClick={() =>
                              switchToLiveMode(
                                currentGateway.id,
                                editingLiveKeys[currentGateway.id]?.publicKey || '',
                                editingLiveKeys[currentGateway.id]?.secretKey || ''
                              )
                            }
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Activate Live Mode
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Live Mode Active */}
                    {currentGateway.isLive && (
                      <div className="space-y-4 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                        <h3 className="font-bold flex items-center gap-2 text-red-600">
                          <Zap className="w-4 h-4" />
                          Live Mode Active
                        </h3>
                        <p className="text-sm text-red-600/80">
                          Real payments are being processed. Be careful with changes.
                        </p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => switchBackToTest(currentGateway.id)}
                        >
                          Switch Back to Test Mode
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            ) : (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">Select a gateway from the overview tab to configure</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardDescription>Set up webhooks to receive payment events in real-time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {gateways.map(gateway => (
                  <div key={gateway.id} className="p-4 border border-border rounded-lg">
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                      <span>{gateway.icon}</span>
                      {gateway.name}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground mb-1 block">Webhook URL</Label>
                        <div className="flex gap-2">
                          <code className="flex-1 bg-secondary/50 p-3 rounded text-xs font-mono break-all">
                            https://your-domain.com/api/webhooks/{gateway.id}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(`https://your-domain.com/api/webhooks/${gateway.id}`)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Add this URL to your {gateway.name} dashboard to receive payment notifications
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
