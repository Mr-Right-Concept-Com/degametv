import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Radio, PlayCircle, Bell, Archive, XCircle } from 'lucide-react';

interface Props {
  screeningId: string; slug: string; lifecycle: string; screeningDate: string | null;
  replayPriceNgn?: number | null; replayPriceUsd?: number | null; replayAccessHours?: number | null;
}

const emailSchema = z.string().trim().email('Enter a valid email').max(255);

function useCountdown(target: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  if (!target) return null;
  const d = Math.max(0, new Date(target).getTime() - now);
  return { d: Math.floor(d / 864e5), h: Math.floor(d / 36e5) % 24, m: Math.floor(d / 6e4) % 60, s: Math.floor(d / 1e3) % 60, done: d === 0 };
}

export function LifecycleBanner(p: Props) {
  const cd = useCountdown(p.screeningDate);
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  const join = async () => {
    const r = emailSchema.safeParse(email);
    if (!r.success) return toast.error(r.error.issues[0].message);
    const { error } = await supabase.from('event_waitlist').insert({ screening_id: p.screeningId, email: r.data });
    if (error && error.code !== '23505') return toast.error('Could not join waitlist');
    setJoined(true); toast.success("You're on the list — we'll email you.");
  };

  const waitlist = (label: string) => joined
    ? <p className="text-sm font-medium">You're on the waitlist ✓</p>
    : (
      <div className="flex gap-2 w-full max-w-md">
        <Input type="email" aria-label="Email for notifications" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        <Button onClick={join} className="rounded-full shrink-0"><Bell className="w-4 h-4 mr-1" />{label}</Button>
      </div>
    );

  const wrap = 'container mx-auto px-4 my-6 rounded-2xl border border-border bg-card p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between';

  if (p.lifecycle === 'live') return (
    <section className={wrap} aria-label="Live now">
      <div className="flex items-center gap-3">
        <Badge className="bg-destructive text-destructive-foreground animate-pulse"><Radio className="w-3 h-3 mr-1" />LIVE</Badge>
        <p className="font-semibold">Premiering now — buy and check in instantly.</p>
      </div>
      <Button asChild size="lg" className="rounded-full"><Link to={`/buy/${p.slug}`}>Buy ticket & enter</Link></Button>
    </section>
  );

  if (p.lifecycle === 'replay') return (
    <section className={wrap} aria-label="Replay available">
      <div>
        <Badge variant="secondary" className="mb-1"><PlayCircle className="w-3 h-3 mr-1" />REPLAY</Badge>
        <p className="font-semibold">Watch on demand · {p.replayAccessHours || 48}h access from first play</p>
        <p className="text-sm text-muted-foreground">₦{Number(p.replayPriceNgn || 0).toLocaleString()} Nigeria · ${p.replayPriceUsd || 0} International</p>
      </div>
      <Button asChild size="lg" className="rounded-full"><Link to={`/buy/${p.slug}`}>Rent replay</Link></Button>
    </section>
  );

  if (p.lifecycle === 'archived' || p.lifecycle === 'cancelled') return (
    <section className={wrap} aria-label="Event ended">
      <div className="flex items-center gap-3">
        {p.lifecycle === 'cancelled' ? <XCircle className="w-6 h-6 text-destructive" /> : <Archive className="w-6 h-6 text-muted-foreground" />}
        <div>
          <p className="font-semibold">{p.lifecycle === 'cancelled' ? 'This event was cancelled — all ticket holders have been refunded.' : 'This premiere has ended.'}</p>
          <p className="text-sm text-muted-foreground">Join the list to hear about re-runs.</p>
        </div>
      </div>
      {waitlist('Notify me')}
    </section>
  );

  return (
    <section className={wrap} aria-label="Upcoming premiere">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Premieres in</p>
        {cd && !cd.done ? (
          <div className="flex gap-3 font-mono text-2xl font-bold" role="timer">
            {[['d', cd.d], ['h', cd.h], ['m', cd.m], ['s', cd.s]].map(([k, v]) => <span key={k as string}>{String(v).padStart(2, '0')}<span className="text-xs text-muted-foreground ml-0.5">{k}</span></span>)}
          </div>
        ) : <p className="font-semibold">Date to be announced</p>}
      </div>
      {waitlist('Notify me')}
    </section>
  );
}
