import { useCallback, useEffect, useState } from 'react';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { invokeFn } from '@/lib/invokeFn';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { z } from 'zod';
import { Loader2, Send } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

const TEMPLATES: Record<string, { subject: string; message: string; label: string }> = {
  starting_soon: { label: 'Event starting soon', subject: '{title} starts soon', message: 'Get ready — {title} begins shortly. Grab your ticket and join us live.' },
  doors_open: { label: 'Doors open', subject: 'Doors are open: {title}', message: 'The virtual doors are open for {title}. Come in and take your seat.' },
  replay_live: { label: 'Replay now live', subject: 'Missed it? {title} replay is live', message: 'The replay of {title} is available now for a limited time.' },
  custom: { label: 'Custom message', subject: '', message: '' },
};

const schema = z.object({
  screeningId: z.string().uuid('Choose an event'),
  subject: z.string().trim().min(3, 'Subject is too short').max(150),
  message: z.string().trim().min(3, 'Message is too short').max(5000),
});

export default function StudioFanBlast() {
  usePageTitle('Fan Blast — Studio');
  const { user } = useAuth();
  const userId = user?.id;
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [history, setHistory] = useState<Tables<'fan_blasts'>[]>([]);
  const [form, setForm] = useState({ screeningId: '', template: 'starting_soon', audience: 'all', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data: content } = await supabase.from('content').select('id').eq('creator_id', userId);
    const ids = (content || []).map(c => c.id);
    const { data: s } = ids.length ? await supabase.from('screenings').select('id, title').in('content_id', ids) : { data: [] };
    setEvents(s || []);
    const { data: h } = await supabase.from('fan_blasts').select('*').order('created_at', { ascending: false }).limit(50);
    setHistory(h || []);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);

  const applyTemplate = (template: string, screeningId = form.screeningId) => {
    const title = events.find(e => e.id === screeningId)?.title || 'our event';
    const t = TEMPLATES[template];
    setForm(f => ({ ...f, template, screeningId, subject: t.subject.replace('{title}', title), message: t.message.replace('{title}', title) }));
  };

  const send = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSending(true);
    const r = await invokeFn<{ sent: number; total: number }>('send-fan-blast', { ...form, ...parsed.data });
    if (!r.ok) toast.error(r.error);
    else if (!r.data) toast.error('The campaign service returned an invalid response.');
    else if (r.data.sent < r.data.total) toast.warning(`Sent to ${r.data.sent} of ${r.data.total} fans — some emails were not accepted.`);
    else toast.success(`Sent to ${r.data.sent} fans`);
    setSending(false);
    void load();
  };

  return (
    <StudioLayout title="Fan Blast" description="Email your waitlist and ticket holders">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">New campaign</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Event</Label>
              <Select value={form.screeningId} onValueChange={v => applyTemplate(form.template, v)}>
                <SelectTrigger><SelectValue placeholder={events.length ? 'Choose event' : 'No events yet'} /></SelectTrigger>
                <SelectContent>{events.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Template</Label>
                <Select value={form.template} onValueChange={v => applyTemplate(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TEMPLATES).map(([k, t]) => <SelectItem key={k} value={k}>{t.label}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>Audience</Label>
                <Select value={form.audience} onValueChange={v => setForm(f => ({ ...f, audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="waitlist">Notify-me list</SelectItem>
                    <SelectItem value="ticket_holders">Ticket holders</SelectItem>
                  </SelectContent>
                </Select></div>
            </div>
            <div><Label htmlFor="fb-sub">Subject</Label><Input id="fb-sub" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
            <div><Label htmlFor="fb-msg">Message</Label><Textarea id="fb-msg" rows={6} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} /></div>
            <Button className="rounded-full w-full" disabled={sending} onClick={send}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}Send blast
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 && <p className="text-sm text-muted-foreground">No campaigns sent yet.</p>}
            {history.map(h => (
              <div key={h.id} className="border border-border rounded-xl p-3 text-sm">
                <div className="flex justify-between gap-2"><span className="font-medium truncate">{h.subject}</span>
                  <Badge variant={h.status === 'failed' ? 'destructive' : 'secondary'}>{h.status}</Badge></div>
                <p className="text-xs text-muted-foreground mt-1">{h.recipients_count} recipients · {new Date(h.created_at).toLocaleString()}</p>
                {h.error && <p className="text-xs text-destructive mt-1">{h.error}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </StudioLayout>
  );
}