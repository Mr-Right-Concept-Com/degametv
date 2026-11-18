import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Save, TestTube, Zap, Eye, EyeOff, Loader2, Send, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailConfig {
  enabled: boolean;
  live: boolean;
  hasTestSecret: boolean;
  hasLiveSecret: boolean;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
}
const initial: EmailConfig = { enabled:false,live:false,hasTestSecret:false,hasLiveSecret:false,fromName:'DeGameTV',fromEmail:'',replyTo:'' };

export default function EmailSettings() {
  const [config,setConfig]=useState<EmailConfig>(initial);
  const [testSecret,setTestSecret]=useState('');
  const [liveSecret,setLiveSecret]=useState('');
  const [testEmail,setTestEmail]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [sending,setSending]=useState(false);
  const [showTest,setShowTest]=useState(false);
  const [showLive,setShowLive]=useState(false);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    const {data,error:invokeError}=await supabase.functions.invoke('manage-email-provider',{method:'GET'});
    if(invokeError||!data?.config){setError('Email settings could not be loaded. Sign in as a super administrator.');setLoading(false);return;}
    setConfig({...initial,...data.config});
    setLoading(false);
  },[]);
  useEffect(()=>{void load();},[load]);

  const save=async(enabled=config.enabled,live=config.live)=>{
    setSaving(true);setError('');
    const {data,error:invokeError}=await supabase.functions.invoke('manage-email-provider',{body:{
      testSecret:testSecret||undefined,liveSecret:liveSecret||undefined,
      fromName:config.fromName,fromEmail:config.fromEmail,replyTo:config.replyTo||undefined,
      enabled,live,
    }});
    setSaving(false);
    if(invokeError||!data?.success){const message=data?.error||invokeError?.message||'Email settings could not be saved.';setError(message);toast.error(message);return;}
    setTestSecret('');setLiveSecret('');
    toast.success(enabled?(live?'Live email delivery enabled.':'Test email delivery enabled.'):'Email delivery disabled.');
    await load();
  };

  const sendTest=async()=>{
    if(!testEmail.trim()){toast.error('Enter a recipient email.');return;}
    setSending(true);
    const {data,error:invokeError}=await supabase.functions.invoke('test-email-provider',{body:{email:testEmail.trim()}});
    setSending(false);
    if(invokeError||!data?.success){toast.error(data?.error||invokeError?.message||'Test email failed.');return;}
    toast.success('Test email accepted by Resend.');
  };

  if(loading)return <AdminLayout title="Email Settings"><div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div></AdminLayout>;
  return <AdminLayout title="Email Settings" description="Manage Resend delivery and mode from the central Vault without rebuilding">
    <div className="max-w-3xl space-y-6">
      <Alert><ShieldCheck className="h-4 w-4"/><AlertDescription>API keys are written directly to Supabase Vault. They are never returned to the browser or stored in platform_settings. Only super administrators can change delivery mode.</AlertDescription></Alert>
      {error&&<Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertDescription>{error}</AlertDescription></Alert>}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4"/>Delivery status</CardTitle><CardDescription>Switch test and live delivery centrally. Changes take effect immediately for new messages.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2"><Badge variant={config.enabled?'default':'secondary'}>{config.enabled?'Enabled':'Disabled'}</Badge><Badge variant={config.live?'destructive':'outline'}>{config.live?'LIVE':'TEST'}</Badge><span className="text-xs text-muted-foreground">Test key: {config.hasTestSecret?'stored in Vault':'missing'} · Live key: {config.hasLiveSecret?'stored in Vault':'missing'}</span></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant={!config.live?'default':'outline'} onClick={()=>void save(true,false)} disabled={saving||!config.hasTestSecret}><TestTube className="mr-2 h-4 w-4"/>Enable test delivery</Button>
            <Button variant={config.live?'destructive':'outline'} onClick={()=>void save(true,true)} disabled={saving||!config.hasLiveSecret}><Zap className="mr-2 h-4 w-4"/>Switch to live</Button>
          </div>
          <Button variant="ghost" onClick={()=>void save(false,false)} disabled={saving||!config.enabled}>Disable email delivery</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Resend Vault credentials</CardTitle><CardDescription>Enter new keys only when adding or rotating them. Existing secrets are never displayed.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Test API key</Label><div className="flex gap-2"><Input type={showTest?'text':'password'} autoComplete="new-password" value={testSecret} onChange={e=>setTestSecret(e.target.value)} placeholder={config.hasTestSecret?'Stored securely — enter only to rotate':'re_… test API key'}/><Button variant="ghost" size="icon" onClick={()=>setShowTest(v=>!v)} aria-label={showTest?'Hide test key':'Show test key'}>{showTest?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</Button></div></div>
          <div className="space-y-2"><Label>Live API key</Label><div className="flex gap-2"><Input type={showLive?'text':'password'} autoComplete="new-password" value={liveSecret} onChange={e=>setLiveSecret(e.target.value)} placeholder={config.hasLiveSecret?'Stored securely — enter only to rotate':'re_… live API key'}/><Button variant="ghost" size="icon" onClick={()=>setShowLive(v=>!v)} aria-label={showLive?'Hide live key':'Show live key'}>{showLive?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</Button></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>From name</Label><Input value={config.fromName} onChange={e=>setConfig(v=>({...v,fromName:e.target.value}))}/></div>
            <div className="space-y-2"><Label>Verified sender email</Label><Input type="email" value={config.fromEmail} onChange={e=>setConfig(v=>({...v,fromEmail:e.target.value}))} placeholder="noreply@yourdomain.com"/></div>
            <div className="space-y-2 sm:col-span-2"><Label>Reply-to email</Label><Input type="email" value={config.replyTo||''} onChange={e=>setConfig(v=>({...v,replyTo:e.target.value}))} placeholder="support@yourdomain.com"/></div>
          </div>
          <Button onClick={()=>void save()} disabled={saving}><Save className="mr-2 h-4 w-4"/>{saving?'Saving to Vault…':'Save credentials and sender'}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-4 w-4"/>Test delivery</CardTitle><CardDescription>Send a real test message using the currently active Vault key.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row"><Input type="email" value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="recipient@example.com"/><Button onClick={()=>void sendTest()} disabled={sending||!config.enabled}>{sending?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Send className="mr-2 h-4 w-4"/>}Send test</Button><Button variant="ghost" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></CardContent>
      </Card>
    </div>
  </AdminLayout>;
}
