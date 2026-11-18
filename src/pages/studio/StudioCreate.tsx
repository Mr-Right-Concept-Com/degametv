import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Film, Clapperboard, Radio, CalendarDays, ArrowUpRight, Upload, Sparkles, ShieldCheck, Globe2, CircleDollarSign } from 'lucide-react';
import { z } from 'zod';

const publishingContextSchema = z.object({
  format: z.enum(['movie', 'series', 'episode', 'short', 'trailer', 'vod', 'live']),
  releasePath: z.enum(['on_demand', 'premiere', 'live_event', 'festival']),
  territory: z.enum(['worldwide', 'africa', 'nigeria', 'custom']),
});
type PublishingContext = z.infer<typeof publishingContextSchema>;

const formats = [
  { value: 'movie', label: 'Feature film', detail: 'Feature-length film for digital distribution.' },
  { value: 'series', label: 'Series', detail: 'A serialized production with seasons and episodes.' },
  { value: 'episode', label: 'Episode', detail: 'An individual installment in an existing series.' },
  { value: 'short', label: 'Short film', detail: 'Short-form narrative, documentary or experimental work.' },
  { value: 'trailer', label: 'Trailer', detail: 'Promotional asset linked to a production.' },
  { value: 'vod', label: 'Video on demand', detail: 'A finished title released for on-demand viewing.' },
  { value: 'live', label: 'Live production', detail: 'A live broadcast, virtual premiere or interactive event.' },
] as const;

const workflows = [
  { title: 'Build a title', description: 'Create a film, series, episode, short, trailer or VOD title. Add the professional catalogue record, rights, artwork and private master.', href: '/studio/submit', icon: Film, badge: 'Catalogue publishing' },
  { title: 'Schedule a premiere', description: 'Turn a published title into a ticketed virtual screening with event timing, territories, admission pricing and audience access.', href: '/studio/screenings', icon: CalendarDays, badge: 'Event distribution' },
  { title: 'Go live', description: 'Configure the live production, admission and replay pricing, then provision a secure encoder through the configured streaming provider.', href: '/studio/live', icon: Radio, badge: 'Live production' },
];

export default function StudioCreate() {
  const [searchParams] = useSearchParams();
  const [context, setContext] = useState<PublishingContext>({
    format: (formats.some(item => item.value === searchParams.get('type')) ? searchParams.get('type') : 'movie') as PublishingContext['format'],
    releasePath: searchParams.get('flow') === 'live' ? 'live_event' : 'on_demand',
    territory: 'worldwide',
  });
  const parsed = useMemo(() => publishingContextSchema.safeParse(context), [context]);
  const selectedFormat = formats.find(item => item.value === context.format)!;
  const recommended = context.releasePath === 'live_event' ? workflows[2] : context.releasePath === 'premiere' ? workflows[1] : workflows[0];
  const destination = context.releasePath === 'live_event' ? '/studio/live' : context.releasePath === 'premiere' ? '/studio/screenings' : '/studio/submit?type=' + context.format;

  return (
    <StudioLayout title="Create" description="One publishing desk for titles, premieres and live productions.">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border bg-card p-5 md:p-7">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div><Badge className="mb-3"><Sparkles className="mr-1 h-3 w-3" /> Studio publishing desk</Badge><h2 className="text-2xl font-bold tracking-tight">What are you bringing to the screen?</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Start with the production context. DeGameTV routes you into the right industry workflow instead of making you hunt through separate tools.</p></div>
            <div className="hidden rounded-2xl bg-primary/10 p-4 text-primary md:block"><Clapperboard className="h-8 w-8" /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><label className="text-sm font-medium">Production format</label><Select value={context.format} onValueChange={value => setContext(current => ({ ...current, format: value as PublishingContext['format'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{formats.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">{selectedFormat.detail}</p></div>
            <div className="space-y-2"><label className="text-sm font-medium">Release strategy</label><Select value={context.releasePath} onValueChange={value => setContext(current => ({ ...current, releasePath: value as PublishingContext['releasePath'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="on_demand">On-demand release</SelectItem><SelectItem value="premiere">Ticketed premiere / screening</SelectItem><SelectItem value="live_event">Live broadcast / event</SelectItem><SelectItem value="festival">Festival / limited release</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Controls which distribution and event steps are relevant.</p></div>
            <div className="space-y-2"><label className="text-sm font-medium">Rights territory</label><Select value={context.territory} onValueChange={value => setContext(current => ({ ...current, territory: value as PublishingContext['territory'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="worldwide">Worldwide</SelectItem><SelectItem value="africa">Africa</SelectItem><SelectItem value="nigeria">Nigeria</SelectItem><SelectItem value="custom">Custom territories</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">A planning context; the formal rights declaration is captured in title metadata.</p></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/60 p-4">
            <div><p className="text-sm font-semibold">Recommended next step: {recommended.title}</p><p className="text-xs text-muted-foreground">{recommended.badge} · {context.territory === 'worldwide' ? 'Worldwide rights context' : context.territory === 'custom' ? 'Custom territory context' : context.territory + ' rights context'}</p></div>
            <Button asChild disabled={!parsed.success}><Link to={destination}>Continue workflow <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
          {!parsed.success && <p role="alert" className="mt-2 text-xs text-destructive">{parsed.error.issues[0]?.message}</p>}
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {workflows.map(({ title, description, href, icon: Icon, badge }) => (
            <Card key={title} className="flex h-full flex-col">
              <CardHeader><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><Badge variant="outline" className="w-fit">{badge}</Badge><CardTitle className="pt-2">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
              <CardContent className="mt-auto"><Button asChild variant="outline" className="w-full"><Link to={href}>Open workflow <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button></CardContent>
            </Card>
          ))}
        </div>

        <section className="grid gap-3 rounded-2xl border p-4 md:grid-cols-3">
          <div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-semibold">Rights & compliance</p><p className="text-xs text-muted-foreground">Territories, ownership declarations, identity and studio approval remain part of the publishing gate.</p></div></div>
          <div className="flex gap-3"><Globe2 className="h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-semibold">Industry metadata</p><p className="text-xs text-muted-foreground">Title format, synopsis, genres, duration, release year, cast & crew, artwork and distribution assets.</p></div></div>
          <div className="flex gap-3"><CircleDollarSign className="h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-semibold">Commercial release</p><p className="text-xs text-muted-foreground">Admission, replay, ticketing and release pricing are handled in the relevant event workflow.</p></div></div>
        </section>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><span>Your published catalogue and event operations remain available in their management views.</span><Button asChild variant="ghost" size="sm"><Link to="/studio/movies"><Upload className="mr-2 h-4 w-4" /> Open catalogue</Link></Button></div>
      </div>
    </StudioLayout>
  );
}
