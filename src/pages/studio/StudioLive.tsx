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
import { Radio, Copy, ShieldCheck, Video } from 'lucide-react';

const provisionSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional(),
});
type EncoderGrant = { streamId: string; ingestUrl: string; streamKey: string; playbackUrl?: string | null; ingestProtocol: string; provider: string };

export default function StudioLive() {
  usePageTitle('Go Live — Studio');
  const { user } = useAuth();
  const [events, setEvents] = useState<{ id: string; title: string; lifecycle: string }[]>([]);
  const [screeningId, setScreeningId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [grant, setGrant] = useState<EncoderGrant | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scheduled' | 'ended'>('idle');

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data: content, error: contentError } = await supabase.from('content').select('id,title').eq('creator_id', user.id);
      if (contentError) { toast.error('Your creator events could not be loaded. Please retry.'); return; }
      const ids = (content || []).map(item => item.id);
      if (!ids.length) { if (active) setEvents([]); return; }
      const { data, error } = await supabase.from('screenings').select('id,title,lifecycle').in('content_id', ids);
      if (error) { toast.error('Your scheduled events could not be loaded.'); return; }
      if (active) setEvents(data || []);
    })();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const event = events.find(item => item.id === screeningId);
    if (event) setTitle(event.title);
  }, [events, screeningId]);

  const provision = async () => {
    const parsed = provisionSchema.safeParse({ title, description });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || 'Check the event details.'); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('media-provider-control', {
        body: { action: 'create_live', title: parsed.data.title, description: parsed.data.description, recordingEnabled: true },
      });
      if (error || !data?.success || typeof data.streamKey !== 'string' || typeof data.ingestUrl !== 'string') {
        toast.error(data?.error || 'A configured streaming provider is required before an encoder can be provisioned.');
        return;
      }
      setGrant({ streamId: data.streamId, ingestUrl: data.ingestUrl, streamKey: data.streamKey, playbackUrl: data.playbackUrl, ingestProtocol: data.ingestProtocol, provider: data.provider });
      setStatus('scheduled');
      toast.success('Encoder credentials issued. Copy and store the stream key securely; it is shown only once.');
    } catch {
      toast.error('Stream provisioning failed. Your event has not been marked live.');
    } finally { setBusy(false); }
  };

  const endStream = async () => {
    if (!grant) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('media-provider-control', { body: { action: 'stop_live', streamId: grant.streamId } });
      if (error || !data?.success || data.status !== 'ended') {
        toast.error(data?.error || 'The provider did not confirm stream termination. The event remains unchanged.');
        return;
      }
      setStatus('ended');
      setGrant(null);
      toast.success('Provider confirmed stream termination. Recording/replay processing is not yet published.');
    } finally { setBusy(false); }
  };

  const copy = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); toast.success(label + ' copied.'); }
    catch { toast.error('Clipboard access is unavailable. Select and copy the value manually.'); }
  };

  return (
    <StudioLayout title="Go Live" description="Provision a protected encoder stream for OBS, vMix and other RTMP/RTMPS encoders.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" /> Broadcast control</CardTitle>
              <CardDescription>Stream state is controlled by the media provider. DeGameTV will not report a stream as live based on a browser-side button.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={status === 'ended' ? 'secondary' : status === 'scheduled' ? 'default' : 'outline'}>{status === 'scheduled' ? 'Provisioned — awaiting encoder ingest' : status === 'ended' ? 'Provider confirmed ended' : 'Not provisioned'}</Badge>
              </div>
              {grant ? <div className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between"><Label>Encoder server URL</Label><Button size="sm" variant="outline" onClick={() => copy(grant.ingestUrl, 'Server URL')}><Copy className="mr-1 h-4 w-4" />Copy</Button></div>
                <Input readOnly value={grant.ingestUrl} />
                <div className="flex items-center justify-between"><Label>One-time stream key</Label><Button size="sm" variant="outline" onClick={() => copy(grant.streamKey, 'Stream key')}><Copy className="mr-1 h-4 w-4" />Copy</Button></div>
                <Input readOnly type="password" value={grant.streamKey} />
                <p className="text-sm text-muted-foreground">Add these values to OBS or vMix as a custom RTMP/RTMPS destination. The stream key is not saved in your editable stream settings. Keep it private.</p>
                <Button variant="destructive" disabled={busy} onClick={endStream}><Radio className="mr-2 h-4 w-4" />End stream with provider</Button>
              </div> : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground"><ShieldCheck className="mx-auto mb-2 h-8 w-8" />Provisioning requires an active, validated live-streaming provider binding. No credentials are fabricated or stored in browser configuration.</div>}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Create encoder stream</CardTitle><CardDescription>Provision a server-managed stream for an existing creator event.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Creator event</Label><Select value={screeningId} onValueChange={setScreeningId}><SelectTrigger><SelectValue placeholder={events.length ? 'Choose event' : 'No events available'} /></SelectTrigger><SelectContent>{events.map(event => <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>)}</SelectContent></Select></div>
            <div><Label htmlFor="live-title">Stream title</Label><Input id="live-title" value={title} maxLength={180} onChange={event => setTitle(event.target.value)} /></div>
            <div><Label htmlFor="live-description">Description</Label><Input id="live-description" value={description} maxLength={2000} onChange={event => setDescription(event.target.value)} /></div>
            <Button className="w-full" disabled={busy || !screeningId || !!grant} onClick={provision}>{busy ? 'Provisioning…' : 'Provision secure encoder'}</Button>
            <p className="text-xs text-muted-foreground">Supports standard RTMP/RTMPS encoder output. Browser WHIP publishing is intentionally unavailable until a provider-backed WHIP contract is configured.</p>
          </CardContent>
        </Card>
      </div>
    </StudioLayout>
  );

}
