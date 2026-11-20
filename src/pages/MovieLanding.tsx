import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { fetchCatalogRows } from '@/integrations/supabase/catalog';
import { toast } from 'sonner';
import {
  Star, Clock, Calendar, Play, Ticket, Bell, Send,
  ChevronLeft, ChevronRight, Loader2, MessageCircle, Shield
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LifecycleBanner } from '@/components/cinema/LifecycleBanner';
import { EventContribution } from '@/components/events/EventContribution';
import { EventContributionFeed } from '@/components/events/EventContributionFeed';

const castMemberSchema = z.object({ name: z.string(), character: z.string().optional().default(''), photo_url: z.string().optional() }).passthrough();
const screeningRowSchema = z.object({
 id:z.string(), title:z.string(), slug:z.string(), description:z.string().nullable().optional(),
 poster_url:z.string().nullable().optional(), banner_url:z.string().nullable().optional(), trailer_url:z.string().nullable().optional(),
 screening_date:z.string().nullable().optional(), release_date:z.string().nullable().optional(), duration:z.number().nullable().optional(),
 location_pricing:z.unknown().nullable().optional(), status:z.string(), cast_crew:z.unknown().nullable().optional(),
 gallery_images:z.unknown().nullable().optional(), age_rating:z.string().nullable().optional(), star_rating:z.number().nullable().optional(),
 review_count:z.number().nullable().optional(), lifecycle:z.string().nullable().optional(), replay_price_ngn:z.number().nullable().optional(),
 replay_price_usd:z.number().nullable().optional(), replay_access_hours:z.number().nullable().optional(), base_currency:z.string().nullable().optional(),
}).passthrough();
type Screening = {
 id:string; title:string; slug:string; description:string; poster_url:string; banner_url:string; trailer_url:string;
 screening_date:string; release_date:string; duration:number; location_pricing:{nigeria:number;international:number};
 status:string; cast_crew:z.infer<typeof castMemberSchema>[]; gallery_images:string[]; age_rating:string; star_rating:number;
 review_count:number; lifecycle?:string; replay_price_ngn?:number|null; replay_price_usd?:number|null;
 replay_access_hours?:number|null; base_currency?:string|null;
};

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

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      try {
        let resolvedSlug = slug;
        if (!resolvedSlug && typeof window !== 'undefined') {
          const parts = window.location.hostname.split('.');
          const reserved = ['www', 'app', 'admin', 'studio', 'api', 'localhost', 'preview', 'lovable'];
          if (parts.length >= 3 && !reserved.includes(parts[0])) resolvedSlug = parts[0];
        }
        if (!resolvedSlug) return;
        const rows = await fetchCatalogRows({
          view: 'public_screenings_catalog',
          select: 'id,title,slug,description,poster_url,banner_url,trailer_url,release_date,screening_date,duration,location_pricing,status,lifecycle,replay_price_ngn,replay_price_usd,replay_access_hours,base_currency,cast_crew,gallery_images,age_rating,star_rating,review_count',
          filters: { slug: `eq.${resolvedSlug}` }, signal: controller.signal,
        }, screeningRowSchema);
        const data = rows[0];
        if (!data) return;
        const parseJson = (value: unknown): unknown => {
          if (typeof value !== 'string') return value;
          try { return JSON.parse(value) as unknown; } catch { return null; }
        };
        const pricingValue = z.object({ nigeria: z.number().optional(), international: z.number().optional() }).passthrough().safeParse(parseJson(data.location_pricing));
        const castValue = z.array(castMemberSchema).safeParse(parseJson(data.cast_crew));
        const galleryValue = z.array(z.string().url()).safeParse(parseJson(data.gallery_images));
        const normalized: Screening = {
          id:data.id,title:data.title,slug:data.slug,description:data.description??'',poster_url:data.poster_url??'',
          banner_url:data.banner_url??'',trailer_url:data.trailer_url??'',screening_date:data.screening_date??'',
          release_date:data.release_date??'',duration:data.duration??0,
          location_pricing:pricingValue.success?{nigeria:pricingValue.data.nigeria??0,international:pricingValue.data.international??0}:{nigeria:0,international:0},
          status:data.status,cast_crew:castValue.success?castValue.data:[],gallery_images:galleryValue.success?galleryValue.data:[],
          age_rating:data.age_rating??'',star_rating:data.star_rating??0,review_count:data.review_count??0,
          lifecycle:data.lifecycle??undefined,replay_price_ngn:data.replay_price_ngn,replay_price_usd:data.replay_price_usd,
          replay_access_hours:data.replay_access_hours,base_currency:data.base_currency,
        };
        if (!active) return;
        setScreening(normalized);
        const { data: commentsData, error: commentsError } = await supabase.from('screening_comments')
          .select('id,nickname,comment,created_at').eq('screening_id', data.id)
          .order('created_at', { ascending: false }).limit(50);
        if (commentsError) console.error('screening_comments_load_failed', commentsError);
        if (active && commentsData) setComments(commentsData);
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('movie_landing_load_failed', error);
          toast.error('This screening could not be loaded.');
        }
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [slug]);

  const handleSubmitComment = async () => {
    if (!screening || !newComment.nickname.trim() || !newComment.comment.trim()) return;
    setSubmittingComment(true);
    try {
      const { error } = await supabase.from('screening_comments').insert({
        screening_id: screening.id, nickname: newComment.nickname.trim(), comment: newComment.comment.trim(),
      });
      if (error) throw error;
      if (!mountedRef.current) return;
      setComments(prev => [{ id: crypto.randomUUID(), nickname: newComment.nickname.trim(), comment: newComment.comment.trim(), created_at: new Date().toISOString() }, ...prev]);
      setNewComment({ nickname: '', comment: '' });
      toast.success('Comment posted!');
    } catch (error) { if (mountedRef.current) { console.error('screening_comment_submit_failed', error); toast.error('Failed to post comment'); } }
    finally { if (mountedRef.current) setSubmittingComment(false); }
  };

  const handleNotifyMe = async () => {
    if (!screening || !notifyEmail.includes('@')) return;
    try {
      const { error } = await supabase.from('screening_notifications').insert({ screening_id: screening.id, email: notifyEmail.trim() });
      if (error?.code === '23505') { if (mountedRef.current) { toast.info("You're already subscribed!"); setNotifySubmitted(true); } return; }
      if (error) throw error;
      if (mountedRef.current) { setNotifySubmitted(true); toast.success("We'll notify you when it's available!"); }
    } catch (error) { if (mountedRef.current) { console.error('screening_notification_submit_failed', error); toast.error('Something went wrong'); } }
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

  const lifecycle = screening.lifecycle;
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
        lifecycle={screening.lifecycle || 'upcoming'}
        screeningDate={screening.screening_date}
        replayPriceNgn={screening.replay_price_ngn}
        replayPriceUsd={screening.replay_price_usd}
        replayAccessHours={screening.replay_access_hours}
      />

      <div className="container mx-auto px-4 py-8 space-y-12">
        <EventContribution screeningId={screening.id} currency={screening.base_currency || "NGN"} />
        <EventContributionFeed screeningId={screening.id} />
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
