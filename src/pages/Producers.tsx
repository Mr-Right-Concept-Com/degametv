import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Globe, Ticket, Tv2, BarChart3, ShieldCheck, Bell, Check } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

const pillars = [
  { icon: Globe, title: 'Global Access', desc: 'Reach fans worldwide with seamless geo-controls. Premiere everywhere — or only where you want.' },
  { icon: Ticket, title: 'eTicketing', desc: 'Global payments, instant Watch Now links, refunds & abuse prevention all handled.' },
  { icon: Tv2, title: 'Quality Streaming', desc: 'High-throughput CDN with adaptive bitrate. Smooth playback on any device, any bandwidth.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Top cities, average view time, revenue breakdowns — KPIs you can depend on.' },
  { icon: ShieldCheck, title: 'Security', desc: 'Tokenized signed playback, download blocking, stream caps. Your films stay yours.' },
  { icon: Bell, title: 'Engagement', desc: 'Automated 24h and 1h reminders, promo codes, comments — keep your audience hyped.' },
];

const advantages = [
  'No contracts or minimum commitments',
  'No monthly billing or credit card required',
  'No bandwidth-based fees regardless of viewership',
  'Full white-labeled premiere subdomains',
];

export default function Producers() {
  usePageTitle('For Producers — Premiere Your Film Globally');

  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
        <div className="container mx-auto px-5 py-16 sm:py-24 relative">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">For Producers</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-5">
              Premiere your films virtually <span className="text-primary">and globally.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl">
              Reach a worldwide audience with a full virtual cinema experience — ticketing, streaming, analytics, security, and engagement, all in one platform.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/apply-filmmaker">Submit Your Film</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <Link to="/studio">Producer Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Six Pillars */}
      <section className="container mx-auto px-5 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-center">We've got you covered</h2>
        <p className="text-sm text-muted-foreground text-center mb-10 max-w-xl mx-auto">
          Everything you need to host a successful virtual premiere — built in.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl p-5 sm:p-6 bg-card border border-border hover:border-primary/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <p.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-base mb-1.5">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Advantages */}
      <section className="container mx-auto px-5 py-16">
        <div className="max-w-3xl mx-auto bg-card border border-border rounded-3xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">The DeGameTV Advantage</h2>
          <p className="text-sm text-muted-foreground mb-8">No surprises. Just a partner that helps your film succeed.</p>
          <ul className="space-y-3 max-w-md mx-auto text-left">
            {advantages.map((a) => (
              <li key={a} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm">{a}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/apply-filmmaker">Get Started — Free</Link>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
