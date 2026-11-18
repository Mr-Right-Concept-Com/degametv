import { useState, useEffect } from 'react';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Film, Upload, Loader2, ExternalLink } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';

interface Submission {
  id: string;
  project_title: string;
  project_type: string;
  status: string;
  created_at: string;
  genres: string[] | null;
  poster_url: string | null;
  duration_minutes: number | null;
  release_year: number | null;
  description: string | null;
  content_id: string | null;
  content_status: string | null;
}

export default function StudioMovies() {
  usePageTitle('Studio: My Movies');
  const { user } = useAuth();
  const [movies, setMovies] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState<Submission | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [priceNgn, setPriceNgn] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [savingScreening, setSavingScreening] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from('filmmaker_submissions')
        .select('*')
        .eq('submitter_email', user.email)
        .order('created_at', { ascending: false });
      if (error) {
        setMovies([]);
        setLoading(false);
        return;
      }
      const submissions = data ?? [];
      const contentIds = submissions.map(row => row.content_id).filter((id): id is string => Boolean(id));
      const { data: contentRows } = contentIds.length
        ? await supabase.from('content').select('id,status').in('id', contentIds)
        : { data: [] };
      const statusById = new Map((contentRows ?? []).map(row => [row.id, row.status]));
      setMovies(submissions.map(row => ({ ...row, content_status: row.content_id ? statusById.get(row.content_id) ?? null : null })) as Submission[]);
      setLoading(false);
    };
    fetch();
  }, [user?.email]);

  const publishContent = async (contentId: string) => {
    const { data, error } = await supabase.rpc('publish_creator_content', { p_content_id: contentId });
    if (error) {
      const message = error.message.includes('content_review_required') ? 'Your submission must be approved before publishing.'
        : error.message.includes('content_assets_required') ? 'Add a poster and private master video before publishing.'
        : error.message.includes('master_media_missing') ? 'The private master file is missing. Re-upload it before publishing.'
        : 'Content could not be published. Check its review status and assets.';
      toast.error(message);
      return;
    }
    setMovies(current => current.map(movie => movie.content_id === contentId ? { ...movie, content_status: 'published' } : movie));
    toast.success('Your content listing is published. You can now share its public page.');
    if (data && typeof data === 'object' && !Array.isArray(data) && 'share_path' in data && typeof data.share_path === 'string') {
      await navigator.clipboard?.writeText(window.location.origin + data.share_path).catch(() => undefined);
    }
  };

  const createScreeningDraft = async () => {
    if (!scheduling?.content_id) return;
    const ngn = Number(priceNgn);
    const usd = Number(priceUsd);
    if (!Number.isFinite(ngn) || ngn <= 0 || !Number.isFinite(usd) || usd <= 0 || !scheduleDate) {
      toast.error('Enter a screening date and valid NGN and USD ticket prices.');
      return;
    }
    const date = new Date(scheduleDate);
    if (Number.isNaN(date.getTime()) || date.getTime() < Date.now() + 15 * 60 * 1000) {
      toast.error('Choose a screening time at least 15 minutes from now.');
      return;
    }
    setSavingScreening(true);
    const slugBase = scheduling.project_title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
    const { data, error } = await supabase.rpc('create_creator_screening', {
      p_content_id: scheduling.content_id,
      p_screening_date: date.toISOString(),
      p_location_pricing: { nigeria: ngn, international: usd },
      p_event_type: scheduling.project_type === 'series' ? 'series' : 'film',
      p_slug: slugBase + '-' + crypto.randomUUID().slice(0, 8),
    });
    setSavingScreening(false);
    if (error) {
      const message = error.message.includes('approved_creator_required') ? 'Your Creator Studio approval is required.'
        : error.message.includes('published_content_required') ? 'Publish the title listing before scheduling a screening.'
        : error.message.includes('valid_location_pricing_required') ? 'Both regional ticket prices must be greater than zero.'
        : 'Screening draft could not be created. Check the title and try again.';
      toast.error(message);
      return;
    }
    setScheduling(null);
    setScheduleDate('');
    setPriceNgn('');
    setPriceUsd('');
    toast.success('Screening draft created. It is visible in My Screenings and requires publication approval before ticket sales.');
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    approved: 'bg-success/15 text-success',
    rejected: 'bg-destructive/15 text-destructive',
    in_review: 'bg-primary/15 text-primary',
  };

  return (
    <StudioLayout
      title="My Movies"
      description={`${movies.length} submissions`}
      actions={
        <Button asChild size="sm" className="rounded-full gap-2">
          <Link to="/studio/submit"><Upload className="w-4 h-4" /> New Submission</Link>
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-20">
          <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold mb-1">No movies submitted</h3>
          <p className="text-sm text-muted-foreground mb-4">Start by submitting your first film</p>
          <Button asChild className="rounded-full">
            <Link to="/studio/submit">Submit Film</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {movies.map(m => (
            <Card key={m.id} className="overflow-hidden">
              <CardContent className="p-4 flex gap-4">
                {m.poster_url ? (
                  <img src={m.poster_url} alt={m.project_title} className="w-20 h-28 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-20 h-28 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Film className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{m.project_title}</h3>
                    <Badge className={statusColor[m.status] || statusColor.pending}>
                      {m.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize mb-2">
                    {m.project_type} {m.duration_minutes ? `· ${m.duration_minutes} min` : ''} {m.release_year ? `· ${m.release_year}` : ''}
                  </p>
                  {m.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{m.description}</p>
                  )}
                  {m.genres && m.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.genres.slice(0, 4).map(g => (
                        <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{g}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.status === 'approved' && m.content_id && m.content_status === 'draft' && (
                      <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => void publishContent(m.content_id!)}>
                        Publish listing
                      </Button>
                    )}
                    {m.content_id && m.content_status === 'published' && (
                      <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" asChild>
                        <Link to={`/content/${m.content_id}`}><ExternalLink className="mr-1 h-3 w-3" />Share public page</Link>
                      </Button>
                    )}
                    {m.content_id && m.content_status === 'published' && (
                      <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => setScheduling(m)}>
                        Schedule screening
                      </Button>
                    )}
                    {m.status === 'approved' && m.content_status !== 'published' && (
                      <span className="text-[10px] text-muted-foreground">Approved · complete assets to publish</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {scheduling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setScheduling(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="screening-dialog-title" className="w-full max-w-lg space-y-4 rounded-2xl border bg-background p-6 shadow-2xl">
            <div><h2 id="screening-dialog-title" className="text-lg font-semibold">Schedule a screening</h2><p className="mt-1 text-sm text-muted-foreground">{scheduling.project_title} · This creates a private draft for platform review.</p></div>
            <div className="space-y-2"><label htmlFor="screening-date" className="text-sm font-medium">Screening date and time</label><input id="screening-date" type="datetime-local" value={scheduleDate} onChange={event => setScheduleDate(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"/></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><label htmlFor="screening-ngn" className="text-sm font-medium">Nigeria ticket price (NGN)</label><input id="screening-ngn" type="number" min="1" step="1" value={priceNgn} onChange={event => setPriceNgn(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" placeholder="Enter NGN price"/></div>
              <div className="space-y-2"><label htmlFor="screening-usd" className="text-sm font-medium">International ticket price (USD)</label><input id="screening-usd" type="number" min="0.01" step="0.01" value={priceUsd} onChange={event => setPriceUsd(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" placeholder="Enter USD price"/></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setScheduling(null)} disabled={savingScreening}>Cancel</Button><Button onClick={() => void createScreeningDraft()} disabled={savingScreening}>{savingScreening ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}Create screening draft</Button></div>
          </section>
        </div>
      )}
    </StudioLayout>
  );
}
