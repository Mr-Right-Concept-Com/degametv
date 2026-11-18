import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Film, Upload, CheckCircle, ChevronRight, Loader2,
  Image as ImageIcon, Link2, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance', 'Documentary', 'Animation', 'Sci-Fi', 'Fantasy', 'Crime', 'Biography', 'Musical', 'Nollywood', 'African Cinema'];
const GENRES_BY_TYPE: Record<string, string[]> = { movie: GENRES, series: GENRES, episode: GENRES, short: ['Drama','Comedy','Horror','Romance','Animation','Documentary','Experimental','Social impact','Nollywood'], trailer: ['Drama','Action','Comedy','Horror','Romance','Documentary','Animation'], vod: ['Education','Documentary','Lifestyle','Entertainment','Business','Technology','Faith','Sports','Music'] };
const BUDGET_RANGES = ['Under $10K', '$10K – $50K', '$50K – $250K', '$250K – $1M', '$1M – $5M', 'Over $5M'];
const RIGHTS = ['World rights available', 'African distribution only', 'Nigeria only', 'Digital/VOD only', 'Festival rights only', 'Revenue share open'];
const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Swahili', 'Arabic', 'Portuguese', 'Other'];
const COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Uganda', 'Tanzania', 'Rwanda', 'United Kingdom', 'United States', 'Canada', 'Other'];
const CONTENT_RATINGS = ['G', 'PG', 'PG-13', '16', '18', 'Not rated'];
const ASPECT_RATIOS = ['16:9', '2.39:1', '1.85:1', '4:3', '9:16', '1:1'];

const step2Schema = z.object({
  project_title: z.string().trim().min(2, 'Enter a production title').max(200),
  project_type: z.enum(['movie', 'series', 'episode', 'short', 'trailer', 'live', 'vod']),
  release_strategy: z.enum(['on_demand', 'premiere', 'live']),
  description: z.string().trim().max(5000, 'Synopsis must be 5,000 characters or fewer').optional(),
  genres: z.array(z.string().trim().min(1)).max(5, 'Choose no more than five primary genres'),
  duration_minutes: z.string().optional().refine(v => !v || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) < 1000), 'Duration must be a whole number between 1 and 999 minutes'),
  release_year: z.string().optional().refine(v => !v || (/^\d{4}$/.test(v) && Number(v) >= 1900 && Number(v) <= new Date().getFullYear() + 5), 'Enter a valid release year'),
  cast_crew_text: z.string().max(12000, 'Cast and crew details are too long').optional(),
  budget_range: z.string().max(80).optional(),
  live_event_format: z.enum(['broadcast', 'concert', 'conference', 'talk', 'gaming', 'watch_party', 'sports', 'worship', 'other']),
  original_language: z.string().min(1).max(80),
  production_country: z.string().min(1).max(80),
  content_rating: z.enum(['G', 'PG', 'PG-13', '16', '18', 'Not rated']),
  aspect_ratio: z.enum(['16:9', '2.39:1', '1.85:1', '4:3', '9:16', '1:1']),
  season_number: z.string().optional().refine(v => !v || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 100), 'Season must be between 1 and 100'),
  episode_number: z.string().optional().refine(v => !v || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 500), 'Episode must be between 1 and 500'),
}).superRefine((value, ctx) => {
  if (['series', 'episode'].includes(value.project_type) && !value.season_number) ctx.addIssue({code:z.ZodIssueCode.custom,path:['season_number'],message:'Add a season number for series content.'});
  if (value.project_type === 'episode' && !value.episode_number) ctx.addIssue({code:z.ZodIssueCode.custom,path:['episode_number'],message:'Add the episode number.'});
});

