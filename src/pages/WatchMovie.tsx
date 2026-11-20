import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Hls from 'hls.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Share2, Home, Clock, Mail, Shield, Globe, Tv2, PlayCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePageTitle } from '@/hooks/usePageTitle';
import { EventContribution } from '@/components/events/EventContribution';
import { EventContributionFeed } from '@/components/events/EventContributionFeed';
import { z } from 'zod';

const watchTicketSchema = z.object({
  email: z.string().email().optional().nullable(),
  movieTitle: z.string(),
  expiresAt: z.string().datetime({ offset: true }),
  contentId: z.string().uuid().optional().nullable(),
  currency: z.string().optional().nullable(),
  streamsRemaining: z.number().int().nonnegative().optional().nullable(),
  maxStreams: z.number().int().positive().optional().nullable(),
  country: z.string().optional().nullable(),
}).passthrough();
const watchValidationSchema = z.object({ success: z.literal(true), ticket: watchTicketSchema });
const playbackGrantSchema = z.object({ success: z.literal(true), playbackUrl: z.string().url() });

export default function WatchMovie() {
  usePageTitle('Watch');
  const { watchCode } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<z.infer<typeof watchTicketSchema> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previousPosition = useRef(0);

  useEffect(() => {
    let active = true;
    const validateTicket = async () => {
      try {
        const email = searchParams.get('email');
        const { data, error: fnError } = await supabase.functions.invoke('validate-watch-code', {
          body: { watchCode, email },
        });
        if (!active) return;
        const validation = watchValidationSchema.safeParse(data as unknown);
        if (fnError || !validation.success) {
          setError('Invalid or expired watch link. Please check your email for a valid link.');
          return;
        }
        const validatedTicket = validation.data.ticket;
        if (searchParams.get('checkin') === '1') toast.success('Checked in — enjoy the show! Your pass is saved under My Tickets.');
        setTicket(validatedTicket);

        const playbackEmail = String(validatedTicket.email || email || '').trim().toLowerCase();
        if (!playbackEmail) {
          setPlaybackError('The ticket email is missing. Open the original secure ticket link or contact support.');
          return;
        }
        const sessionKey = 'degame:watch-session:' + String(watchCode);
        let currentSession: string;
        try {
          currentSession = sessionStorage.getItem(sessionKey) || crypto.randomUUID();
          sessionStorage.setItem(sessionKey, currentSession);
        } catch {
          currentSession = crypto.randomUUID();
        }
        setSessionId(currentSession);
        const { data: grant, error: grantError } = await supabase.functions.invoke('get-playback-url', {
          body: { watchCode, email: playbackEmail, sessionId: currentSession },
        });
        if (!active) return;
        const playbackGrant = playbackGrantSchema.safeParse(grant as unknown);
        if (grantError || !playbackGrant.success) {
          setPlaybackError(grantError?.message || 'Secure playback could not be authorized. Your ticket remains valid; please retry or contact support.');
          return;
        }
        setPlaybackUrl(playbackGrant.data.playbackUrl);
        setPlaybackError(null);
      } catch {
        if (active) setError('Unable to validate your ticket. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    if (watchCode) void validateTicket();
    else { setError('No watch code provided.'); setLoading(false); }
    return () => { active = false; };
  }, [watchCode, searchParams]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;
    const isHls = /\.m3u8(?:\?|$)/i.test(playbackUrl);
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 60 });
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setPlaybackError('The secure stream encountered a playback error. Reload the ticket page to request a fresh playback grant.');
      });
      return () => { hls.destroy(); video.pause(); video.removeAttribute('src'); video.load(); };
    }
    if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      setPlaybackError('This browser cannot play the secure HLS stream. Try Safari or a supported browser.');
      return;
    }
    video.src = playbackUrl;
    return () => { video.pause(); video.removeAttribute('src'); video.load(); };
  }, [playbackUrl]);

  useEffect(() => {
    if (!ticket || !playbackUrl || !sessionId || !watchCode) return;
    const email = String(ticket.email || searchParams.get('email') || '').trim().toLowerCase();
    if (!email) return;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) return;
      const position = Math.max(0, Math.floor(video.currentTime));
      const deltaSeconds = Math.max(0, Math.min(90, position - previousPosition.current));
      previousPosition.current = position;
      void supabase.functions.invoke('record-watch-heartbeat', {
        body: { watchCode, email, sessionId, deltaSeconds, position },
      });
    }, 30000);
    return () => {
      window.clearInterval(timer);
      const video = videoRef.current;
      void supabase.functions.invoke('record-watch-heartbeat', {
        body: { watchCode, email, sessionId, release: true, deltaSeconds: 0, position: Math.max(0, Math.floor(video?.currentTime || 0)) },
      });
    };
  }, [ticket, playbackUrl, sessionId, watchCode, searchParams]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: ticket?.movieTitle, url });
      else { await navigator.clipboard.writeText(url); toast.success('Link copied to clipboard'); }
    } catch { toast.message('Copy the ticket link from your browser address bar to share it securely.'); }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center animate-fade-in"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-muted-foreground">Validating your ticket and authorizing secure playback...</p></div></div>;
  }

  if (error || !ticket) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-4"><Card className="max-w-md w-full animate-fade-in"><CardContent className="p-8 text-center"><div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8 text-destructive" /></div><h2 className="text-xl font-bold mb-2">Access Denied</h2><p className="text-muted-foreground mb-6 text-sm">{error}</p><Button className="w-full rounded-full" asChild><Link to="/"><Home className="w-4 h-4 mr-2" /> Back to Home</Link></Button></CardContent></Card></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        <div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl sm:text-3xl font-bold mb-1">{ticket.movieTitle}</h1><p className="text-sm text-muted-foreground">Valid until {new Date(ticket.expiresAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p></div><Button variant="outline" size="sm" className="rounded-full shrink-0" onClick={handleShare}><Share2 className="w-4 h-4 mr-1.5"/>Share</Button></div>
        <div className="relative aspect-video overflow-hidden rounded-2xl border bg-black shadow-2xl">
          {playbackUrl ? <video ref={videoRef} controls playsInline preload="metadata" className="h-full w-full bg-black" aria-label={"Secure playback: "+ticket.movieTitle}/> :
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white"><PlayCircle className="h-14 w-14 text-white/70"/><h2 className="text-lg font-semibold">Secure playback is not currently available</h2><p className="max-w-xl text-sm text-white/70">{playbackError || 'Your ticket remains valid. The platform will not expose an unprotected master-video URL.'}</p><Button variant="outline" className="border-white/40 text-white hover:bg-white/10" onClick={()=>window.location.reload()}>Retry secure playback</Button></div>}
          {playbackUrl && ticket.contentId && <EventContribution contentId={ticket.contentId} currency={ticket.currency || 'NGN'} overlay />}
        </div>
        {playbackError && playbackUrl && <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-muted-foreground">{playbackError}</p>}
        {ticket.contentId && <section className="space-y-3"><h2 className="text-lg font-semibold">Support this title while watching</h2>{!playbackUrl && <EventContribution contentId={ticket.contentId} currency={ticket.currency || "NGN"} />}<EventContributionFeed contentId={ticket.contentId}/></section>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {icon:Mail,label:'Email',value:ticket.email,color:'text-primary'},
            {icon:Clock,label:'Access ends',value:new Date(ticket.expiresAt).toLocaleDateString(),color:'text-muted-foreground'},
            {icon:Tv2,label:'Streams left',value:String(ticket.streamsRemaining??'∞')+' of '+String(ticket.maxStreams??'∞'),color:'text-accent'},
            {icon:Shield,label:'Delivery',value:playbackUrl?'Secure playback':'Provider unavailable',color:'text-muted-foreground'},
          ].map(item=><div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"><div className={'w-9 h-9 rounded-full bg-card flex items-center justify-center '+item.color}><item.icon className="w-4 h-4"/></div><div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</p><p className="text-xs sm:text-sm font-medium truncate">{item.value}</p></div></div>)}
        </div>
        {ticket.country&&<div className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/30 rounded-full px-3 py-1"><Globe className="w-3 h-3"/>Streaming from {ticket.country}</div>}
        <div className="flex gap-3 pt-2"><Button variant="outline" className="rounded-full flex-1 sm:flex-none" asChild><Link to="/tickets">My Tickets</Link></Button><Button variant="outline" className="rounded-full flex-1 sm:flex-none" asChild><Link to="/">Browse More</Link></Button></div>
      </div>
    </div>
  );
}
