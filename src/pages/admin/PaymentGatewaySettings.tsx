import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2, Save, ShieldCheck, TestTube, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Provider = 'paystack' | 'flutterwave' | 'stripe';
interface ProviderConfig {
  provider: Provider;
  enabled: boolean;
  live: boolean;
  testPublicKey: string | null;
  livePublicKey: string | null;
  hasTestSecret: boolean;
  hasLiveSecret: boolean;
  hasWebhookSecret: boolean;
  updatedAt: string;
}
interface ProviderDraft {
  testPublicKey: string;
  testSecret: string;
  livePublicKey: string;
  liveSecret: string;
  webhookSecret: string;
}
const providers: Provider[] = ['paystack', 'flutterwave', 'stripe'];
const labels: Record<Provider, string> = { paystack: 'Paystack', flutterwave: 'Flutterwave', stripe: 'Stripe' };
const emptyDraft = (): ProviderDraft => ({ testPublicKey: '', testSecret: '', livePublicKey: '', liveSecret: '', webhookSecret: '' });

export default function PaymentGatewaySettings() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<Provider, ProviderDraft>>({
    paystack: emptyDraft(), flutterwave: emptyDraft(), stripe: emptyDraft(),
  });
  const [selected, setSelected] = useState<Provider>('paystack');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: invokeError } = await supabase.functions.invoke('manage-payment-provider', { method: 'GET' });
    if (invokeError || !data?.providers) {
      setError('Provider settings could not be loaded. Confirm you are signed in as a super administrator.');
      setLoading(false);
      return;
    }
    setConfigs(data.providers as ProviderConfig[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const configFor = (provider: Provider): ProviderConfig | undefined =>
    configs.find(config => config.provider === provider);

  const save = async (provider: Provider, changes: Partial<Pick<ProviderConfig, 'enabled' | 'live'>>) => {
    const config = configFor(provider);
    const draft = drafts[provider];
    const enabled = changes.enabled ?? config?.enabled ?? false;
    const live = changes.live ?? config?.live ?? false;
    setSaving(true);
    setError('');
    const { data, error: invokeError } = await supabase.functions.invoke('manage-payment-provider', {
      body: {
        provider,
        testPublicKey: draft.testPublicKey || undefined,
        testSecret: draft.testSecret || undefined,
        livePublicKey: draft.livePublicKey || undefined,
        liveSecret: draft.liveSecret || undefined,
        webhookSecret: draft.webhookSecret || undefined,
        enabled,
        live,
      },
    });
    setSaving(false);
    if (invokeError || !data?.success) {
      const message = data?.error || invokeError?.message || 'Provider configuration was not saved.';
      setError(message);
      toast.error(message);
      return;
    }
    setDrafts(current => ({ ...current, [provider]: emptyDraft() }));
    toast.success(enabled ? (live ? labels[provider] + ' live mode enabled' : labels[provider] + ' test mode enabled') : labels[provider] + ' disabled');
    await load();
  };

  const selectedConfig = configFor(selected);
  const selectedDraft = drafts[selected];
  const updateDraft = (key: keyof ProviderDraft, value: string) =>
    setDrafts(current => ({ ...current, [selected]: { ...current[selected], [key]: value } }));

  if (loading) return <AdminLayout title="Payment Providers" description="Central provider control and secure credentials"><div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout title="Payment Providers" description="Manage provider credentials, test mode and live checkout centrally">
      <div className="space-y-6">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>Secret credentials are written directly to Supabase Vault. They are never read back into this page or stored in browser state after saving. Live mode is blocked until live keys and a webhook signing secret exist.</AlertDescription>
        </Alert>
        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="grid gap-4 md:grid-cols-3">
          {providers.map(provider => {
            const config = configFor(provider);
            return (
              <Card key={provider} className={selected === provider ? 'border-primary' : 'cursor-pointer'} onClick={() => setSelected(provider)}>
                <CardHeader className="pb-3"><CardTitle>{labels[provider]}</CardTitle><CardDescription>Central payment adapter</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Checkout</span><Badge variant={config?.enabled ? 'default' : 'secondary'}>{config?.enabled ? 'Enabled' : 'Disabled'}</Badge></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Mode</span><Badge variant={config?.live ? 'destructive' : 'outline'}>{config?.live ? 'LIVE' : 'TEST'}</Badge></div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">{config?.hasTestSecret ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <AlertCircle className="h-3.5 w-3.5" />} Test secret {config?.hasTestSecret ? 'stored' : 'missing'}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">{config?.hasLiveSecret ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <AlertCircle className="h-3.5 w-3.5" />} Live secret {config?.hasLiveSecret ? 'stored' : 'missing'}</div>
                  <Button variant={selected === provider ? 'default' : 'outline'} size="sm" className="w-full">Configure</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader><CardTitle>{labels[selected]} configuration</CardTitle><CardDescription>Save credentials to Vault, then enable test checkout. Switch to live only after completing provider webhook setup and verification.</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-4 rounded-lg border p-4">
              <h3 className="flex items-center gap-2 font-semibold"><TestTube className="h-4 w-4" /> Test credentials</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Test public key</Label><Input autoComplete="off" value={selectedDraft.testPublicKey} onChange={e => updateDraft('testPublicKey', e.target.value)} placeholder="Provider test public key" /></div>
                <div className="space-y-2"><Label>Test secret key</Label><Input type="password" autoComplete="new-password" value={selectedDraft.testSecret} onChange={e => updateDraft('testSecret', e.target.value)} placeholder={selectedConfig?.hasTestSecret ? 'Stored securely — enter only to rotate' : 'Provider test secret'} /></div>
              </div>
            </section>
            <section className="space-y-4 rounded-lg border p-4">
              <h3 className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4" /> Live credentials</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Live public key</Label><Input autoComplete="off" value={selectedDraft.livePublicKey} onChange={e => updateDraft('livePublicKey', e.target.value)} placeholder="Provider live public key" /></div>
                <div className="space-y-2"><Label>Live secret key</Label><Input type="password" autoComplete="new-password" value={selectedDraft.liveSecret} onChange={e => updateDraft('liveSecret', e.target.value)} placeholder={selectedConfig?.hasLiveSecret ? 'Stored securely — enter only to rotate' : 'Provider live secret'} /></div>
              </div>
            </section>
            <section className="space-y-2 rounded-lg border p-4">
              <Label>Webhook signing secret</Label>
              <Input type="password" autoComplete="new-password" value={selectedDraft.webhookSecret} onChange={e => updateDraft('webhookSecret', e.target.value)} placeholder={selectedConfig?.hasWebhookSecret ? 'Stored securely — enter only to rotate' : 'Provider webhook signing secret'} />
              <p className="text-xs text-muted-foreground">Used by the server-side callback verifier. Never paste a publishable key into this field.</p>
            </section>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void save(selected, {})} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving to Vault…' : 'Save credentials'}</Button>
              <Button variant={selectedConfig?.enabled ? 'destructive' : 'default'} onClick={() => void save(selected, { enabled: !selectedConfig?.enabled })} disabled={saving}>
                {selectedConfig?.enabled ? 'Disable checkout' : 'Enable test checkout'}
              </Button>
              <Button variant="outline" onClick={() => void save(selected, { live: !selectedConfig?.live, enabled: true })} disabled={saving || (!selectedConfig?.live && (!selectedConfig?.hasLiveSecret || !selectedConfig?.hasWebhookSecret))}>
                {selectedConfig?.live ? 'Switch back to test' : 'Switch to live'}
              </Button>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <p className="text-xs text-muted-foreground">Provider configuration is global platform control. It does not alter existing tickets, payments or screening prices.</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