const step3Schema = z.object({
  distribution_rights: z.string().trim().min(1, 'A rights declaration is required before publishing.').max(120),
  release_strategy: z.enum(['on_demand', 'premiere', 'live']),
  trailer_url: z.string().url('Enter a valid trailer URL').optional().or(z.literal('')),
  screener_url: z.string().url('Enter a valid screener URL').optional().or(z.literal('')),
  premiere_date: z.string().optional().refine(value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Enter a valid release or premiere date'),
  premiere_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid event start time'),
  live_price_ngn: z.string().optional().refine(value => !value || (/^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0), 'Enter a valid non-negative NGN ticket price'),
  live_price_usd: z.string().optional().refine(value => !value || (/^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0), 'Enter a valid non-negative USD ticket price'),
  rights_territories: z.string().max(500, 'Territory list is too long').optional(),
  prior_screenings: z.string().max(3000, 'Prior screening details are too long').optional(),
  poster_url: z.string().url('Artwork must be a valid URL').optional().or(z.literal('')),
  video_url: z.string().max(2048).optional(),
}).superRefine((value, ctx) => {
  if (value.release_strategy === 'premiere' || value.release_strategy === 'live') {
    if (!value.premiere_date) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['premiere_date'], message: 'Choose the event date.' });
    if (value.live_price_ngn && Number(value.live_price_ngn) < 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['live_price_ngn'], message: 'Admission price cannot be negative.' });
    if (value.live_price_usd && Number(value.live_price_usd) < 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['live_price_usd'], message: 'Admission price cannot be negative.' });
  }
});

