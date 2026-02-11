import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Play, Lock, LogOut, Share2 } from 'lucide-react';

export default function WatchMovie() {
  const { watchCode } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate ticket access
    const validateTicket = async () => {
      try {
        // Call edge function to validate watch code
        // const response = await fetch('/api/validate-watch-code', {
        //   method: 'POST',
        //   body: JSON.stringify({ watchCode, email: searchParams.get('email') })
        // });
        // if (response.ok) {
        //   const data = await response.json();
        //   setTicket(data.ticket);
        // }
        
        // Mock for now
        setTicket({
          id: '123',
          movieTitle: 'The Wedding Day',
          moviePoster: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&h=450&fit=crop',
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          location: 'Nigeria',
          email: searchParams.get('email') || 'user@example.com',
        });
      } catch (err) {
        setError('Invalid or expired watch link. Please check your email for a valid link.');
      } finally {
        setLoading(false);
      }
    };

    validateTicket();
  }, [watchCode, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your movie...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-card/50 border-destructive/50 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button className="w-full" variant="outline">Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Video Player Section */}
      <div className="bg-black aspect-video w-full flex items-center justify-center relative group">
        <img 
          src={ticket.moviePoster} 
          alt={ticket.movieTitle}
          className="w-full h-full object-cover"
        />
        <button className="absolute inset-0 flex items-center justify-center hover:bg-black/40 transition group">
          <div className="w-20 h-20 rounded-full bg-primary/80 flex items-center justify-center hover:bg-primary transition">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </button>
        
        {/* Video Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 opacity-0 group-hover:opacity-100 transition">
          <div className="flex items-center justify-between text-white text-sm">
            <span>00:00 / 2:14:30</span>
            <div className="flex gap-2">
              <button className="hover:bg-white/20 p-2 rounded"><Share2 className="w-4 h-4" /></button>
              <button className="hover:bg-white/20 p-2 rounded"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Movie Info & Ticket Details */}
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">{ticket.movieTitle}</h1>
          <p className="text-muted-foreground text-lg">Valid until: {new Date(ticket.expiresAt).toLocaleDateString()}</p>
        </div>

        {/* Access Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-secondary/20 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span>✓</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{ticket.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/20 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Badge variant="default" className="text-xs">90d</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Access Duration</p>
                  <p className="font-medium">90 Days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/20 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Security</p>
                  <p className="font-medium">Encrypted & Protected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Movie Description */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-3">About This Movie</h2>
            <p className="text-muted-foreground leading-relaxed">
              A beautiful love story set in modern-day Lagos. Two souls from different worlds find love in the most unexpected way. This masterpiece of Nigerian cinema explores themes of love, family, and cultural identity with stunning cinematography and powerful performances.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
