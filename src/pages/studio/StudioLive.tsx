import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRuntimeConfig } from '@/contexts/RuntimeConfigContext';
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
  const runtime = useRuntimeConfig();
  const [events, setEvents] = useState<{ id: string; title: string; lifecycle: string; base_price: number | null; base_currency: string | null; replay_base_price: number | null; live_price_ngn: number | null; live_price_usd: number | null; replay_price_ngn: number | null; replay_price_usd: number | null; replay_access_hours: number }[]>([]);
  const [screeningId, setScreeningId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [grant, setGrant] = useState<EncoderGrant | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scheduled' | 'ended'>('idle');
  const [broadcastLifecycle, setBroadcastLifecycle] = useState<{ lifecycle_status: string; reconnect_grace_expires_at: string | null; actual_started_at: string | null; actual_ended_at: string | null } | null>(null);
  const [replayDraftId, setReplayDraftId] = useState<string | null>(null);
  const [basePrice, setBasePrice] = useState('');
  const [replayBasePrice, setReplayBasePrice] = useState('');
  const [liveNgn, setLiveNgn] = useState('');
  const [liveUsd, setLiveUsd] = useState('');
  const [replayNgn, setReplayNgn] = useState('');
  const [replayUsd, setReplayUsd] = useState('');
  const [replayHours, setReplayHours] = useState('48');

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data: content, error: contentError } = await supabase.from('content').select('id,title').eq('creator_id', user.id);
      if (contentError) { toast.error('Your creator events could not be loaded. Please retry.'); return; }
      const ids = (content || []).map(item => item.id);
      if (!ids.length) { if (active) setEvents([]); return; }
      const { data, error } = await supabase.from('screenings').select('id,title,lifecycle,base_price,base_currency,replay_base_price,live_price_ngn,live_price_usd,replay_price_ngn,replay_price_usd,replay_access_hours').in('content_id', ids);
      if (error) { toast.error('Your scheduled events could not be loaded.'); return; }
      if (active) setEvents(data || []);
    })();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const event = events.find(item => item.id === screeningId);
    if (event) { setTitle(event.title); setBasePrice(event.base_price == null ? '' : String(event.base_price)); setReplayBasePrice(event.replay_base_price == null ? '' : String(event.replay_base_price)); setLiveNgn(event.live_price_ngn == null ? '' : String(event.live_price_ngn)); setLiveUsd(event.live_price_usd == null ? '' : String(event.live_price_usd)); setReplayNgn(event.replay_price_ngn == null ? '' : String(event.replay_price_ngn)); setReplayUsd(event.replay_price_usd == null ? '' : String(event.replay_price_usd)); setReplayHours(String(event.replay_access_hours || 48)); }
  }, [events, screeningId]);

  useEffect(() => {
    if (!user?.id || !screeningId) { setBroadcastLifecycle(null); return; }
    let active = true;
    const refreshLifecycle = async () => {
      const { data, error } = await (supabase as any).rpc('get_my_live_stream_lifecycle', { p_screening_id: screeningId });
      if (active && !error) setBroadcastLifecycle(Array.isArray(data) ? (data[0] || null) : (data || null));
    };
    void refreshLifecycle();
    const timer = window.setInterval(refreshLifecycle, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [screeningId, user?.id]);

  const savePricing = async () => {
    const hours = Number(replayHours);
    const event = events.find(item => item.id === screeningId);
    if (!Number.isInteger(hours) || hours < 1 || hours > 8760 || !screeningId || !event) { toast.error('Choose an event and a replay access duration from 1 to 8760 hours.'); return; }
    const baseMode = event.base_price !== null;
    const base = basePrice.trim() === '' ? null : Number(basePrice);
    const replay = replayBasePrice.trim() === '' ? null : Number(replayBasePrice);
    const legacy = [liveNgn, liveUsd, replayNgn, replayUsd].map(value => value.trim() === '' ? null : Number(value));
    if (baseMode ? base === null || !Number.isFinite(base) || base < 0 || (replay !== null && (!Number.isFinite(replay) || replay < 0)) : legacy.some(value => value !== null && (!Number.isFinite(value) || value < 0))) {
      toast.error('Prices must be valid non-negative amounts.'); return;
    }
    if (baseMode && !event.base_currency) { toast.error('This event has no retained base currency. Contact platform support before editing its price.'); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-live-pricing', { body: baseMode ? {
        screeningId, basePrice: base, baseCurrency: event.base_currency, replayBasePrice: replay, replayAccessHours: hours,
      } : {
        screeningId, livePriceNgn: legacy[0], livePriceUsd: legacy[1], replayPriceNgn: legacy[2], replayPriceUsd: legacy[3], replayAccessHours: hours,
      }});
      if (error || !data?.success) { toast.error(data?.error || 'Pricing could not be saved.'); return; }
      toast.success('Live admission and replay pricing saved.');
    } finally { setBusy(false); }
  };

  const provision = async () => {
    const parsed = provisionSchema.safeParse({ title, description });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || 'Check the event details.'); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('media-provider-control', {
        body: { action: 'create_live', screeningId, title: parsed.data.title, description: parsed.data.description, recordingEnabled: true },
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
      setReplayDraftId(data.replayDraft?.contentId || null);
      setGrant(null);
      if (data.replayDraft?.contentId) toast.success(data.replayDraft.recordingStatus === 'ready' ? 'Live ended. A replay draft is ready in your catalogue.' : 'Live ended. A replay draft was added to your catalogue; recording is processing.');
      else toast.success(data.message || 'Live ended. The replay draft could not be reconciled automatically.');
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
                {broadcastLifecycle && <Badge variant="outline" className="font-mono text-xs">{broadcastLifecycle.lifecycle_status .replace(/_/g, ' ')}</Badge>}
              </div>
              {replayDraftId && <Button asChild variant="outline"><Link to="/studio/movies">Open replay draft in catalogue</Link></Button>}
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
            <div className="border-t pt-4 space-y-3">
              <div><p className="font-medium text-sm">Paid access</p><p className="text-xs text-muted-foreground">Live admission and replay are priced separately.</p></div>
              {events.find(event => event.id === screeningId)?.base_price !== null && events.find(event => event.id === screeningId)?.base_price !== undefined ? <div className="space-y-3">
                <div><Label htmlFor="live-base">Admission price ({events.find(event => event.id === screeningId)?.base_currency || runtime.config?.baseCurrency || 'base currency'})</Label><Input id="live-base" inputMode="decimal" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0 = free"/></div>
                <div><Label htmlFor="replay-base">Separate replay price ({events.find(event => event.id === screeningId)?.base_currency || runtime.config?.baseCurrency || 'base currency'})</Label><Input id="replay-base" inputMode="decimal" value={replayBasePrice} onChange={e => setReplayBasePrice(e.target.value)} placeholder="Leave blank when included or free"/></div>
                <p className="text-xs text-muted-foreground">Creator prices remain in the event's immutable base currency. Viewer checkout converts using the active FX provider and their selected country currency.</p>
              </div> : <div className="space-y-2">
                <p className="text-xs text-amber-600">Legacy regional pricing. Existing NGN/USD prices are retained for this event; new events use the configurable platform base currency.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label htmlFor="live-ngn">Legacy live price (NGN)</Label><Input id="live-ngn" inputMode="decimal" value={liveNgn} onChange={e => setLiveNgn(e.target.value)} placeholder="0 = free" /></div>
                  <div><Label htmlFor="live-usd">Legacy live price (USD)</Label><Input id="live-usd" inputMode="decimal" value={liveUsd} onChange={e => setLiveUsd(e.target.value)} placeholder="0 = free" /></div>
                  <div><Label htmlFor="replay-ngn">Legacy replay price (NGN)</Label><Input id="replay-ngn" inputMode="decimal" value={replayNgn} onChange={e => setReplayNgn(e.target.value)} placeholder="Not available" /></div>
                  <div><Label htmlFor="replay-usd">Legacy replay price (USD)</Label><Input id="replay-usd" inputMode="decimal" value={replayUsd} onChange={e => setReplayUsd(e.target.value)} placeholder="Not available" /></div>
                </div>
              </div>}
              <div><Label htmlFor="replay-hours">Replay access duration (hours)</Label><Input id="replay-hours" type="number" min="1" max="8760" value={replayHours} onChange={e => setReplayHours(e.target.value)} /></div>
              <Button className="w-full" variant="outline" disabled={busy || !screeningId} onClick={savePricing}>Save access pricing</Button>
            </div>
            <Button className="w-full" disabled={busy || !screeningId || !!grant} onClick={provision}>{busy ? 'Provisioning…' : 'Provision secure encoder'}</Button>
            <p className="text-xs text-muted-foreground">Supports standard RTMP/RTMPS encoder output. Browser WHIP publishing is intentionally unavailable until a provider-backed WHIP contract is configured.</p>
          </CardContent>
        </Card>
      </div>
    </StudioLayout>
  );

}