export default function StudioSubmit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const liveFlow = searchParams.get('flow') === 'live';
  const selectCreateFlow = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'live') { next.set('flow', 'live'); next.set('type', 'live'); }
    else { next.delete('flow'); next.delete('type'); }
    setSearchParams(next, { replace: true });
    setStep(2);
    setForm(current => ({ ...current, project_type: value === 'live' ? 'live' : (current.project_type === 'live' ? 'movie' : current.project_type), release_strategy: value === 'live' ? 'live' : (current.release_strategy === 'live' ? 'on_demand' : current.release_strategy) }));
  };
  const [step, setStep] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [published, setPublished] = useState(false);
  const [createdContentId, setCreatedContentId] = useState<string | null>(null);
  const [createdScreeningId, setCreatedScreeningId] = useState<string | null>(null);
  const [encoderGrant, setEncoderGrant] = useState<{ streamId: string; ingestUrl: string; streamKey: string; playbackUrl?: string | null; ingestProtocol: string; provider: string } | null>(null);
  const [provisioningEncoder, setProvisioningEncoder] = useState(false);
  const draftKey = `degametv:studio:create:${user?.id || 'guest'}`;
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    submitter_name: String(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Creator'),
    submitter_email: user?.email || '',
    company_name: '',
    project_title: '',
    project_type: searchParams.get('flow') === 'live' ? 'live' : ['movie', 'series', 'episode', 'short', 'trailer', 'live', 'vod'].includes(searchParams.get('type') || '') ? (searchParams.get('type') as string) : 'movie',
    release_strategy: searchParams.get('flow') === 'live' ? 'live' : 'on_demand',
    live_event_format: 'broadcast',
    original_language: 'English',
    production_country: 'Nigeria',
    content_rating: 'Not rated' as 'G' | 'PG' | 'PG-13' | '16' | '18' | 'Not rated',
    aspect_ratio: '16:9' as '16:9' | '2.39:1' | '1.85:1' | '4:3' | '9:16' | '1:1',
    season_number: '',
    episode_number: '',
    description: '',
    genres: [] as string[],
    duration_minutes: '',
    release_year: new Date().getFullYear().toString(),
    poster_url: '',
    trailer_url: '',
    screener_url: '',
    video_url: '',
    budget_range: '',
    distribution_rights: '',
    premiere_date: '',
    premiere_time: '20:00',
    live_price_ngn: '',
    live_price_usd: '',
    rights_territories: '',
    prior_screenings: '',
    cast_crew_text: '',
  });

  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<typeof form>;
        setForm(current => ({ ...current, ...parsed, submitter_email: user.email || '' }));
      }
    } catch { localStorage.removeItem(draftKey); }
  // Restore once per authenticated creator.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (submitted) { localStorage.removeItem(draftKey); return; }
    try { localStorage.setItem(draftKey, JSON.stringify(form)); } catch { /* storage may be unavailable */ }
  }, [draftKey, form, submitted, user?.id]);

  const provisionCreatedLiveEvent = async () => {
    if (!createdScreeningId) return;
    setProvisioningEncoder(true);
    try {
      const { data, error } = await supabase.functions.invoke('media-provider-control', {
        body: { action: 'create_live', screeningId: createdScreeningId, title: form.project_title, description: form.description, recordingEnabled: true },
      });
      if (error || !data?.success || typeof data.streamKey !== 'string' || typeof data.ingestUrl !== 'string') {
        toast.error(data?.error || 'A configured streaming provider is required before an encoder can be provisioned.');
        return;
      }
      setEncoderGrant({ streamId: data.streamId, ingestUrl: data.ingestUrl, streamKey: data.streamKey, playbackUrl: data.playbackUrl, ingestProtocol: data.ingestProtocol, provider: data.provider });
      toast.success('Secure encoder provisioned by the streaming provider.');
    } finally { setProvisioningEncoder(false); }
  };

  const copyEncoderValue = async (value: string) => {
    try { await navigator.clipboard.writeText(value); toast.success('Copied. Keep encoder credentials private.'); }
    catch { toast.error('Clipboard unavailable. Select and copy the value manually.'); }
  };

  const validateStep2 = () => {
    const result = step2Schema.safeParse({ project_title: form.project_title, project_type: form.project_type, release_strategy: form.release_strategy, description: form.description, genres: form.genres, duration_minutes: form.duration_minutes, release_year: form.release_year, cast_crew_text: form.cast_crew_text, budget_range: form.budget_range, live_event_format: form.live_event_format, original_language: form.original_language, production_country: form.production_country, content_rating: form.content_rating, aspect_ratio: form.aspect_ratio, season_number: form.season_number, episode_number: form.episode_number });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach(e => { errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep3 = () => {
    const result = step3Schema.safeParse({ distribution_rights: form.distribution_rights, release_strategy: form.release_strategy, trailer_url: form.trailer_url, screener_url: form.screener_url, premiere_date: form.premiere_date, premiere_time: form.premiere_time, live_price_ngn: form.live_price_ngn, live_price_usd: form.live_price_usd, rights_territories: form.rights_territories, prior_screenings: form.prior_screenings, poster_url: form.poster_url, video_url: form.video_url });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach(e => { errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setSubmitting(true);

    const { data: identity, error: identityError } = await supabase
      .from('profiles')
      .select('kyc_status')
      .eq('user_id', user?.id || '')
      .maybeSingle();
    if (identityError || identity?.kyc_status !== 'verified') {
      toast.error('Verified identity is required before publishing creator content. Nothing was created.');
      setSubmitting(false);
      return;
    }

    const castCrew = form.cast_crew_text.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const [name, ...roleParts] = line.split('—');
      return { name: name.trim(), role: roleParts.join('—').trim() };
    });

    const { data: submission, error } = await supabase.rpc('create_creator_submission', {
      _application: {
        submitter_name: form.submitter_name,
        company_name: form.company_name || null,
        project_title: form.project_title,
        project_type: form.project_type,
        dynamic_metadata: {
          contentType: form.project_type === 'movie' ? 'FILM'
            : form.project_type === 'series' ? 'SERIES'
            : form.project_type === 'episode' ? 'EPISODE'
            : form.project_type === 'short' ? 'SHORT'
            : form.project_type === 'trailer' ? 'TRAILER'
            : form.project_type === 'live' ? 'RECORDED_EVENT' : 'RECORDED_EVENT',
          genres: form.genres,
          castAndCrew: form.cast_crew_text,
          durationMinutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
          releaseYear: form.release_year ? Number(form.release_year) : undefined,
          audienceRating: form.content_rating,
          productionCountry: form.production_country,
          seasonNumber: form.season_number ? Number(form.season_number) : undefined,
          episodeNumber: form.episode_number ? Number(form.episode_number) : undefined,
          liveEventFormat: form.live_event_format,
        },
        release_strategy: form.release_strategy,
        live_event_format: form.live_event_format,
        original_language: form.original_language,
        production_country: form.production_country,
        content_rating: form.content_rating,
        aspect_ratio: form.aspect_ratio,
        season_number: form.season_number ? Number(form.season_number) : null,
        episode_number: form.episode_number ? Number(form.episode_number) : null,
        description: form.description || null,
        genres: form.genres,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes, 10) : null,
        release_year: form.release_year ? parseInt(form.release_year, 10) : null,
        poster_url: form.poster_url || null,
        trailer_url: form.trailer_url || null,
        screener_url: form.screener_url || null,
        video_url: form.video_url || null,
        budget_range: form.budget_range || null,
        distribution_rights: form.distribution_rights || null,
        premiere_date: form.premiere_date || null,
        rights_territories: form.rights_territories.split(',').map(value => value.trim()).filter(Boolean),
        prior_screenings: form.prior_screenings.trim() || null,
        cast_crew: castCrew,
      },
    });

    if (error || !submission?.content_id) {
      toast.error('Content could not be created: ' + (error?.message || 'Please retry.'));
      setSubmitting(false);
      return;
    }
    setCreatedContentId(submission.content_id);

    if (form.poster_url && (form.video_url || ['live', 'series'].includes(form.project_type) || (form.project_type === 'trailer' && form.trailer_url))) {
      const needsScreening = form.project_type === 'live' || form.release_strategy === 'premiere';
      if (needsScreening) {
        if (!form.premiere_date) {
          toast.error('Choose the event date before scheduling.');
          setSubmitting(false);
          return;
        }
        const scheduledDate = new Date(`${form.premiere_date}T${form.premiere_time}:00`);
        if (!Number.isFinite(scheduledDate.getTime()) || scheduledDate.getTime() < Date.now() + 15 * 60 * 1000) {
          toast.error('Choose an event date and time at least 15 minutes in the future.');
          setSubmitting(false);
          return;
        }
        const eventType = form.project_type === 'live' ? 'live' : form.project_type === 'series' ? 'series' : 'film';
        const { data: event, error: eventError } = await supabase.rpc('create_creator_screening', {
          p_content_id: submission.content_id,
          p_screening_date: scheduledDate.toISOString(),
          p_location_pricing: { nigeria: Number(form.live_price_ngn), international: Number(form.live_price_usd) },
          p_event_type: eventType,
          p_slug: form.project_title,
        });
        if (eventError || !(event as { screening_id?: string } | null)?.screening_id) {
          toast.error('The scheduled release could not be published. Your draft is safe; check rights, assets, pricing and event timing.');
          setSubmitting(false);
          return;
        }
        setCreatedScreeningId((event as { screening_id: string }).screening_id);
        setPublished(true);
        toast.success(form.project_type === 'live' ? 'Live event published. Continue below to provision its secure encoder.' : 'Ticketed premiere published and scheduled.');
      } else {
        const { data: publication, error: publishError } = await supabase.rpc('publish_creator_content', { p_content_id: submission.content_id });
        if (!publishError && (publication as { status?: string } | null)?.status === 'published') setPublished(true);
        else toast.info('Your draft is saved. Complete the required master, artwork and rights declaration before publishing.');
      }
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  const handlePosterUpload = async (file: File) => {
    setUploadingPoster(true);
    const ext = file.name.split('.').pop();
    const path = `submissions/${Date.now()}-poster.${ext}`;
    const { data, error } = await supabase.storage.from('content-uploads').upload(path, file);
    if (error) toast.error('Upload failed');
    else {
      const { data: urlData } = supabase.storage.from('content-uploads').getPublicUrl(data.path);
      setForm(f => ({ ...f, poster_url: urlData.publicUrl }));
      toast.success('Artwork uploaded!');
    }
    setUploadingPoster(false);
  };

  const handleVideoUpload = async (file: File) => {
    if (!user?.id) {
      toast.error('Sign in again before uploading media.');
      return;
    }
    const allowed = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/mpeg']);
    if (!allowed.has(file.type)) {
      toast.error('Upload an MP4, MOV, WebM, MKV or MPEG master file.');
      return;
    }
    if (file.size <= 0 || file.size > 2 * 1024 * 1024 * 1024) {
      toast.error('Master video must be smaller than 2 GB.');
      return;
    }
    setUploadingVideo(true);
    setVideoProgress(0);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const path = `${user.id}/masters/${crypto.randomUUID()}.${extension}`;
    try {
      const { data, error } = await supabase.storage.from('creator-masters').upload(path, file, {
        cacheControl: '0',
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      setForm(current => ({ ...current, video_url: data.path }));
      setVideoProgress(100);
      toast.success('Private master uploaded to your creator vault. Publishing is enabled for approved creators when required assets and delivery checks pass.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Private master upload failed.');
    } finally {
      setUploadingVideo(false);
    }
  };


  const toggleGenre = (genre: string) => {
    setForm(f => ({
      ...f,
      genres: f.genres.includes(genre) ? f.genres.filter(g => g !== genre) : [...f.genres, genre]
    }));
  };

  if (submitted) {
    return (
      <StudioLayout title={published ? "Published to Studio" : "Draft saved"}>
        <div className="max-w-lg mx-auto py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3">{published ? 'Content published' : 'Draft saved to Studio'}</h2>
          <p className="text-muted-foreground mb-6">
            {published ? `"${form.project_title}" is now live on DeGameTV and can be shared.` : `"${form.project_title}" is saved as a draft. Add required assets and complete its content-specific assets and rights declaration, then publish whenever you are ready.`}
          </p>
          <div className="flex flex-col gap-3">
            {form.project_type === 'live' && createdScreeningId && <Card className="text-left"><CardHeader><CardTitle className="text-base">Go live · Secure encoder</CardTitle><CardDescription>Provisioning is performed by your configured streaming provider. The stream key is shown only after provider confirmation.</CardDescription></CardHeader><CardContent className="space-y-3">{encoderGrant ? <><Badge>Encoder provisioned · {encoderGrant.provider}</Badge><div><Label>Ingest server</Label><div className="flex gap-2"><Input readOnly value={encoderGrant.ingestUrl}/><Button type="button" variant="outline" onClick={() => copyEncoderValue(encoderGrant.ingestUrl)}>Copy</Button></div></div><div><Label>One-time stream key</Label><div className="flex gap-2"><Input readOnly type="password" value={encoderGrant.streamKey}/><Button type="button" variant="outline" onClick={() => copyEncoderValue(encoderGrant.streamKey)}>Copy</Button></div></div><p className="text-xs text-muted-foreground">Add the server and key to OBS, vMix or another supported encoder. Never share the stream key.</p></> : <Button className="w-full" disabled={provisioningEncoder} onClick={provisionCreatedLiveEvent}>{provisioningEncoder ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Film className="mr-2 h-4 w-4"/>}{provisioningEncoder ? 'Provisioning…' : 'Provision secure encoder'}</Button>}</CardContent></Card>}\n            <Button variant="outline" className="rounded-full" onClick={() => navigate('/studio/movies')}>View My Content</Button>
            <Button variant="ghost" className="rounded-full" onClick={() => { setSubmitted(false); setStep(2); setCreatedContentId(null); setCreatedScreeningId(null); setEncoderGrant(null); setForm(f => ({ ...f, project_title: '', description: '', genres: [], duration_minutes: '', poster_url: '' })); }}>
              Create another
            </Button>
          </div>
        </div>
      </StudioLayout>
    );
  }




  return (
    <StudioLayout title="Create" description="Publish films, series, shorts, trailers, VOD and live cinema events from one creator workspace.">
      <div className="space-y-5">
        <Tabs value={liveFlow ? 'live' : 'content'} onValueChange={selectCreateFlow}>
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="content">Create content</TabsTrigger>
            <TabsTrigger value="live">Go live</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="max-w-3xl mx-auto">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {[2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === s ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s === 2 ? 'Project' : 'Assets'}
              </span>
              {s < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Film className="w-4 h-4" /> {liveFlow ? "Event details" : `${form.project_type === "movie" ? "Film" : form.project_type === "series" ? "Series" : form.project_type === "episode" ? "Episode" : form.project_type === "short" ? "Short-form" : form.project_type === "trailer" ? "Trailer" : "On-demand"} details`}</CardTitle>
                <CardDescription>{liveFlow ? "Set the event identity and format. Configure ticket access and streaming in the next step." : "Tell audiences and distribution partners what makes this production distinct. Fields adapt to your selected format."}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{liveFlow ? 'Event title' : 'Title'} <span className="text-destructive">*</span></Label>
                    <Input value={form.project_title} onChange={e => setForm(f => ({ ...f, project_title: e.target.value }))} placeholder={liveFlow ? 'e.g. The Lagos Creators Live Experience' : 'e.g. The Last Harvest'} />
                    {errors.project_title && <p className="text-xs text-destructive">{errors.project_title}</p>}
                  </div>
                  {!liveFlow ? <div className="space-y-2">
                    <Label>Content type</Label>
                    <Select value={form.project_type} onValueChange={v => setForm(f => ({ ...f, project_type: v, release_strategy: (!['movie', 'series'].includes(v) || f.release_strategy === 'live') ? 'on_demand' : f.release_strategy, aspect_ratio: v === 'short' ? '9:16' : v === 'movie' ? '2.39:1' : f.aspect_ratio }))}>
                      <SelectTrigger><SelectValue placeholder="Choose a format" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="movie">Feature film</SelectItem>
                        <SelectItem value="series">Series</SelectItem>
                        <SelectItem value="episode">Series episode</SelectItem>
                        <SelectItem value="short">Short film</SelectItem>
                        <SelectItem value="trailer">Trailer</SelectItem>
                        <SelectItem value="vod">Video on demand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div> : <div className="space-y-2"><Label>Event type</Label><Select value={form.live_event_format} onValueChange={v => setForm(f => ({ ...f, live_event_format: v }))}><SelectTrigger><SelectValue placeholder="Choose your live event type" /></SelectTrigger><SelectContent><SelectItem value="broadcast">Live broadcast</SelectItem><SelectItem value="concert">Concert / performance</SelectItem><SelectItem value="conference">Conference / summit</SelectItem><SelectItem value="talk">Talk / podcast / interview</SelectItem><SelectItem value="gaming">Gaming / esports</SelectItem><SelectItem value="watch_party">Watch party</SelectItem><SelectItem value="sports">Sports event</SelectItem><SelectItem value="worship">Worship / community gathering</SelectItem><SelectItem value="other">Other live event</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Choose the event category. Configure the details, admission prices and encoder access below.</p></div>}
                </div>
                {!liveFlow ? <div className="space-y-2">
                  <Label>Release strategy</Label>
                  <Select value={form.release_strategy} onValueChange={v => setForm(f => ({ ...f, release_strategy: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_demand">Publish to on-demand catalogue</SelectItem>
                      {(form.project_type === 'movie' || form.project_type === 'series') && <SelectItem value="premiere">Ticketed virtual premiere</SelectItem>}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Your release choice controls scheduling, ticket pricing and publishing.</p>
                </div> : <div className="space-y-2"><Label>Release strategy</Label><div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm font-medium">Live broadcast · paid or free admission</div></div>}
                <div className="space-y-2">
                  <Label>{liveFlow ? 'Event description' : 'Synopsis'}</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder={liveFlow ? 'Tell viewers what will happen, who is hosting and what their ticket includes.' : 'Write a short synopsis that helps audiences understand your title.'} />
                </div>
                {!liveFlow && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Original language</Label><Select value={form.original_language} onValueChange={v => setForm(f => ({...f, original_language:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LANGUAGES.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Production country</Label><Select value={form.production_country} onValueChange={v => setForm(f => ({...f, production_country:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COUNTRIES.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Audience rating</Label><Select value={form.content_rating} onValueChange={v => setForm(f => ({...f, content_rating:v as typeof f.content_rating}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTENT_RATINGS.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Master aspect ratio</Label><Select value={form.aspect_ratio} onValueChange={v => setForm(f => ({...f, aspect_ratio:v as typeof f.aspect_ratio}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ASPECT_RATIOS.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                </div>}
                {!liveFlow && ['series','episode'].includes(form.project_type) && <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Season number</Label><Input inputMode="numeric" value={form.season_number} onChange={e=>setForm(f=>({...f,season_number:e.target.value}))} placeholder="e.g. 1"/>{errors.season_number&&<p className="text-xs text-destructive">{errors.season_number}</p>}</div>
                  {form.project_type === 'episode' && <div className="space-y-2"><Label>Episode number</Label><Input inputMode="numeric" value={form.episode_number} onChange={e=>setForm(f=>({...f,episode_number:e.target.value}))} placeholder="e.g. 3"/>{errors.episode_number&&<p className="text-xs text-destructive">{errors.episode_number}</p>}</div>}
                </div>}
                {!liveFlow && <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (mins)</Label>
                    <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
                    {errors.duration_minutes && <p className="text-xs text-destructive">{errors.duration_minutes}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Release Year</Label>
                    <Input type="number" value={form.release_year} onChange={e => setForm(f => ({ ...f, release_year: e.target.value }))} />
                    {errors.release_year && <p className="text-xs text-destructive">{errors.release_year}</p>}
                  </div>
                </div>}
                {!liveFlow && <div className="space-y-2">
                  <Label>Genres</Label>
                  <div className="flex flex-wrap gap-2">
                    {(GENRES_BY_TYPE[form.project_type] || GENRES).map(g => (
                      <button key={g} type="button" onClick={() => toggleGenre(g)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${form.genres.includes(g) ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>}
                {!liveFlow && <div className="space-y-2">
                  <Label>Cast & Crew</Label>
                  <Textarea value={form.cast_crew_text} onChange={e => setForm(f => ({ ...f, cast_crew_text: e.target.value }))} rows={3} placeholder={'Name — Role, one person per line'} />
                </div>}
                <div className="flex gap-3">
                  {!liveFlow && <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setStep(1)}>Back</Button>}
                  <Button type="button" className="flex-1 rounded-full" onClick={() => { if (validateStep2()) setStep(3); }}>
                    {liveFlow ? 'Continue to event setup' : 'Next'} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Link2 className="w-4 h-4" /> Links & Assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Content Artwork / Poster</Label>
                  <div className="flex items-center gap-3">
                    {form.poster_url ? (
                      <img src={form.poster_url} alt="Poster" className="w-16 h-24 object-cover rounded-lg" />
                    ) : (
                      <div className="w-16 h-24 rounded-lg bg-secondary flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <label className="flex-1">
                      <Button type="button" variant="outline" className="w-full" disabled={uploadingPoster} asChild>
                        <span>
                          {uploadingPoster ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                          {uploadingPoster ? 'Uploading...' : 'Upload Poster'}
                        </span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePosterUpload(e.target.files[0])} />
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Private Master Video (MP4/MOV/WebM/MKV)</Label>
                  <div className="flex items-center gap-3">
                    <div className={`w-16 h-24 rounded-lg flex items-center justify-center ${form.video_url ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      <Film className="w-6 h-6" />
                    </div>
                    <label className="flex-1">
                      <Button type="button" variant="outline" className="w-full" disabled={uploadingVideo} asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload master video
                        </span>
                      </Button>
                      <input aria-label="Master video file" type="file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/mpeg" className="hidden" disabled={uploadingVideo} onChange={e => e.target.files?.[0] && handleVideoUpload(e.target.files[0])} />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">Stored in a private, owner-scoped bucket. The master is never exposed through a public URL; playback remains disabled until a secure delivery provider is configured.</p>{videoProgress > 0 && <div className="h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary" style={{ width: `${videoProgress}%` }} /></div>}
                </div>
                <div className="space-y-2">
                  <Label>Trailer URL</Label>
                  <Input value={form.trailer_url} onChange={e => setForm(f => ({ ...f, trailer_url: e.target.value }))} placeholder="https://..." />
                  {errors.trailer_url && <p className="text-xs text-destructive">{errors.trailer_url}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Screener URL</Label>
                  <Input value={form.screener_url} onChange={e => setForm(f => ({ ...f, screener_url: e.target.value }))} placeholder="https://vimeo.com/..." />
                  {errors.screener_url && <p className="text-xs text-destructive">{errors.screener_url}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Budget Range</Label>
                    <Select value={form.budget_range} onValueChange={v => setForm(f => ({ ...f, budget_range: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{BUDGET_RANGES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rights Declaration <span className="text-destructive">*</span></Label>
                    <Select value={form.distribution_rights} onValueChange={v => setForm(f => ({ ...f, distribution_rights: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{RIGHTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {form.project_type === 'live' || form.release_strategy === 'premiere' ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Event date</Label><Input type="date" required value={form.premiere_date} onChange={e => setForm(f => ({ ...f, premiere_date: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Start time</Label><Input type="time" required value={form.premiere_time} onChange={e => setForm(f => ({ ...f, premiere_time: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Admission price (NGN)</Label><Input inputMode="decimal" required value={form.live_price_ngn} onChange={e => setForm(f => ({ ...f, live_price_ngn: e.target.value }))} placeholder="e.g. 2500" />{errors.live_price_ngn && <p className="text-xs text-destructive">{errors.live_price_ngn}</p>}</div>
                  <div className="space-y-2"><Label>International admission (USD)</Label><Input inputMode="decimal" required value={form.live_price_usd} onChange={e => setForm(f => ({ ...f, live_price_usd: e.target.value }))} placeholder="e.g. 5" />{errors.live_price_usd && <p className="text-xs text-destructive">{errors.live_price_usd}</p>}</div>
                </div> : null}
                <div className="space-y-2"><Label>Rights Territories</Label><Input value={form.rights_territories} onChange={e => setForm(f => ({ ...f, rights_territories: e.target.value }))} placeholder="NG, GH, GB, US" /></div>
                <div className="space-y-2">
                  <Label>Prior Screenings</Label>
                  <Textarea value={form.prior_screenings} onChange={e => setForm(f => ({ ...f, prior_screenings: e.target.value }))} rows={2} placeholder="Festivals, cinemas, or previous digital releases" />
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setStep(2)}>Back</Button>
                  <Button type="submit" className="flex-1 rounded-full" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    {submitting ? 'Publishing...' : 'Save draft / Publish'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
        </div>
      </div>
    </StudioLayout>
  );
}
