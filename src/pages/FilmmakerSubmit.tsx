import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Film, Globe, Star, Users, ArrowRight, Clapperboard } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function FilmmakerSubmit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  usePageTitle('Filmmaker Portal');

  return (
    <MainLayout>
      {/* Hero */}
      <div className="bg-primary text-primary-foreground py-16 px-4 text-center">
        <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-4 text-xs font-semibold tracking-wider rounded-full px-4 py-1">
          🎬 FILMMAKER PORTAL
        </Badge>
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">
          Premiere Your Film on DeGameTV
        </h1>
        <p className="text-primary-foreground/95 max-w-xl mx-auto text-sm md:text-base mb-8">
          Partner with us to distribute your film to audiences across Africa and the world. 
          Virtual cinema, VOD, and revenue sharing for Nollywood and African cinema.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2"
            onClick={() => navigate(user ? '/apply-filmmaker' : '/auth?redirect=/apply-filmmaker')}
          >
            <Clapperboard className="w-5 h-5" />
            {user ? 'Apply to Premiere' : 'Sign Up & Apply'}
            <ArrowRight className="w-4 h-4" />
          </Button>
          {!user && (
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Why Partner */}
      <div className="bg-secondary/30 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-2xl font-bold mb-2">Why Partner With DeGameTV?</h2>
          <p className="text-muted-foreground text-sm">Everything you need to premiere, distribute, and monetize your film</p>
        </div>
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { icon: Globe, title: 'Global Reach', desc: 'Nigerian & international audience across web, mobile, and TV' },
            { icon: Star, title: 'Virtual Premieres', desc: 'Exclusive cinema events with real-time ticket sales and live chat' },
            { icon: Users, title: 'Revenue Share', desc: 'Flexible monetization: tickets, VOD, subscriptions & licensing deals' },
          ].map(f => (
            <div key={f.title} className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="py-14 px-4">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h2 className="text-2xl font-bold mb-2">How It Works</h2>
        </div>
        <div className="max-w-2xl mx-auto space-y-6">
          {[
            { step: '1', title: 'Create Your Account', desc: 'Sign up with your normal viewer account' },
            { step: '2', title: 'Apply & Verify (KYC)', desc: 'Submit your ID and selfie — protects against piracy & impersonation' },
            { step: '3', title: 'Get Approved', desc: 'Our team reviews within 24–48 hours and unlocks your Studio' },
            { step: '4', title: 'Upload & Premiere', desc: 'Add films, schedule premieres, sell tickets, earn revenue' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                {s.step}
              </div>
              <div>
                <h3 className="font-semibold mb-0.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-card border-t border-border py-12 px-4 text-center">
        <Film className="w-10 h-10 mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-bold mb-2">Ready to premiere your film?</h2>
        <p className="text-sm text-muted-foreground mb-6">Join filmmakers already distributing on DeGameTV</p>
        <Button
          size="lg"
          className="rounded-full gap-2"
          onClick={() => navigate(user ? '/apply-filmmaker' : '/auth?redirect=/apply-filmmaker')}
        >
          {user ? 'Apply Now' : 'Get Started'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </MainLayout>
  );
}
