import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Hls from 'hls.js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { EventContribution } from '@/components/events/EventContribution';
import { EventContributionFeed } from '@/components/events/EventContributionFeed';
import { LiveGiftOverlay } from '@/components/events/LiveGiftOverlay';

export default function LiveWatch() {
  usePageTitle('Watch Live Event');
  const { streamId } = useParams<{ streamId: string }>();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'replay' ? 'replay' : 'live';
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [currency, setCurrency] = useState('NGN');

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    supabase.from('profiles').select('preferred_currency').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (active && data?.preferred_currency) setCurrency(data.preferred_currency); });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    const authorize = async () => {
      if (!user) { setError('Sign in to access your purchased event.'); setLoading(false); return; }
      if (!streamId) { setError('The event link is invalid.'); setLoading(false); return; }
      const { data, error: invokeError } = await supabase.functions.invoke('authorize-live-playback', { body: { streamId, mode } });
      if (!active) return;
      if (invokeError || !data?.success || typeof data.playbackUrl !== 'string') {
        setError(data?.error || invokeError?.message || 'Your ticket could not authorize playback.');
        setLoading(false);
        return;
      }
      const video = videoRef.current;
      if (!video) { setError('Video player is unavailable.'); setLoading(false); return; }
      setExpiresAt(data.expiresAt);
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: mode === 'live' });
        hlsRef.current = hls;
        hls.loadSource(data.playbackUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_event, detail) => {
          if (detail.fatal && active) setError('The secure stream could not be loaded. Please refresh and try again.');
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = data.playbackUrl;
      } else {
        setError('This browser does not support secure HLS playback.');
      }
      setLoading(false);
    };
    void authorize();
    return () => { active = false; hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [streamId, mode, user?.id]);

  return <MainLayout>
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-4">
      <div><p className="text-xs uppercase tracking-widest text-muted-foreground">{mode === 'live' ? 'Live event' : 'On-demand replay'}</p><h1 className="text-2xl font-bold">Secure event playback</h1></div>
      {error ? <Card><CardContent className="p-8 text-center space-y-3"><AlertCircle className="mx-auto h-10 w-10 text-destructive"/><p className="font-medium">{error}</p><Button asChild><Link to="/tickets">Return to My Tickets</Link></Button></CardContent></Card> :
        <div className="overflow-hidden rounded-2xl bg-black aspect-video relative">
          <video ref={videoRef} controls playsInline autoPlay className="h-full w-full" />
          {mode === "live" && streamId && <LiveGiftOverlay streamId={streamId} />}
          {loading && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white"><Loader2 className="h-8 w-8 animate-spin"/><span className="text-sm">Checking ticket and authorizing playback…</span></div>}
        </div>}
      {!error && !loading && streamId && <EventContribution liveStreamId={streamId} currency={currency} />}
      {!error && !loading && streamId && <EventContributionFeed liveStreamId={streamId} />}
      {!error && !loading && <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-green-600"/> Playback is protected by your ticket. This temporary playback grant expires {expiresAt ? new Date(expiresAt).toLocaleTimeString() : 'soon'}.</p>}
      <Button variant="outline" asChild><Link to="/tickets">Back to My Tickets</Link></Button>
    </div>
  </MainLayout>;
}
