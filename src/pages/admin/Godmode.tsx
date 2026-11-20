import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import type { Json, Tables } from '@/integrations/supabase/types';
import { invokeFn } from '@/lib/invokeFn';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { ProviderRegistryPanel } from '@/components/admin/ProviderRegistryPanel';
import { RuntimeControlPanel } from '@/components/admin/RuntimeControlPanel';
import { PlatformGovernancePanel } from '@/components/admin/PlatformGovernancePanel';
import { BrandingRegistryPanel } from '@/components/admin/BrandingRegistryPanel';

async function god(body: Record<string, unknown>) {
  const r = await invokeFn<{ result?: unknown }>('admin-godmode', body);
  if (!r.ok) throw new Error(r.error);
  return r.data?.result;
}

const adjustSchema = z.object({
  userId: z.string().uuid('Pick a user'),
  amount: z.number().refine(n => n !== 0, 'Amount cannot be zero'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Choose a valid ISO currency'),
  reason: z.string().min(3, 'Give a reason'),
});

interface Profile { user_id: string; email: string | null; full_name: string | null }

export default function Godmode() {
  usePageTitle('Godmode — Admin');
  const [settings, setSettings] = useState<{ setting_key: string; setting_value: Json; description: string | null }[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<{ user_id: string; role: string }[]>([]);
  const [tiers, setTiers] = useState<Tables<'studio_accounts'>[]>([]);
  const [screenings, setScreenings] = useState<Pick<Tables<'screenings'>, 'id' | 'title' | 'lifecycle'>[]>([]);
  const [audit, setAudit] = useState<Pick<Tables<'audit_logs'>, 'id' | 'user_id' | 'action' | 'entity_type' | 'entity_id' | 'created_at'>[]>([]);
  const [banners, setBanners] = useState<Tables<'promo_banners'>[]>([]);
  const [nb, setNb] = useState({ title: '', subtitle: '', image_url: '', link_url: '', placement: 'home' });
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [auditQ, setAuditQ] = useState('');
  const [adj, setAdj] = useState({ userId: '', amount: '', currency: 'USD', reason: '' });
  const [currencyOptions, setCurrencyOptions] = useState<{ currency_code: string; currency_symbol: string | null }[]>([]);

  const load = async () => {
    const [s, p, r, t, sc, a, currencies] = await Promise.all([
      supabase.from('platform_settings').select('setting_key, setting_value, description').order('setting_key'),
      supabase.from('profiles').select('user_id, email, full_name').order('created_at', { ascending: false }).limit(500),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('studio_accounts').select('*').order('created_at', { ascending: false }),
      supabase.from('screenings').select('id, title, lifecycle').order('created_at', { ascending: false }).limit(200),
      supabase.from('audit_logs').select('id,user_id,action,entity_type,entity_id,created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('country_currency_rules').select('currency_code,currency_symbol').eq('enabled', true).order('currency_code'),
    ]);
    const editableSettings = (s.data || []).filter(item => !['email_provider','currency_rates','escrow_hold_days'].includes(item.setting_key));
    setSettings(editableSettings);
    setDrafts(Object.fromEntries(editableSettings.map(x => [x.setting_key, JSON.stringify(x.setting_value, null, 2)])));
    setProfiles((p.data as Profile[]) || []);
    setRoles(r.data || []);
    setTiers(t.data || []);
    setScreenings(sc.data || []);
    setAudit(a.data || []);
    setCurrencyOptions(Array.from(new Map((currencies.data || []).map(row => [row.currency_code, row])).values()));
    const { data: bn } = await supabase.from('promo_banners').select('*').order('sort_order').order('created_at', { ascending: false });
    setBanners(bn || []);
  };

  const bannerSchema = z.object({ title: z.string().trim().min(2, 'Add a title').max(120), subtitle: z.string().max(200), image_url: z.string().trim().url('Image URL is invalid'), link_url: z.string().trim().max(500), placement: z.enum(['home', 'cinema', 'all']) });
  const addBanner = async () => {
    const p = bannerSchema.safeParse(nb);
    if (!p.success) { toast.error(p.error.errors[0].message); return; }
    const { error } = await supabase.from('promo_banners').insert({ title: p.data.title, image_url: p.data.image_url, subtitle: p.data.subtitle || null, link_url: p.data.link_url || null, placement: p.data.placement, is_active: true, status: 'approved' });
    if (error) toast.error(error.message); else { toast.success('Banner published'); setNb({ title: '', subtitle: '', image_url: '', link_url: '', placement: 'home' }); load(); }
  };
  const patchBanner = async (id: string, patch: Partial<Tables<'promo_banners'>>, ok: string) => {
    const { error } = await supabase.from('promo_banners').update(patch).eq('id', id);
    if (error) toast.error(error.message); else { toast.success(ok); load(); }
  };
  const deleteBanner = async (id: string) => {
    const { error } = await supabase.from('promo_banners').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Banner removed'); load(); }
  };
  useEffect(() => { load(); }, []);

  const run = async (id: string, body: Record<string, unknown>, ok: string) => {
    setBusy(id);
    try { const r = await god(body); toast.success(ok); await load(); return r; }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const saveSetting = (key: string) => {
    let value: unknown;
    try { value = JSON.parse(drafts[key]); } catch { toast.error('Value must be valid JSON'); return; }
    run(`s-${key}`, { action: 'setting_update', key, value }, 'Setting saved');
  };

  const submitAdjust = () => {
    const parsed = adjustSchema.safeParse({ ...adj, amount: Number(adj.amount) });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    run('adj', { action: 'wallet_adjust', ...parsed.data }, 'Wallet adjusted').then(() => setAdj({ userId: '', amount: '', currency: 'USD', reason: '' }));
  };

  const lifecycle = async (id: string, action: string) => {
    setBusy(`l-${id}`);
    const r = await invokeFn('manage-event', { screeningId: id, action });
    if (!r.ok) toast.error(r.error); else { toast.success('Event updated'); load(); }
    setBusy(null);
  };

  const impersonate = async (userId: string) => {
    const result = await run(`i-${userId}`, { action: 'impersonate', userId, redirectTo: `${window.location.origin}/studio` }, 'Sign-in link created');
    if (result && typeof result === 'object' && 'link' in result && typeof result.link === 'string') {
      await navigator.clipboard?.writeText(result.link).catch(() => undefined);
      const email = 'email' in result && typeof result.email === 'string' ? result.email : 'the selected user';
      toast.message(`Link for ${email} copied. Open it in a private window so your admin session stays signed in.`);
    }
  };

  const rolesOf = (id: string) => roles.filter(r => r.user_id === id).map(r => r.role);
  const nameOf = (id: string) => profiles.find(p => p.user_id === id)?.email || id.slice(0, 8);
  const filtered = profiles.filter(p => !q || (p.email || '').toLowerCase().includes(q.toLowerCase()) || (p.full_name || '').toLowerCase().includes(q.toLowerCase()));
  const filteredAudit = audit.filter(row => !auditQ || [row.action,row.entity_type,row.entity_id,row.user_id].some(value => String(value ?? '').toLowerCase().includes(auditQ.toLowerCase())));
  const exportAudit = () => {
    const fields = ['created_at','action','entity_type','entity_id','user_id'];
    const escape = (value: unknown) => '"' + String(value ?? '').replace(/"/g,'""') + '"';
    const csv = [fields.join(','),...filteredAudit.map(row => [row.created_at,row.action,row.entity_type,row.entity_id,row.user_id].map(escape).join(','))].join('\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href=url;anchor.download='degametv-audit-'+new Date().toISOString().slice(0,10)+'.csv';
    anchor.click();URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Godmode" description="Platform-wide control: settings, roles, wallets, tiers, events and audit trail">
      <Tabs defaultValue="settings">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="global">Global & releases</TabsTrigger>
          <TabsTrigger value="governance">AI & canary</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="users">Users & roles</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Creator & identity approval policy</CardTitle><CardDescription>Changes take effect at runtime. Automatic approval is only safe after a verified KYC/KYB provider is connected in the Vault.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {[
                { key: 'creator_approval_mode', label: 'Creator activation', options: [{value:'manual',label:'Manual review'},{value:'automatic',label:'Automatic after verified checks'},{value:'hybrid',label:'Hybrid: auto-pass verified, queue exceptions'}] },
                { key: 'kyc_verification_mode', label: 'Identity verification', options: [{value:'manual',label:'Manual review'},{value:'automatic',label:'Provider verified only'},{value:'hybrid',label:'Hybrid review'}] },
                { key: 'kyb_verification_mode', label: 'Business verification', options: [{value:'manual',label:'Manual review'},{value:'automatic',label:'Provider verified only'},{value:'hybrid',label:'Hybrid review'}] },
              ].map(policy => {
                const current = settings.find(item => item.setting_key === policy.key)?.setting_value;
                const selected = typeof current === 'string' ? current : 'manual';
                return <div key={policy.key} className="space-y-2">
                  <Label>{policy.label}</Label>
                  <Select value={selected} onValueChange={value => {
                    setDrafts(d => ({...d,[policy.key]:JSON.stringify(value)}));
                    run('s-'+policy.key,{action:'setting_update',key:policy.key,value},'Approval policy updated');
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{policy.options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>;
              })}
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
          {settings.map(s => (
            <Card key={s.setting_key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">{s.setting_key}</CardTitle>
                {s.description && <CardDescription>{s.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor={`set-${s.setting_key}`} className="sr-only">{s.setting_key}</Label>
                <Textarea id={`set-${s.setting_key}`} rows={4} className="font-mono text-xs" value={drafts[s.setting_key] ?? ''} onChange={e => setDrafts(d => ({ ...d, [s.setting_key]: e.target.value }))} />
                <Button size="sm" className="rounded-full" disabled={busy === `s-${s.setting_key}`} onClick={() => saveSetting(s.setting_key)}>
                  {busy === `s-${s.setting_key}` && <Loader2 className="w-3 h-3 animate-spin mr-1" />}Save
                </Button>
              </CardContent>
            </Card>
          ))}
          </div>
        </TabsContent>

        <TabsContent value="providers" className="mt-4 space-y-4"><ProviderRegistryPanel /></TabsContent>
        <TabsContent value="global" className="mt-4 space-y-4"><RuntimeControlPanel /></TabsContent>
        <TabsContent value="governance" className="mt-4 space-y-4"><PlatformGovernancePanel /></TabsContent>
        <TabsContent value="branding" className="mt-4 space-y-4"><BrandingRegistryPanel /></TabsContent>

        <TabsContent value="users" className="mt-4 space-y-3">
          <Input placeholder="Search by email or name" value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" aria-label="Search users" />
          {filtered.slice(0, 100).map(p => {
            const r = rolesOf(p.user_id);
            return (
              <Card key={p.user_id}><CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1">{r.map(x => <Badge key={x} variant="secondary">{x}</Badge>)}</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(['platform_admin', 'super_admin'] as const).map(role => (
                    <Button key={role} size="sm" variant={r.includes(role) ? 'default' : 'outline'} className="rounded-full text-xs"
                      disabled={!!busy} onClick={() => run(`r-${p.user_id}`, { action: 'role_set', userId: p.user_id, role, grant: !r.includes(role) }, 'Roles updated')}>
                      {r.includes(role) ? `Revoke ${role}` : `Grant ${role}`}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" className="rounded-full text-xs" disabled={!!busy} onClick={() => impersonate(p.user_id)}>Sign in as</Button>
                </div>
              </CardContent></Card>
            );
          })}
        </TabsContent>

        <TabsContent value="wallets" className="mt-4">
          <Card className="max-w-lg"><CardHeader><CardTitle className="text-base">Manual wallet adjustment</CardTitle>
            <CardDescription>Positive credits the wallet, negative debits it. Applies immediately and is logged.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>User</Label>
                <Select value={adj.userId} onValueChange={v => setAdj(a => ({ ...a, userId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choose account" /></SelectTrigger>
                  <SelectContent>{profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.email}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label htmlFor="adj-amt">Amount</Label><Input id="adj-amt" type="number" value={adj.amount} onChange={e => setAdj(a => ({ ...a, amount: e.target.value }))} /></div>
                <div><Label>Currency</Label>
                  <Select value={adj.currency} onValueChange={v => setAdj(a => ({ ...a, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{currencyOptions.map(option => <SelectItem key={option.currency_code} value={option.currency_code}>{option.currency_code} {option.currency_symbol || ''}</SelectItem>)}</SelectContent>
                  </Select></div>
              </div>
              <div><Label htmlFor="adj-r">Reason</Label><Input id="adj-r" value={adj.reason} onChange={e => setAdj(a => ({ ...a, reason: e.target.value }))} /></div>
              <Button className="rounded-full" disabled={busy === 'adj'} onClick={submitAdjust}>Apply adjustment</Button>
            </CardContent></Card>
        </TabsContent>

        <TabsContent value="tiers" className="mt-4 space-y-2">
          {tiers.length === 0 && <p className="text-sm text-muted-foreground">No tier applications yet.</p>}
          {tiers.map(t => (
            <Card key={t.id}><CardContent className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div><p className="text-sm font-medium">{nameOf(t.user_id)} · <span className="capitalize">{t.tier}</span></p>
                <p className="text-xs text-muted-foreground">{t.company_name || '—'} · <Badge variant="outline">{t.status}</Badge></p></div>
              <Button size="sm" variant="outline" className="rounded-full" asChild>
                <Link to="/admin/studio-applications">Review application</Link>
              </Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="events" className="mt-4 space-y-2">
          {screenings.map(s => (
            <Card key={s.id}><CardContent className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm font-medium">{s.title} <Badge variant="secondary" className="ml-1">{s.lifecycle}</Badge></p>
              <div className="flex flex-wrap gap-1">
                {['upcoming', 'live', 'replay', 'archived', 'cancel'].map(a => (
                  <Button key={a} size="sm" variant={a === 'cancel' ? 'destructive' : 'outline'} className="rounded-full text-xs capitalize"
                    disabled={!!busy || s.lifecycle === a} onClick={() => lifecycle(s.id, a)}>{a}</Button>
                ))}
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="banners" className="mt-4 grid lg:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle className="text-base">New banner</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(['title', 'subtitle', 'image_url', 'link_url'] as const).map(f => (
                <div key={f}><Label htmlFor={`nb-${f}`} className="capitalize">{f.replace('_', ' ')}</Label>
                  <Input id={`nb-${f}`} value={nb[f]} onChange={e => setNb(v => ({ ...v, [f]: e.target.value }))} placeholder={f === 'link_url' ? '/movie/slug' : ''} /></div>
              ))}
              <Select value={nb.placement} onValueChange={v => setNb(x => ({ ...x, placement: v }))}>
                <SelectTrigger aria-label="Placement"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="home">Homepage</SelectItem><SelectItem value="cinema">Cinema lobby</SelectItem><SelectItem value="all">Both</SelectItem></SelectContent>
              </Select>
              <Button className="rounded-full" onClick={addBanner}>Publish banner</Button>
            </CardContent></Card>
          <div className="space-y-2">
            {banners.length === 0 && <p className="text-sm text-muted-foreground">No banners yet.</p>}
            {banners.map(b => (
              <Card key={b.id}><CardContent className="p-3 flex gap-3 items-center">
                <img src={b.image_url} alt="" className="w-24 h-10 object-cover rounded-lg bg-muted" />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.placement} · {b.status === 'requested' ? 'organizer request' : b.is_active ? 'live' : 'hidden'}</p></div>
                {b.status === 'requested'
                  ? <Button size="sm" className="rounded-full" onClick={() => patchBanner(b.id, { status: 'approved', is_active: true }, 'Request approved')}>Approve</Button>
                  : <Button size="sm" variant="outline" className="rounded-full" onClick={() => patchBanner(b.id, { is_active: !b.is_active }, b.is_active ? 'Banner hidden' : 'Banner live')}>{b.is_active ? 'Hide' : 'Show'}</Button>}
                <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => deleteBanner(b.id)}>Delete</Button>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input value={auditQ} onChange={e=>setAuditQ(e.target.value)} placeholder="Search action, entity or actor" className="max-w-sm" aria-label="Search audit log"/>
            <Button variant="outline" size="sm" onClick={exportAudit} disabled={!filteredAudit.length}>Export filtered CSV</Button>
            <span className="text-xs text-muted-foreground">{filteredAudit.length} of {audit.length} loaded entries · newest 100</span>
          </div>
          <Card><CardContent className="p-0 divide-y divide-border">
            {filteredAudit.length === 0 && <p className="p-4 text-sm text-muted-foreground">No matching audit entries.</p>}
            {filteredAudit.map(a => (
              <div key={a.id} className="p-3 text-xs flex flex-col sm:flex-row sm:justify-between gap-1">
                <span><span className="font-mono">{a.action}</span> by {a.user_id ? nameOf(a.user_id) : 'system'}</span>
                <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
