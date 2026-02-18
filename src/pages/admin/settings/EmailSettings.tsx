import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import {
  Mail, Save, TestTube, Zap, Eye, EyeOff, CheckCircle,
  AlertCircle, Loader2, Send, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface EmailConfig {
  provider: string;
  mode: 'test' | 'live';
  test_api_key: string;
  live_api_key: string;
  from_name: string;
  from_email: string;
  reply_to: string;
}

const DEFAULT_CONFIG: EmailConfig = {
  provider: 'resend',
  mode: 'test',
  test_api_key: '',
  live_api_key: '',
  from_name: 'DeGameTV',
  from_email: 'noreply@degametv.com',
  reply_to: 'support@degametv.com',
};

export default function EmailSettings() {
  const [config, setConfig] = useState<EmailConfig>(DEFAULT_CONFIG);
  const [settingId, setSettingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTestKey, setShowTestKey] = useState(false);
  const [showLiveKey, setShowLiveKey] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('setting_key', 'email_provider')
      .single();

    if (data) {
      setSettingId(data.id);
      setConfig({ ...DEFAULT_CONFIG, ...(data.setting_value as unknown as EmailConfig) });
    } else if (error) {
      console.error('Failed to load email config:', error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchConfig(); }, []);

  const saveConfig = async () => {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configJson = config as unknown as any;

    let error;
    if (settingId) {
      ({ error } = await supabase
        .from('platform_settings')
        .update({ setting_value: configJson })
        .eq('id', settingId));
    } else {
      const res = await supabase.from('platform_settings').insert({
        setting_key: 'email_provider',
        setting_value: configJson,
        description: 'Email provider configuration — switch mode to live to use real API key',
        is_public: false,
      }).select().single();
      error = res.error;
      if (res.data) setSettingId(res.data.id);
    }

    if (error) toast.error('Failed to save: ' + error.message);
    else toast.success(`Email settings saved! Mode: ${config.mode.toUpperCase()}`);
    setSaving(false);
  };

  const switchMode = (mode: 'test' | 'live') => {
    if (mode === 'live' && !config.live_api_key) {
      toast.error('Please add your live API key first');
      return;
    }
    setConfig(c => ({ ...c, mode }));
    toast.info(`Switched to ${mode} mode — click Save to apply`);
  };

  const sendTestEmail = async () => {
    if (!testEmail) { toast.error('Enter a test email address'); return; }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-watch-email', {
        body: {
          email: testEmail,
          movieTitle: 'Test Movie — Email Delivery Check',
          watchUrl: `${window.location.origin}/watch/TEST_CODE`,
          ticketCode: 'TEST-XXXX-YYYY',
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'nigeria',
          price: 5000,
          currency: 'NGN',
        }
      });
      if (error) throw error;
      if (data?.mock) {
        toast.warning('Mock mode: No real email sent. Add a valid Resend API key to send real emails.', { duration: 6000 });
      } else if (data?.emailSent) {
        toast.success(`Test email sent to ${testEmail}!`);
      } else {
        toast.error('Email delivery failed — check your API key');
      }
    } catch (err: any) {
      toast.error('Test failed: ' + err.message);
    }
    setSendingTest(false);
  };

  if (loading) {
    return (
      <AdminLayout title="Email Settings">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const isLive = config.mode === 'live';

  return (
    <AdminLayout
      title="Email Settings"
      description="Configure Resend API keys for watch link delivery. Switch test ↔ live without rebuilding."
    >
      <div className="max-w-3xl space-y-6">
        {/* Current Status Banner */}
        <Alert className={isLive ? 'border-red-500/50 bg-red-500/10' : 'border-blue-500/50 bg-blue-500/10'}>
          {isLive
            ? <Zap className="h-4 w-4 text-red-400" />
            : <TestTube className="h-4 w-4 text-blue-400" />
          }
          <AlertDescription>
            <strong>{isLive ? '🔴 Live Mode' : '🔵 Test Mode'}:</strong>{' '}
            {isLive
              ? 'Real emails are being sent to customers using your live Resend API key.'
              : 'Emails are in test mode. Watch links will log to the edge function console but not deliver unless a valid test key is set.'}
            {' '}No rebuild needed to switch modes.
          </AlertDescription>
        </Alert>

        {/* Mode Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4" /> Email Provider Mode
            </CardTitle>
            <CardDescription>
              Switch between test and live without touching the codebase or redeploying
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => switchMode('test')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  !isLive ? 'border-blue-500 bg-blue-500/10' : 'border-border bg-card hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TestTube className={`w-5 h-5 ${!isLive ? 'text-blue-400' : 'text-muted-foreground'}`} />
                  <span className="font-bold text-sm">Test Mode</span>
                  {!isLive && <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">Active</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">Uses test API key. Safe for development and QA.</p>
              </button>

              <button
                type="button"
                onClick={() => switchMode('live')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isLive ? 'border-red-500 bg-red-500/10' : 'border-border bg-card hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className={`w-5 h-5 ${isLive ? 'text-red-400' : 'text-muted-foreground'}`} />
                  <span className="font-bold text-sm">Live Mode</span>
                  {isLive && <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">Active</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">Uses live API key. Real emails delivered to customers.</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resend API Keys</CardTitle>
            <CardDescription>
              Get your API keys from{' '}
              <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                resend.com/api-keys
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Key */}
            <div className={`space-y-3 p-4 rounded-xl border ${!isLive ? 'border-blue-500/30 bg-blue-500/5' : 'border-border bg-muted/20'}`}>
              <div className="flex items-center gap-2">
                <TestTube className="w-4 h-4 text-blue-400" />
                <Label className="text-sm font-semibold">Test API Key</Label>
                {!isLive && <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30 ml-auto">In Use</Badge>}
              </div>
              <div className="flex gap-2">
                <Input
                  type={showTestKey ? 'text' : 'password'}
                  placeholder="re_test_xxxxxxxxxxxxxxxxxxxx"
                  value={config.test_api_key}
                  onChange={e => setConfig(c => ({ ...c, test_api_key: e.target.value }))}
                  className="font-mono text-sm"
                />
                <Button variant="ghost" size="icon" onClick={() => setShowTestKey(v => !v)}>
                  {showTestKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Start with <code className="bg-muted px-1 rounded">re_</code> — find in your Resend dashboard under API Keys
              </p>
            </div>

            {/* Live Key */}
            <div className={`space-y-3 p-4 rounded-xl border ${isLive ? 'border-red-500/30 bg-red-500/5' : 'border-border'}`}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-400" />
                <Label className="text-sm font-semibold">Live API Key</Label>
                {isLive && <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30 ml-auto">In Use</Badge>}
              </div>
              <div className="flex gap-2">
                <Input
                  type={showLiveKey ? 'text' : 'password'}
                  placeholder="re_live_xxxxxxxxxxxxxxxxxxxx (add when ready to go live)"
                  value={config.live_api_key}
                  onChange={e => setConfig(c => ({ ...c, live_api_key: e.target.value }))}
                  className="font-mono text-sm"
                />
                <Button variant="ghost" size="icon" onClick={() => setShowLiveKey(v => !v)}>
                  {showLiveKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {!config.live_api_key && (
                <p className="text-xs text-yellow-500/80">
                  ⚠️ No live key yet. Add it here when ready to deliver real emails — then switch to Live Mode above.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sender Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sender Configuration</CardTitle>
            <CardDescription>How emails appear to recipients</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Name</Label>
                <Input
                  placeholder="DeGameTV"
                  value={config.from_name}
                  onChange={e => setConfig(c => ({ ...c, from_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input
                  placeholder="noreply@yourdomain.com"
                  value={config.from_email}
                  onChange={e => setConfig(c => ({ ...c, from_email: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Must be a verified domain in Resend</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Reply-To Email</Label>
                <Input
                  placeholder="support@yourdomain.com"
                  value={config.reply_to}
                  onChange={e => setConfig(c => ({ ...c, reply_to: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Send */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4" /> Send Test Email
            </CardTitle>
            <CardDescription>Verify your setup by sending a test watch-link email</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="your@email.com"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="flex-1"
              />
              <Button onClick={sendTestEmail} disabled={sendingTest} variant="outline" className="gap-2 shrink-0">
                {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This sends a sample watch link email using the current mode's API key
            </p>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex gap-3">
          <Button onClick={saveConfig} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Email Settings
          </Button>
          <Button onClick={fetchConfig} variant="ghost" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
