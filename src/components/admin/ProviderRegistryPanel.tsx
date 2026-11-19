import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { invokeFn } from '@/lib/invokeFn';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';

type Capability = 'payments'|'identity'|'bank_verification'|'video_delivery'|'email'|'live_streaming'|'fx_rates';
type Provider = { id:string; capability:Capability; provider_key:string; enabled:boolean; is_live:boolean; base_url:string|null; endpoints:Record<string,unknown>; settings:Record<string,unknown>; updated_at:string; removed_at:string|null; priority:number; hasTestCredential:boolean; hasLiveCredential:boolean; hasTestWebhookSecret:boolean; hasLiveWebhookSecret:boolean };
const capabilities: {value:Capability;label:string}[] = [
  {value:'payments',label:'Payments'},{value:'identity',label:'Identity & liveness'},
  {value:'bank_verification',label:'Bank verification'},{value:'video_delivery',label:'Video delivery'},
  {value:'email',label:'Email delivery'},{value:'live_streaming',label:'Live streaming'},{value:'fx_rates',label:'Foreign exchange (FX)'},
];
export function ProviderRegistryPanel({initialCapability='payments'}:{initialCapability?:Capability}){
  const [rows,setRows]=useState<Provider[]>([]);
  const [busy,setBusy]=useState(false);
  const [saving,setSaving]=useState(false);
  const [capability,setCapability]=useState<Capability>(initialCapability);
  const [providerKey,setProviderKey]=useState('');
  const [baseUrl,setBaseUrl]=useState('');
  const [testCredential,setTestCredential]=useState('');
  const [liveCredential,setLiveCredential]=useState('');
  const [testWebhookSecret,setTestWebhookSecret]=useState('');
  const [liveWebhookSecret,setLiveWebhookSecret]=useState('');
  const [live,setLive]=useState(false);
  const [priority,setPriority]=useState(100);
  const [testEmailRecipient,setTestEmailRecipient]=useState('');
  const [testingEmail,setTestingEmail]=useState(false);
  const [enabled,setEnabled]=useState(false);
  const [endpoints,setEndpoints]=useState('{}');
  const [settings,setSettings]=useState('{}');
  const load=useCallback(async()=>{
    setBusy(true);
    try{const r=await invokeFn<{providers:Provider[]}>('admin-provider-control',{action:'list'});if(!r.ok)throw new Error(r.error);setRows(r.data?.providers||[]);}
    catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const save=async()=>{
    let endpointValue:Record<string,unknown>,settingValue:Record<string,unknown>;
    try{endpointValue=JSON.parse(endpoints);settingValue=JSON.parse(settings);if(!endpointValue||Array.isArray(endpointValue)||typeof endpointValue!=='object'||!settingValue||Array.isArray(settingValue)||typeof settingValue!=='object')throw new Error();}
    catch{toast.error('Endpoints and settings must be JSON objects.');return;}
    setSaving(true);
    try{
      const r=await invokeFn('admin-provider-control',{action:'configure',capability,providerKey,baseUrl,enabled,live,priority,endpoints:endpointValue,settings:settingValue,testCredential:testCredential||undefined,liveCredential:liveCredential||undefined,testWebhookSecret:testWebhookSecret||undefined,liveWebhookSecret:liveWebhookSecret||undefined});
      if(!r.ok)throw new Error(r.error);
      toast.success('Provider configuration saved to the Vault-backed registry.');
      setTestCredential('');setLiveCredential('');setTestWebhookSecret('');setLiveWebhookSecret('');await load();
    }catch(e){toast.error((e as Error).message);}finally{setSaving(false);}
  };
  const test=async(row:Provider)=>{
    setSaving(true);
    try{const r=await invokeFn<{success:boolean;mode:string}>('admin-provider-control',{action:'test',capability:row.capability,providerKey:row.provider_key});if(!r.ok)throw new Error(r.error);toast.success('Provider health check passed ('+(r.data?.mode||'configured')+' mode).');}
    catch(e){toast.error((e as Error).message);}finally{setSaving(false);}
  };
  const edit=(row:Provider)=>{
    setCapability(row.capability);setProviderKey(row.provider_key);setBaseUrl(row.base_url||'');setEndpoints(JSON.stringify(row.endpoints||{},null,2));setSettings(JSON.stringify(row.settings||{},null,2));setEnabled(row.enabled);setLive(row.is_live);setPriority(row.priority ?? 100);
    toast.message('Provider configuration loaded. Add or rotate test/live secrets only if needed, then save to apply runtime settings.');
  };
  const sendTestEmail=async()=>{
    if(!testEmailRecipient.trim())return toast.error('Enter a recipient email.');
    setTestingEmail(true);
    try{
      const result=await invokeFn<{success:boolean;provider:string;mode:string}>('test-email-provider',{email:testEmailRecipient.trim()});
      if(!result.ok||!result.data?.success)throw new Error(result.error||'Email provider test was not accepted.');
      toast.success('Test email delivered through '+result.data.provider+' ('+result.data.mode+').');
    }catch(error){toast.error((error as Error).message);}
    finally{setTestingEmail(false);}
  };
  const remove=async(row:Provider)=>{
    setSaving(true);
    try{const r=await invokeFn('admin-provider-control',{action:'remove',capability:row.capability,providerKey:row.provider_key});if(!r.ok)throw new Error(r.error);toast.success('Provider detached from the active registry.');await load();}
    catch(e){toast.error((e as Error).message);}finally{setSaving(false);}
  };
  return <div className="space-y-4">
    <Card><CardHeader><CardTitle className="text-base">Unified provider registry</CardTitle><CardDescription>One runtime control plane for payments, identity, banking, media, live streaming, email and foreign exchange. Save test keys first, run a health check even while disabled, then enable test mode. Add live keys and switch to live only after a successful health check. Secrets stay in Vault and changes apply immediately without a rebuild.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Capability</Label><Select value={capability} onValueChange={v=>setCapability(v as Capability)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{capabilities.map(c=><SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Provider adapter key</Label><Input value={providerKey} onChange={e=>setProviderKey(e.target.value.trim().toLowerCase())} placeholder="Your provider adapter identifier"/></div>
        <div className="space-y-2 md:col-span-2"><Label>HTTPS API base URL</Label><Input value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} placeholder="https://api.provider.example"/></div>
        <div className="space-y-2"><Label>Routing priority (lower number wins)</Label><Input type="number" min={0} max={10000} step={1} value={priority} onChange={e=>setPriority(Math.max(0,Math.min(10000,Number(e.target.value)||0)))}/></div>
        <div className="space-y-2"><Label>Test API credential</Label><Input type="password" autoComplete="new-password" value={testCredential} onChange={e=>setTestCredential(e.target.value)} placeholder="Test/sandbox secret key — stored in Vault"/></div>
        <div className="space-y-2"><Label>Live API credential</Label><Input type="password" autoComplete="new-password" value={liveCredential} onChange={e=>setLiveCredential(e.target.value)} placeholder="Live/production secret key — stored in Vault"/></div>
        <div className="space-y-2"><Label>Test webhook signing secret</Label><Input type="password" autoComplete="new-password" value={testWebhookSecret} onChange={e=>setTestWebhookSecret(e.target.value)} placeholder="Sandbox webhook secret"/></div>
        <div className="space-y-2"><Label>Live webhook signing secret</Label><Input type="password" autoComplete="new-password" value={liveWebhookSecret} onChange={e=>setLiveWebhookSecret(e.target.value)} placeholder="Production webhook secret"/></div>
        <div className="space-y-2"><Label>Endpoint contract JSON</Label><Textarea value={endpoints} onChange={e=>setEndpoints(e.target.value)} rows={5} className="font-mono text-xs"/></div>
        <div className="space-y-2"><Label>Provider settings JSON</Label><Textarea value={settings} onChange={e=>setSettings(e.target.value)} rows={5} className="font-mono text-xs"/></div>
        <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Enable binding</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={live} onChange={e=>setLive(e.target.checked)}/> Live mode</label><p className="w-full text-xs text-muted-foreground">A successful health_check response must be JSON with <code>ok: true</code> or <code>status: true</code>. Test and live credentials and webhook secrets are separate; a mode switch takes effect immediately after saving.</p></div>
        {capability==='email'&&<div className="rounded-xl border p-4 space-y-3"><div><p className="font-medium text-sm">Delivery test</p><p className="text-xs text-muted-foreground">Send a real test message using the enabled Vault-backed email binding and its active mode.</p></div><div className="flex flex-col sm:flex-row gap-2"><Input type="email" value={testEmailRecipient} onChange={e=>setTestEmailRecipient(e.target.value)} placeholder="admin@example.com"/><Button variant="outline" disabled={testingEmail||!testEmailRecipient.trim()} onClick={()=>void sendTestEmail()}>{testingEmail&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Send test email</Button></div></div>}
        <div className="flex justify-end"><Button onClick={save} disabled={saving||!providerKey||!baseUrl}>{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save provider</Button></div>
      </CardContent>
    </Card>
    <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-base">Configured providers</CardTitle><CardDescription>Active provider selection and detached integrations.</CardDescription></div><Button variant="outline" size="sm" onClick={load} disabled={busy}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></CardHeader>
      <CardContent className="space-y-3">{busy?<Loader2 className="h-5 w-5 animate-spin"/>:rows.length===0?<p className="text-sm text-muted-foreground">No provider bindings configured.</p>:rows.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="font-medium">{capabilities.find(c=>c.value===row.capability)?.label} · {row.provider_key}</p><p className="truncate text-xs text-muted-foreground">{row.base_url||'No API base URL'}</p><div className="mt-1 flex flex-wrap gap-2"><Badge variant={row.enabled&&!row.removed_at?'default':'secondary'}>{row.enabled&&!row.removed_at?'Enabled':'Detached'}</Badge>{row.is_live&&<Badge variant="outline">Live</Badge>}<Badge variant={row.hasTestCredential?'outline':'destructive'}>{row.hasTestCredential?'Test key saved':'No test key'}</Badge><Badge variant={row.hasLiveCredential?'outline':'secondary'}>{row.hasLiveCredential?'Live key saved':'No live key'}</Badge><Badge variant={row.hasTestWebhookSecret?'outline':'destructive'}>{row.hasTestWebhookSecret?'Test webhook saved':'No test webhook'}</Badge><Badge variant={row.hasLiveWebhookSecret?'outline':'secondary'}>{row.hasLiveWebhookSecret?'Live webhook saved':'No live webhook'}</Badge><Badge variant="outline">Priority {row.priority}</Badge></div></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={saving||!!row.removed_at} onClick={()=>edit(row)}>Edit</Button><Button size="sm" variant="outline" disabled={saving||!!row.removed_at} onClick={()=>void test(row)}>Test</Button><Button size="sm" variant="destructive" disabled={saving||!!row.removed_at} onClick={()=>remove(row)}><Trash2 className="mr-2 h-4 w-4"/>Remove</Button></div></div>)}</CardContent>
    </Card>
  </div>;
}