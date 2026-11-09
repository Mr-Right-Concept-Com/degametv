import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Share2, Home, Clock, Mail, Shield, Globe, Tv2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function WatchMovie() {
  usePageTitle('Watch');
  const { watchCode } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateTicket = async () => {
      try {
        const email = searchParams.get('email');
        const { data, error: fnError } = await supabase.functions.invoke('validate-watch-code', {
          body: { watchCode, email },
        });

        if (fnError || !data?.success) {
          setError(data?.error || 'Invalid or expired watch link. Please check your email for a valid link.');
          return;
        }
        if (searchParams.get('checkin') === '1') {
          toast.success('Checked in — enjoy the show! Your pass is saved under My Tickets.');
        }


        setTicket(data.ticket);
      } catch {
        setError('Unable to validate your ticket. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (watchCode) validateTicket();
    else {
      setError('No watch code provided.');
      setLoading(false);
    }
  }, [watchCode, searchParams]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: ticket?.movieTitle, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating your ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full animate-fade-in">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6 text-sm">{error}</p>
            <Button className="w-full rounded-full" asChild>
              <Link to="/"><Home className="w-4 h-4 mr-2" /> Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const watermarkLabel = `${ticket.email} • ${ticket.country || ''}`.trim();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <div role="status" className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-muted-foreground">
          Your ticket is valid, but secure film delivery is not connected for this screening. Playback is unavailable; the original video file will not be exposed as a fallback.
        </div>
      </div>


      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">{ticket.movieTitle}</h1>
            <p className="text-sm text-muted-foreground">
              Valid until {new Date(ticket.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full shrink-0" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1.5" /> Share
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Mail, label: 'Email', value: ticket.email, color: 'text-primary' },
            { icon: Clock, label: 'Access', value: '90 Days', color: 'text-success' },
            { icon: Tv2, label: 'Streams Left', value: `${ticket.streamsRemaining ?? '∞'} of ${ticket.maxStreams ?? '∞'}`, color: 'text-accent' },
            { icon: Shield, label: 'Delivery', value: 'Provider unavailable', color: 'text-muted-foreground' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
              <div className={`w-9 h-9 rounded-full bg-card flex items-center justify-center ${item.color}`}>
                <item.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xs sm:text-sm font-medium truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {ticket.country && (
          <div className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/30 rounded-full px-3 py-1">
            <Globe className="w-3 h-3" /> Streaming from {ticket.country}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="rounded-full flex-1 sm:flex-none" asChild>
            <Link to="/tickets">My Tickets</Link>
          </Button>
          <Button variant="outline" className="rounded-full flex-1 sm:flex-none" asChild>
            <Link to="/">Browse More</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
