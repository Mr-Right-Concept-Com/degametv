import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Film, Upload, CheckCircle, ChevronRight, Loader2,
  Image as ImageIcon, Link2, ArrowRight, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance', 'Documentary', 'Animation', 'Sci-Fi', 'Fantasy', 'Crime', 'Biography', 'Musical', 'Nollywood', 'African Cinema'];
const BUDGET_RANGES = ['Under $10K', '$10K – $50K', '$50K – $250K', '$250K – $1M', '$1M – $5M', 'Over $5M'];
const RIGHTS = ['World rights available', 'African distribution only', 'Nigeria only', 'Digital/VOD only', 'Festival rights only', 'Revenue share open'];

const step1Schema = z.object({
  submitter_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
});

const step2Schema = z.object({
  project_title: z.string().trim().min(1, 'Title is required').max(200),
  duration_minutes: z.string().optional().refine(v => !v || (parseInt(v) > 0 && parseInt(v) < 1000), 'Invalid duration'),
  release_year: z.string().optional().refine(v => !v || (parseInt(v) >= 1900 && parseInt(v) <= new Date().getFullYear() + 5), 'Invalid year'),
});

const step3Schema = z.object({
  trailer_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  screener_url: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export default function StudioSubmit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdContentId, setCreatedContentId] = useState<string | null>(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    submitter_name: '',
    submitter_email: user?.email || '',
    company_name: '',
    project_title: '',
    project_type: 'movie',
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
  });

  const validateStep1 = () => {
    const result = step1Schema.safeParse({ submitter_name: form.submitter_name });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach(e => { errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep2 = () => {
    const result = step2Schema.safeParse({ project_title: form.project_title, duration_minutes: form.duration_minutes, release_year: form.release_year });
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
    const result = step3Schema.safeParse({ trailer_url: form.trailer_url, screener_url: form.screener_url });
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
    // Auto-approved because user is KYC verified
    const { data: sub, error } = await supabase.from('filmmaker_submissions').insert({
      submitter_name: form.submitter_name,
      submitter_email: user?.email || form.submitter_email,
      company_name: form.company_name || null,
      project_title: form.project_title,
      project_type: form.project_type,
      description: form.description || null,
      genres: form.genres.length > 0 ? form.genres : null,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      release_year: form.release_year ? parseInt(form.release_year) : null,
      poster_url: form.poster_url || null,
      trailer_url: form.trailer_url || null,
      screener_url: form.screener_url || null,
      video_url: form.video_url || null,
      budget_range: form.budget_range || null,
      distribution_rights: form.distribution_rights || null,
      status: 'approved',
      admin_notes: 'Auto-approved: filmmaker KYC verified',
    }).select('id').single();

    if (error || !sub) {
      toast.error('Submission failed: ' + (error?.message || 'unknown'));
      setSubmitting(false);
      return;
    }

    // Auto-create content record so the film is live-ready
    const slug = form.project_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
    const { data: content } = await supabase.from('content').insert({
      title: form.project_title,
      slug,
      description: form.description || '',
      type: (form.project_type === 'series' ? 'series' : 'movie') as any,
      status: 'published' as any,
      poster_url: form.poster_url || null,
      trailer_url: form.trailer_url || null,
      video_url: form.video_url || null,
      duration: form.duration_minutes ? parseInt(form.duration_minutes) * 60 : null,
      genres: form.genres.length > 0 ? form.genres : null,
      release_date: form.release_year ? `${form.release_year}-01-01` : null,
    } as any).select('id').single();

    if (content) {
      await supabase.from('filmmaker_submissions').update({ content_id: content.id }).eq('id', sub.id);
      setCreatedContentId(content.id);
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
      toast.success('Poster uploaded!');
    }
    setUploadingPoster(false);
  };

  const toggleGenre = (genre: string) => {
    setForm(f => ({
      ...f,
      genres: f.genres.includes(genre) ? f.genres.filter(g => g !== genre) : [...f.genres, genre]
    }));
  };

  if (submitted) {
    return (
      <StudioLayout title="Film Published">
        <div className="max-w-lg mx-auto py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Your Film is Live!</h2>
          <p className="text-muted-foreground mb-6">
            "{form.project_title}" was auto-approved (KYC verified) and is now in your catalog. Schedule a premiere or set up ticketing next.
          </p>
          <div className="flex flex-col gap-3">
            <Button className="rounded-full" onClick={() => navigate('/studio/screenings')}>Schedule Premiere</Button>
            <Button variant="outline" className="rounded-full" onClick={() => navigate('/studio/movies')}>View My Movies</Button>
            <Button variant="ghost" className="rounded-full" onClick={() => { setSubmitted(false); setStep(1); setCreatedContentId(null); setForm(f => ({ ...f, project_title: '', description: '', genres: [], duration_minutes: '', poster_url: '' })); }}>
              Submit Another
            </Button>
          </div>
        </div>
      </StudioLayout>
    );
  }




  return (
    <StudioLayout title="Submit Film" description="Upload your movie for review and distribution">
      <div className="max-w-2xl mx-auto">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === s ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s === 1 ? 'Your Info' : s === 2 ? 'Project' : 'Assets'}
              </span>
              {s < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Your Info</CardTitle>
                <CardDescription>Your email is pre-filled from your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name <span className="text-destructive">*</span></Label>
                    <Input value={form.submitter_name} onChange={e => setForm(f => ({ ...f, submitter_name: e.target.value }))} placeholder="e.g. Kemi Adeyemi" />
                    {errors.submitter_name && <p className="text-xs text-destructive">{errors.submitter_name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ''} disabled className="bg-muted" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company / Studio</Label>
                  <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="e.g. Nile Pictures" />
                </div>
                <Button type="button" className="w-full rounded-full" onClick={() => { if (validateStep1()) setStep(2); }}>
                  Next: Project Details <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Film className="w-4 h-4" /> Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title <span className="text-destructive">*</span></Label>
                    <Input value={form.project_title} onChange={e => setForm(f => ({ ...f, project_title: e.target.value }))} />
                    {errors.project_title && <p className="text-xs text-destructive">{errors.project_title}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.project_type} onValueChange={v => setForm(f => ({ ...f, project_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="movie">Feature Film</SelectItem>
                        <SelectItem value="series">Series</SelectItem>
                        <SelectItem value="short">Short Film</SelectItem>
                        <SelectItem value="documentary">Documentary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Synopsis</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                <div className="space-y-2">
                  <Label>Genres</Label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map(g => (
                      <button key={g} type="button" onClick={() => toggleGenre(g)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${form.genres.includes(g) ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setStep(1)}>Back</Button>
                  <Button type="button" className="flex-1 rounded-full" onClick={() => { if (validateStep2()) setStep(3); }}>
                    Next <ArrowRight className="w-4 h-4 ml-2" />
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
                  <Label>Movie Poster</Label>
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
                  <Label>Trailer URL</Label>
                  <Input value={form.trailer_url} onChange={e => setForm(f => ({ ...f, trailer_url: e.target.value }))} placeholder="https://youtu.be/..." />
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
                    <Label>Distribution Rights</Label>
                    <Select value={form.distribution_rights} onValueChange={v => setForm(f => ({ ...f, distribution_rights: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{RIGHTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setStep(2)}>Back</Button>
                  <Button type="submit" className="flex-1 rounded-full" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    {submitting ? 'Submitting...' : 'Submit Film'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </StudioLayout>
  );
}
