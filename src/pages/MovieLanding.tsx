import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Star, Clock, Calendar, Play, Ticket, Bell, Send,
  ChevronLeft, ChevronRight, Loader2, MessageCircle, Shield
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LifecycleBanner } from '@/components/cinema/LifecycleBanner';

interface CastMember {
  name: string;
  character: string;
  photo_url?: string;
}

interface Screening {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_url: string;
  banner_url: string;
  trailer_url: string;
  screening_date: string;
  release_date: string;
  duration: number;
  location_pricing: { nigeria: number; international: number };
  status: string;
  cast_crew: CastMember[];
  gallery_images: string[];
  age_rating: string;
  star_rating: number;
  review_count: number;
}

interface Comment {
  id: string;
  nickname: string;
  comment: string;
  created_at: string;
}

export default function MovieLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [screening, setScreening] = useState<Screening | null>(null);
  const [loading, setLoading] = useState(true);
  usePageTitle(screening?.title || 'Movie');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState({ nickname: '', comment: '' });
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      // Subdomain resolution: e.g. `agabaidu.degametv.com` resolves to slug "agabaidu"
      let resolvedSlug = slug;
      if (!resolvedSlug && typeof window !== 'undefined') {
        const host = window.location.hostname;
        const parts = host.split('.');
        const reserved = ['www', 'app', 'admin', 'studio', 'api', 'localhost', 'preview', 'lovable'];
        if (parts.length >= 3 && !reserved.includes(parts[0])) resolvedSlug = parts[0];
      }
      if (!resolvedSlug) { setLoading(false); return; }
      const { data } = await supabase
        .from('screenings')
        .select('id,content_id,title,slug,description,poster_url,banner_url,trailer_url,release_date,screening_date,duration,location_pricing,status,event_type,lifecycle,live_price_ngn,live_price_usd,live_recording_status,live_started_at,live_ended_at,live_replay_ready_at,replay_price_ngn,replay_price_usd,replay_access_hours,refund_policy,cast_crew,gallery_images,age_rating,star_rating,review_count,allowed_countries,blocked_countries,cancelled_at,event_visibility,invite_only,sales_open_at,sales_close_at,early_bird_price,early_bird_currency,early_bird_ends_at,early_bird_capacity,release_access_at,event_timezone,presale_enabled,created_at,updated_at')
        .eq('slug', resolvedSlug)
        .in('event_visibility', ['public', 'unlisted'])
        .eq('invite_only', false)
        .maybeSingle();

      if (data) {
        const pricing = typeof data.location_pricing === 'string'
          ? JSON.parse(data.location_pricing as string)
          : data.location_pricing;
        setScreening({
          ...data,
          location_pricing: pricing,
          cast_crew: (data.cast_crew as unknown as CastMember[]) || [],
          gallery_images: (data.gallery_images as string[]) || [],
          age_rating: (data as any).age_rating || '',
          star_rating: (data as any).star_rating || 0,
          review_count: (data as any).review_count || 0,
        } as Screening);

        // Fetch comments
        const { data: commentsData } = await supabase
          .from('screening_comments')
          .select('*')
          .eq('screening_id', data.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (commentsData) setComments(commentsData);
      }
      setLoading(false);
    };
    fetch();
  }, [slug]);

  const handleSubmitComment = async () => {
    if (!screening || !newComment.nickname.trim() || !newComment.comment.trim()) return;
    setSubmittingComment(true);
    const { error } = await supabase.from('screening_comments').insert({
      screening_id: screening.id,
      nickname: newComment.nickname.trim(),
      comment: newComment.comment.trim(),
    });
    if (!error) {
      setComments(prev => [{ id: crypto.randomUUID(), nickname: newComment.nickname, comment: newComment.comment, created_at: new Date().toISOString() }, ...prev]);
      setNewComment({ nickname: '', comment: '' });
      toast.success('Comment posted!');
    } else {
      toast.error('Failed to post comment');
    }
    setSubmittingComment(false);
  };

  const handleNotifyMe = async () => {
    if (!screening || !notifyEmail.includes('@')) return;
    const { error } = await supabase.from('screening_notifications').insert({
      screening_id: screening.id,
      email: notifyEmail.trim(),
    });
    if (!error) {
      setNotifySubmitted(true);
      toast.success("We'll notify you when it's available!");
    } else if (error.code === '23505') {
      toast.info("You're already subscribed!");
      setNotifySubmitted(true);
    } else {
      toast.error('Something went wrong');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!screening) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Movie Not Found</h2>
            <p className="text-muted-foreground mb-4 text-sm">This movie doesn't exist or has been removed.</p>
            <Button asChild className="rounded-full"><Link to="/cinema">Browse Movies</Link></Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const lifecycle = (screening as any).lifecycle as string | undefined;
  const isOnSale = lifecycle
    ? ['upcoming', 'live', 'replay'].includes(lifecycle)
    : screening.status === 'published';
  const isUpcoming = lifecycle
    ? lifecycle === 'upcoming'
    : screening.status !== 'published' || (!!screening.screening_date && new Date(screening.screening_date) > new Date());

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'fill-accent text-accent' : i < rating ? 'fill-accent/50 text-accent' : 'text-muted-foreground/30'}`}
      />
    ));
  };

  return (
    <MainLayout>
      {/* Hero Banner */}
      <section className="relative w-full min-h-[60vh] md:min-h-[70vh] flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${screening.banner_url || screening.poster_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />

        <div className="relative z-10 container mx-auto px-4 pb-8 md:pb-12 flex flex-col md:flex-row gap-6 items-end">
          {/* Poster */}
          {screening.poster_url && (
            <div className="hidden md:block w-48 lg:w-56 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl border-2 border-border/30">
              <img src={screening.poster_url} alt={screening.title} className="w-full aspect-[2/3] object-cover" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">{screening.title}</h1>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {screening.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {screening.duration} min
                </span>
              )}
              {screening.screening_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(screening.screening_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              {screening.age_rating && (
                <Badge variant="outline" className="border-accent text-accent font-bold text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  {screening.age_rating}
                </Badge>
              )}
            </div>

            {/* Star Rating */}
            {screening.star_rating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex">{renderStars(screening.star_rating)}</div>
                <span className="text-sm font-medium">{screening.star_rating.toFixed(1)}</span>
                {screening.review_count > 0 && (
                  <span className="text-xs text-muted-foreground">({screening.review_count} reviews)</span>
                )}
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-2">
              {isOnSale && (
                <Button asChild size="lg" className="rounded-full gap-2 shadow-lg">
                  <Link to={`/buy/${screening.slug}`}>
                    <Ticket className="w-5 h-5" /> Purchase Tickets
                  </Link>
                </Button>
              )}
              {screening.trailer_url && (
                <Dialog open={trailerOpen} onOpenChange={setTrailerOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="rounded-full gap-2">
                      <Play className="w-5 h-5" /> Watch Trailer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl p-0 overflow-hidden">
                    <div className="aspect-video">
                      <iframe
                        src={screening.trailer_url}
                        className="w-full h-full"
                        allowFullScreen
                        allow="autoplay; encrypted-media"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </section>

      <LifecycleBanner
        screeningId={screening.id}
        slug={screening.slug}
        lifecycle={(screening as any).lifecycle || 'upcoming'}
        screeningDate={screening.screening_date}
        replayPriceNgn={(screening as any).replay_price_ngn}
        replayPriceUsd={(screening as any).replay_price_usd}
        replayAccessHours={(screening as any).replay_access_hours}
      />

      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Synopsis */}
        {screening.description && (
          <section>
            <h2 className="text-xl font-bold mb-3">Synopsis</h2>
            <p className="text-muted-foreground leading-relaxed max-w-3xl">{screening.description}</p>
          </section>
        )}

        {/* Cast & Crew */}
        {screening.cast_crew.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Cast & Crew</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {screening.cast_crew.map((member, i) => (
                <div key={i} className="flex-shrink-0 w-28 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-secondary mb-2">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold truncate">{member.name}</p>
                  {member.character && (
                    <p className="text-[10px] text-muted-foreground truncate">{member.character}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Image Gallery */}
        {screening.gallery_images.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Gallery</h2>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              {screening.gallery_images.map((img, i) => (
                <div key={i} className="flex-shrink-0 w-64 h-40 rounded-xl overflow-hidden bg-secondary">
                  <img src={img} alt={`Still ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notify Me (upcoming) */}
        {isUpcoming && (
          <section className="bg-card border border-border rounded-2xl p-6 max-w-lg">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-bold">Notify Me</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              This movie hasn't premiered yet. Get notified when tickets go on sale.
            </p>
            {notifySubmitted ? (
              <p className="text-sm text-success font-medium">✓ You'll be notified!</p>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={notifyEmail}
                  onChange={e => setNotifyEmail(e.target.value)}
                  className="rounded-full h-10"
                />
                <Button className="rounded-full" onClick={handleNotifyMe} disabled={!notifyEmail.includes('@')}>
                  <Bell className="w-4 h-4 mr-1" /> Notify Me
                </Button>
              </div>
            )}
          </section>
        )}

        {/* Comments Section */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" /> Comments
          </h2>

          {/* Comment Form */}
          <div className="bg-card border border-border rounded-2xl p-4 mb-6 max-w-lg space-y-3">
            <Input
              placeholder="Your nickname"
              value={newComment.nickname}
              onChange={e => setNewComment(prev => ({ ...prev, nickname: e.target.value }))}
              className="rounded-xl h-9 text-sm"
              maxLength={50}
            />
            <textarea
              placeholder="Write a comment..."
              value={newComment.comment}
              onChange={e => setNewComment(prev => ({ ...prev, comment: e.target.value }))}
              className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={500}
            />
            <Button
              size="sm"
              className="rounded-full gap-1"
              onClick={handleSubmitComment}
              disabled={!newComment.nickname.trim() || !newComment.comment.trim() || submittingComment}
            >
              {submittingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Post
            </Button>
          </div>

          {/* Comments List */}
          <div className="space-y-4 max-w-lg">
            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
            )}
            {comments.map(c => (
              <div key={c.id} className="border-b border-border/50 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{c.nickname}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{c.comment}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Sticky Buy CTA (mobile) */}
      {isOnSale && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border p-3 safe-bottom md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">From</p>
              <p className="text-lg font-bold text-primary">
                ₦{(screening.location_pricing?.nigeria || 0).toLocaleString()}
              </p>
            </div>
            <Button asChild className="rounded-full gap-2 shadow-lg flex-1 max-w-[200px]">
              <Link to={`/buy/${screening.slug}`}>
                <Ticket className="w-4 h-4" /> Get Tickets
              </Link>
            </Button>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
