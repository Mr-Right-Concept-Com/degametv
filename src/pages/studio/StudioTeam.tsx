import { useEffect, useState } from 'react';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { z } from 'zod';
import { Trash2, UserPlus, Megaphone } from 'lucide-react';

const ROLES = { producer: 'Producer', live_operator: 'Live Operator', accountant: 'Accountant', viewer: 'Viewer' } as const;
const inviteSchema = z.object({ email: z.string().trim().email('Enter a valid email').max(255), role: z.enum(['producer', 'live_operator', 'accountant', 'viewer']) });
const bannerSchema = z.object({
  screeningId: z.string().uuid('Choose an event'),
  imageUrl: z.string().trim().url('Enter a valid image URL'),
  placement: z.enum(['home', 'cinema', 'all']),
});

export default function StudioTeam() {
  usePageTitle('Team & Promotion — Studio');
  const { user } = useAuth();
  const [acct, setAcct] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invite, setInvite] = useState({ email: '', role: 'producer' });
  const [events, setEvents] = useState<{ id: string; title: string; slug: string; banner_url: string | null }[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [req, setReq] = useState({ screeningId: '', imageUrl: '', placement: 'home' });

  const load = async () => {
    if (!user) return;
    const [{ data: a }, { data: m }, { data: c }, { data: b }] = await Promise.all([
      supabase.from('studio_accounts').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('studio_members').select('*').eq('owner_id', user.id).order('created_at'),
      supabase.from('content').select('id').eq('creator_id', user.id),
      supabase.from('promo_banners').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
    ]);
    setAcct(a); setMembers(m || []); setBanners(b || []);
    const ids = (c || []).map(x => x.id);
    if (ids.length) {
      const { data: s } = await supabase.from('screenings').select('id, title, slug, banner_url').in('content_id', ids);
      setEvents(s || []);
    }
  };
  useEffect(() => { load(); }, [user]);

  const isBusiness = acct?.tier === 'business' && acct?.status === 'approved';
  const active = members.filter(m => m.status !== 'removed');

  const sendInvite = async () => {
    const p = inviteSchema.safeParse(invite);
    if (!p.success) { toast.error(p.error.errors[0].message); return; }
    const { error } = await supabase.from('studio_members').insert({ owner_id: user!.id, member_email: p.data.email.toLowerCase(), role: p.data.role });
    if (error) { toast.error(error.message.includes('duplicate') ? 'That person is already invited' : error.message); return; }
    toast.success(`Invited ${p.data.email}. They join automatically when they sign in with that email.`);
    setInvite({ email: '', role: 'producer' }); load();
  };

  const updateRole = async (id: string, role: string) => {
    const { error } = await supabase.from('studio_members').update({ role }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Role updated'); load(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from('studio_members').update({ status: 'removed' }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Seat freed'); load(); }
  };

  const requestBanner = async () => {
    const p = bannerSchema.safeParse(req);
    if (!p.success) { toast.error(p.error.errors[0].message); return; }
    const ev = events.find(e => e.id === p.data.screeningId)!;
    const { error } = await supabase.from('promo_banners').insert({
      owner_id: user!.id, screening_id: ev.id, title: ev.title, image_url: p.data.imageUrl,
      link_url: `/movie/${ev.slug}`, placement: p.data.placement, is_active: false,
    } as any);
    if (error) toast.error(error.message); else { toast.success('Banner request sent for admin approval'); setReq({ screeningId: '', imageUrl: '', placement: 'home' }); load(); }
  };

  return (
    <StudioLayout title="Team & Promotion" description="Manage team seats and request homepage banners">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Team seats</CardTitle>
            <CardDescription>{isBusiness ? `${active.length} of ${acct.seats} seats used` : 'Team seats are available on an approved Business tier.'}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {isBusiness && (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1"><Label htmlFor="inv-email" className="sr-only">Email</Label>
                  <Input id="inv-email" placeholder="colleague@company.com" value={invite.email} onChange={e => setInvite(v => ({ ...v, email: e.target.value }))} /></div>
                <Select value={invite.role} onValueChange={v => setInvite(x => ({ ...x, role: v }))}>
                  <SelectTrigger className="sm:w-40" aria-label="Role"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Button className="rounded-full" disabled={active.length >= (acct.seats || 0)} onClick={sendInvite}><UserPlus className="w-4 h-4 mr-1" />Invite</Button>
              </div>
            )}
            {active.map(m => (
              <div key={m.id} className="flex items-center gap-2 border border-border rounded-xl p-2">
                <div className="flex-1 min-w-0"><p className="text-sm truncate">{m.member_email}</p>
                  <Badge variant={m.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{m.status}</Badge></div>
                <Select value={m.role} onValueChange={v => updateRole(m.id, v)}>
                  <SelectTrigger className="w-36 h-8" aria-label={`Role for ${m.member_email}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="icon" variant="ghost" aria-label={`Remove ${m.member_email}`} onClick={() => remove(m.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Request a banner placement</CardTitle>
            <CardDescription>Wide images (3:1) look best. An admin reviews every request.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Select value={req.screeningId} onValueChange={v => setReq(r => ({ ...r, screeningId: v, imageUrl: r.imageUrl || events.find(e => e.id === v)?.banner_url || '' }))}>
              <SelectTrigger aria-label="Event"><SelectValue placeholder={events.length ? 'Choose event' : 'No events yet'} /></SelectTrigger>
              <SelectContent>{events.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
            </Select>
            <div><Label htmlFor="bn-img">Banner image URL</Label><Input id="bn-img" value={req.imageUrl} onChange={e => setReq(r => ({ ...r, imageUrl: e.target.value }))} /></div>
            <Select value={req.placement} onValueChange={v => setReq(r => ({ ...r, placement: v }))}>
              <SelectTrigger aria-label="Placement"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="home">Homepage</SelectItem><SelectItem value="cinema">Cinema lobby</SelectItem><SelectItem value="all">Both</SelectItem></SelectContent>
            </Select>
            <Button className="rounded-full w-full" onClick={requestBanner}><Megaphone className="w-4 h-4 mr-1" />Request placement</Button>
            {banners.map(b => (
              <div key={b.id} className="flex justify-between text-sm border border-border rounded-xl p-2">
                <span className="truncate">{b.title} · {b.placement}</span>
                <Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'live' : (b.status || 'requested')}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </StudioLayout>
  );
}
