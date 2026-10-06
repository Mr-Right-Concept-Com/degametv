import { useEffect, useRef, useState } from 'react';
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
import { Camera, Mic, MicOff, MonitorUp, Radio, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

// Provider adapters: each only describes how ingest works. No vendor is required.
const PROVIDERS: Record<string, { label: string; browser: boolean; hint: string }> = {
  whip: { label: 'Generic WHIP (browser)', browser: true, hint: 'Any WHIP endpoint — Cloudflare Stream, LiveKit, Mux and others expose one.' },
  rtmp: { label: 'Generic RTMP (OBS / encoder)', browser: false, hint: 'Use the server URL and key in OBS or any hardware encoder.' },
  hls: { label: 'Custom HLS playback only', browser: false, hint: 'You stream elsewhere; viewers play this HLS link.' },
  mux: { label: 'Mux', browser: true, hint: 'Paste the WHIP or RTMP URL and stream key from your Mux dashboard.' },
  cloudflare: { label: 'Cloudflare Stream', browser: true, hint: 'Paste the WebRTC (WHIP) or RTMPS URL from Cloudflare.' },
  livekit: { label: 'LiveKit', browser: true, hint: 'Use the LiveKit WHIP ingress URL and key.' },
};

const cfgSchema = z.object({
  provider: z.string(),
  ingest_url: z.string().trim().url('Enter a valid server URL').or(z.literal('')),
  stream_key: z.string().max(500),
  playback_url: z.string().trim().url('Enter a valid playback URL').or(z.literal('')),
  simulcast_targets: z.array(z.object({ name: z.string().min(1, 'Name each destination'), url: z.string().url('Destination URL is invalid'), key: z.string() })),
});

export default function StudioLive() {
  usePageTitle('Go Live — Studio');
  const { user } = useAuth();
  const [events, setEvents] = useState<{ id: string; title: string; lifecycle: string }[]>([]);
  const [screeningId, setScreeningId] = useState('');
  const [cfg, setCfg] = useState({ provider: 'whip', ingest_url: '', stream_key: '', playback_url: '', simulcast_targets: [] as { name: string; url: string; key: string }[] });
  const [showKey, setShowKey] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [lowerThird, setLowerThird] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [live, setLive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camVid = useRef<HTMLVideoElement>(document.createElement('video'));
  const scrVid = useRef<HTMLVideoElement>(document.createElement('video'));
  const camStream = useRef<MediaStream | null>(null);
  const scrStream = useRef<MediaStream | null>(null);
  const logoImg = useRef<HTMLImageElement | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const resourceUrl = useRef<string | null>(null);
  const overlay = useRef({ lowerThird: '', live: false });
  overlay.current = { lowerThird, live };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: content } = await supabase.from('content').select('id').eq('creator_id', user.id);
      const ids = (content || []).map(c => c.id);
      const { data } = ids.length ? await supabase.from('screenings').select('id, title, lifecycle').in('content_id', ids) : { data: [] };
      setEvents(data || []);
    })();
  }, [user]);

  useEffect(() => {
    if (!user || !screeningId) return;
    supabase.from('stream_configs').select('*').eq('user_id', user.id).eq('screening_id', screeningId).maybeSingle().then(({ data }) => {
      if (data) {
        setCfg({ provider: data.provider, ingest_url: data.ingest_url || '', stream_key: data.stream_key || '', playback_url: data.playback_url || '', simulcast_targets: (data.simulcast_targets as any) || [] });
        setLive(data.is_live);
      } else setCfg(c => ({ ...c, ingest_url: '', stream_key: '', playback_url: '', simulcast_targets: [] }));
    });
  }, [user, screeningId]);

  useEffect(() => {
    if (!logoUrl) { logoImg.current = null; return; }
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = logoUrl; img.onload = () => { logoImg.current = img; };
  }, [logoUrl]);

  // Compositor: screen share (if any) as background, camera as picture-in-picture, overlays on top
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = canvasRef.current; const ctx = c?.getContext('2d');
      if (c && ctx) {
        const css = getComputedStyle(document.documentElement);
        ctx.fillStyle = `hsl(${css.getPropertyValue('--background')})`;
        ctx.fillRect(0, 0, c.width, c.height);
        const hasScr = !!scrStream.current, hasCam = !!camStream.current;
        if (hasScr) ctx.drawImage(scrVid.current, 0, 0, c.width, c.height);
        if (hasCam) {
          if (hasScr) ctx.drawImage(camVid.current, c.width - 340, c.height - 210, 320, 180);
          else ctx.drawImage(camVid.current, 0, 0, c.width, c.height);
        }
        if (logoImg.current) ctx.drawImage(logoImg.current, 24, 24, 120, 120 * (logoImg.current.height / logoImg.current.width || 1));
        const lt = overlay.current.lowerThird;
        if (lt) {
          ctx.fillStyle = `hsl(${css.getPropertyValue('--primary')} / 0.9)`;
          ctx.fillRect(40, c.height - 120, Math.min(c.width - 80, 40 + lt.length * 20), 64);
          ctx.fillStyle = `hsl(${css.getPropertyValue('--primary-foreground')})`;
          ctx.font = 'bold 32px sans-serif'; ctx.fillText(lt, 60, c.height - 76);
        }
        if (overlay.current.live) {
          ctx.fillStyle = `hsl(${css.getPropertyValue('--destructive')})`;
          ctx.fillRect(c.width - 120, 24, 96, 36);
          ctx.fillStyle = `hsl(${css.getPropertyValue('--destructive-foreground')})`;
          ctx.font = 'bold 20px sans-serif'; ctx.fillText('LIVE', c.width - 98, 50);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => { stopAll(); }, []);

  const stopAll = () => {
    camStream.current?.getTracks().forEach(t => t.stop());
    scrStream.current?.getTracks().forEach(t => t.stop());
    pc.current?.close();
  };

  const toggleCam = async () => {
    if (camOn) { camStream.current?.getTracks().forEach(t => t.stop()); camStream.current = null; setCamOn(false); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
      s.getAudioTracks().forEach(t => (t.enabled = micOn));
      camStream.current = s; camVid.current.srcObject = s; camVid.current.muted = true; await camVid.current.play(); setCamOn(true);
    } catch { toast.error('Camera or microphone permission was denied'); }
  };
  const toggleMic = () => { const n = !micOn; camStream.current?.getAudioTracks().forEach(t => (t.enabled = n)); setMicOn(n); };
  const toggleScreen = async () => {
    if (screenOn) { scrStream.current?.getTracks().forEach(t => t.stop()); scrStream.current = null; setScreenOn(false); return; }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      s.getVideoTracks()[0].onended = () => { scrStream.current = null; setScreenOn(false); };
      scrStream.current = s; scrVid.current.srcObject = s; scrVid.current.muted = true; await scrVid.current.play(); setScreenOn(true);
    } catch { toast.error('Screen share was cancelled'); }
  };

  const saveConfig = async (isLive = live) => {
    const parsed = cfgSchema.safeParse(cfg);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return false; }
    if (!user || !screeningId) { toast.error('Choose an event first'); return false; }
    const { error } = await supabase.from('stream_configs').upsert({
      user_id: user.id, screening_id: screeningId, ...parsed.data, is_live: isLive, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,screening_id' });
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const setLifecycle = (action: string) => supabase.functions.invoke('manage-event', { body: { screeningId, action } });

  const goLive = async () => {
    if (!screeningId) { toast.error('Choose an event first'); return; }
    if (live) {
      if (resourceUrl.current) fetch(resourceUrl.current, { method: 'DELETE' }).catch(() => {});
      pc.current?.close(); pc.current = null; resourceUrl.current = null;
      await saveConfig(false); await setLifecycle('replay'); setLive(false); toast.success('Broadcast ended — event moved to replay');
      return;
    }
    const usesBrowser = PROVIDERS[cfg.provider]?.browser && cfg.ingest_url;
    if (usesBrowser) {
      if (!camOn && !screenOn) { toast.error('Turn on your camera or screen share first'); return; }
      try {
        const out = canvasRef.current!.captureStream(30);
        const audio = camStream.current?.getAudioTracks()[0] || scrStream.current?.getAudioTracks()[0];
        if (audio) out.addTrack(audio);
        const conn = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
        out.getTracks().forEach(t => conn.addTransceiver(t, { direction: 'sendonly' }));
        const offer = await conn.createOffer(); await conn.setLocalDescription(offer);
        const res = await fetch(cfg.ingest_url, {
          method: 'POST', body: offer.sdp, headers: { 'Content-Type': 'application/sdp', ...(cfg.stream_key ? { Authorization: `Bearer ${cfg.stream_key}` } : {}) },
        });
        if (!res.ok) throw new Error(`Stream server answered ${res.status}`);
        const loc = res.headers.get('Location'); if (loc) resourceUrl.current = new URL(loc, cfg.ingest_url).toString();
        await conn.setRemoteDescription({ type: 'answer', sdp: await res.text() });
        pc.current = conn;
      } catch (e) { toast.error(`Could not connect to the stream server: ${(e as Error).message}`); return; }
    }
    if (!(await saveConfig(true))) return;
    const { data, error } = await setLifecycle('live');
    if (error || data?.error) { toast.error(data?.error || 'Could not mark event live'); return; }
    setLive(true);
    toast.success(usesBrowser ? 'You are live from the browser' : 'Event marked live — start your encoder now');
  };

  const p = PROVIDERS[cfg.provider];

  return (
    <StudioLayout title="Go Live" description="Broadcast from your browser or any encoder — no vendor lock-in">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card><CardContent className="p-3 space-y-3">
            <canvas ref={canvasRef} width={1280} height={720} className="w-full aspect-video rounded-xl bg-muted" aria-label="Broadcast preview" />
            <div className="flex flex-wrap gap-2">
              <Button variant={camOn ? 'default' : 'outline'} className="rounded-full" onClick={toggleCam}><Camera className="w-4 h-4 mr-1" />{camOn ? 'Camera on' : 'Camera'}</Button>
              <Button variant="outline" className="rounded-full" onClick={toggleMic} disabled={!camOn} aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}>{micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}</Button>
              <Button variant={screenOn ? 'default' : 'outline'} className="rounded-full" onClick={toggleScreen}><MonitorUp className="w-4 h-4 mr-1" />{screenOn ? 'Sharing' : 'Share screen'}</Button>
              <Button variant={live ? 'destructive' : 'default'} className="rounded-full ml-auto" onClick={goLive}><Radio className="w-4 h-4 mr-1" />{live ? 'End broadcast' : 'Go live'}</Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div><Label htmlFor="lt">Lower-third text</Label><Input id="lt" maxLength={60} value={lowerThird} onChange={e => setLowerThird(e.target.value)} placeholder="Director Q&A — Live" /></div>
              <div><Label htmlFor="logo">Logo image URL</Label><Input id="logo" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" /></div>
            </div>
          </CardContent></Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Stream settings</CardTitle>
              <CardDescription>{p?.hint}</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Event</Label>
                <Select value={screeningId} onValueChange={setScreeningId}>
                  <SelectTrigger><SelectValue placeholder={events.length ? 'Choose event' : 'No events yet'} /></SelectTrigger>
                  <SelectContent>{events.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>Provider</Label>
                <Select value={cfg.provider} onValueChange={v => setCfg(c => ({ ...c, provider: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PROVIDERS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label htmlFor="ing">Stream server URL</Label><Input id="ing" value={cfg.ingest_url} onChange={e => setCfg(c => ({ ...c, ingest_url: e.target.value }))} placeholder="rtmp:// or https://…/whip" /></div>
              <div><Label htmlFor="key">Stream key</Label>
                <div className="flex gap-1"><Input id="key" type={showKey ? 'text' : 'password'} value={cfg.stream_key} onChange={e => setCfg(c => ({ ...c, stream_key: e.target.value }))} />
                  <Button variant="ghost" size="icon" aria-label={showKey ? 'Hide key' : 'Show key'} onClick={() => setShowKey(s => !s)}>{showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button></div></div>
              <div><Label htmlFor="pb">Viewer playback URL (HLS)</Label><Input id="pb" value={cfg.playback_url} onChange={e => setCfg(c => ({ ...c, playback_url: e.target.value }))} placeholder="https://…/index.m3u8" /></div>
              <div className="flex items-center justify-between"><Label>Simulcast destinations</Label>
                <Button size="sm" variant="ghost" onClick={() => setCfg(c => ({ ...c, simulcast_targets: [...c.simulcast_targets, { name: '', url: '', key: '' }] }))}><Plus className="w-3 h-3 mr-1" />Add</Button></div>
              {cfg.simulcast_targets.map((t, i) => (
                <div key={i} className="border border-border rounded-xl p-2 space-y-1">
                  <div className="flex gap-1"><Input aria-label="Destination name" placeholder="YouTube" value={t.name} onChange={e => setCfg(c => ({ ...c, simulcast_targets: c.simulcast_targets.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} />
                    <Button size="icon" variant="ghost" aria-label="Remove destination" onClick={() => setCfg(c => ({ ...c, simulcast_targets: c.simulcast_targets.filter((_, j) => j !== i) }))}><Trash2 className="w-4 h-4" /></Button></div>
                  <Input aria-label="Destination URL" placeholder="rtmp://a.rtmp.youtube.com/live2" value={t.url} onChange={e => setCfg(c => ({ ...c, simulcast_targets: c.simulcast_targets.map((x, j) => j === i ? { ...x, url: e.target.value } : x) }))} />
                  <Input aria-label="Destination key" type="password" placeholder="Stream key" value={t.key} onChange={e => setCfg(c => ({ ...c, simulcast_targets: c.simulcast_targets.map((x, j) => j === i ? { ...x, key: e.target.value } : x) }))} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Simulcast destinations are forwarded by your stream provider (e.g. restream/outputs). Add the same list there.</p>
              <Button className="rounded-full w-full" onClick={async () => { if (await saveConfig()) toast.success('Stream settings saved'); }}>Save settings</Button>
              {live && <Badge variant="destructive">On air</Badge>}
            </CardContent>
          </Card>
        </div>
      </div>
    </StudioLayout>
  );
}
