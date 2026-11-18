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

type Capability = 'payments'|'identity'|'bank_verification'|'video_delivery'|'email'|'live_streaming';
type Provider = { id:string; capability:Capability; provider_key:string; enabled:boolean; is_live:boolean; base_url:string|null; endpoints:Record<string,unknown>; settings:Record<string,unknown>; updated_at:string; removed_at:string|null; priority:number; hasTestCredential:boolean; hasLiveCredential:boolean; hasTestWebhookSecret:boolean; hasLiveWebhookSecret:boolean };
const capabilities: {value:Capability;label:string}[] = [
  {value:'payments',label:'Payments'},{value:'identity',label:'Identity & liveness'},
  {value:'bank_verification',label:'Bank verification'},{value:'video_delivery',label:'Video delivery'},
  {value:'email',label:'Email delivery'},{value:'live_streaming',label:'Live streaming'},
];
export function ProviderRegistryPanel(){
  const [rows,setRows]=useState<Provider[]>([]);
  const [busy,setBusy]=useState(false);
  const [saving,setSaving]=useState(false);
  const [capability,setCapability]=useState<Capability>('payments');
  const [providerKey,setProviderKey]=useState('');
  const [baseUrl,setBaseUrl]=useState('');
  const [testCredential,setTestCredential]=useState('');
  const [liveCredential,setLiveCredential]=useState('');
  const [testWebhookSecret,setTestWebhookSecret]=useState('');
  const [liveWebhookSecret,setLiveWebhookSecret]=useState('');
  const [live,setLive]=useState(false);
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
      const r=await invokeFn('admin-provider-control',{action:'configure',capability,providerKey,baseUrl,enabled,live,endpoints:endpointValue,settings:settingValue,testCredential:testCredential||undefined,liveCredential:liveCredential||undefined,testWebhookSecret:testWebhookSecret||undefined,liveWebhookSecret:liveWebhookSecret||undefined});
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
  const remove=async(row:Provider)=>{
    setSaving(true);
    try{const r=await invokeFn('admin-provider-control',{action:'remove',capability:row.capability,providerKey:row.provider_key});if(!r.ok)throw new Error(r.error);toast.success('Provider detached from the active registry.');await load();}
    catch(e){toast.error((e as Error).message);}finally{setSaving(false);}
  };
  return <div className="space-y-4">
    <Card><CardHeader><CardTitle className="text-base">Unified provider registry</CardTitle><CardDescription>One runtime control plane for payments, identity, banking, media, live streaming and email. Separate test and live API/webhook secrets stay in Vault; switching modes never overwrites the other key. Runtime changes take effect without rebuilding or redeploying the frontend.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Capability</Label><Select value={capability} onValueChange={v=>setCapability(v as Capability)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{capabilities.map(c=><SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Provider adapter key</Label><Input value={providerKey} onChange={e=>setProviderKey(e.target.value.trim().toLowerCase())} placeholder="Your provider adapter identifier"/></div>
        <div className="space-y-2 md:col-span-2"><Label>HTTPS API base URL</Label><Input value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} placeholder="https://api.provider.example"/></div>
        <div className="space-y-2"><Label>Test API credential</Label><Input type="password" autoComplete="new-password" value={testCredential} onChange={e=>setTestCredential(e.target.value)} placeholder="Test/sandbox secret key — stored in Vault"/></div>
        <div className="space-y-2"><Label>Live API credential</Label><Input type="password" autoComplete="new-password" value={liveCredential} onChange={e=>setLiveCredential(e.target.value)} placeholder="Live/production secret key — stored in Vault"/></div>
        <div className="space-y-2"><Label>Test webhook signing secret</Label><Input type="password" autoComplete="new-password" value={testWebhookSecret} onChange={e=>setTestWebhookSecret(e.target.value)} placeholder="Sandbox webhook secret"/></div>
        <div className="space-y-2"><Label>Live webhook signing secret</Label><Input type="password" autoComplete="new-password" value={liveWebhookSecret} onChange={e=>setLiveWebhookSecret(e.target.value)} placeholder="Production webhook secret"/></div>
        <div className="space-y-2"><Label>Endpoint contract JSON</Label><Textarea value={endpoints} onChange={e=>setEndpoints(e.target.value)} rows={5} className="font-mono text-xs"/></div>
        <div className="space-y-2"><Label>Provider settings JSON</Label><Textarea value={settings} onChange={e=>setSettings(e.target.value)} rows={5} className="font-mono text-xs"/></div>
        <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Enable binding</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={live} onChange={e=>setLive(e.target.checked)}/> Live mode</label><p className="w-full text-xs text-muted-foreground">Priority can be set in Provider settings JSON as <code>{'{"priority": 1}'}</code>. Lower numbers win. A successful health_check response must be JSON {"ok":true}; live payments and streaming also require a live webhook signing secret.</p></div>
        <div className="flex justify-end"><Button onClick={save} disabled={saving||!providerKey||!baseUrl}>{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save provider</Button></div>
      </CardContent>
    </Card>
    <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-base">Configured providers</CardTitle><CardDescription>Active provider selection and detached integrations.</CardDescription></div><Button variant="outline" size="sm" onClick={load} disabled={busy}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></CardHeader>
      <CardContent className="space-y-3">{busy?<Loader2 className="h-5 w-5 animate-spin"/>:rows.length===0?<p className="text-sm text-muted-foreground">No provider bindings configured.</p>:rows.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="font-medium">{capabilities.find(c=>c.value===row.capability)?.label} · {row.provider_key}</p><p className="truncate text-xs text-muted-foreground">{row.base_url||'No API base URL'}</p><div className="mt-1 flex flex-wrap gap-2"><Badge variant={row.enabled&&!row.removed_at?'default':'secondary'}>{row.enabled&&!row.removed_at?'Enabled':'Detached'}</Badge>{row.is_live&&<Badge variant="outline">Live</Badge>}<Badge variant={row.hasCredential?'outline':'destructive'}>{row.hasTestCredential?'Test key saved':'No test key'}</Badge><Badge variant={row.hasLiveCredential?'outline':'secondary'}>{row.hasLiveCredential?'Live key saved':'No live key'}</Badge><Badge variant="outline">Priority {row.priority}</Badge></div></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={saving||!row.enabled||!!row.removed_at} onClick={()=>void test(row)}>Test</Button><Button size="sm" variant="destructive" disabled={saving||!!row.removed_at} onClick={()=>remove(row)}><Trash2 className="mr-2 h-4 w-4"/>Remove</Button></div></div>)}</CardContent>
    </Card>
  </div>;
}