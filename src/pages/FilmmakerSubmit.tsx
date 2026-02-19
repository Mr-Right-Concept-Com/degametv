import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  Film, Upload, CheckCircle, ChevronRight, Loader2,
  Image as ImageIcon, Link2, Star, Users, Globe, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance', 'Documentary', 'Animation', 'Sci-Fi', 'Fantasy', 'Crime', 'Biography', 'Musical', 'Nollywood', 'African Cinema'];
const BUDGET_RANGES = ['Under $10K', '$10K – $50K', '$50K – $250K', '$250K – $1M', '$1M – $5M', 'Over $5M'];
const RIGHTS = ['World rights available', 'African distribution only', 'Nigeria only', 'Digital/VOD only', 'Festival rights only', 'Revenue share open'];

const emptyForm = {
  submitter_name: '',
  submitter_email: '',
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
};

export default function FilmmakerSubmit() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.submitter_name || !form.submitter_email || !form.project_title) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('filmmaker_submissions').insert({
      submitter_name: form.submitter_name,
      submitter_email: form.submitter_email,
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
      status: 'pending',
    });
    if (error) {
      toast.error('Submission failed: ' + error.message);
    } else {
      setSubmitted(true);
    }
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
      genres: f.genres.includes(genre)
        ? f.genres.filter(g => g !== genre)
        : [...f.genres, genre]
    }));
  };

  if (submitted) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Submission Received!</h1>
          <p className="text-muted-foreground mb-2">
            Thank you, <strong>{form.submitter_name}</strong>. We've received your submission for <strong>"{form.project_title}"</strong>.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Our acquisitions team will review it and reach out to <strong>{form.submitter_email}</strong> within 5–7 business days.
          </p>
          <div className="flex flex-col gap-3">
            <Button className="rounded-full" onClick={() => { setSubmitted(false); setForm(emptyForm); setStep(1); }}>
              Submit Another Project
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => window.location.href = '/'}>
              Back to Home
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Hero */}
      <div className="bg-primary text-primary-foreground py-12 px-4 text-center">
        <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-4 text-xs font-semibold tracking-wider rounded-full px-4 py-1">
          🎬 FILMMAKER PORTAL
        </Badge>
        <h1 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight">Submit Your Film</h1>
        <p className="text-primary-foreground/80 max-w-xl mx-auto text-sm md:text-base">
          Partner with DeGameTV to premiere your film to audiences across Africa and the world. 
          We offer virtual cinema, VOD, and distribution for Nollywood and African cinema.
        </p>
      </div>

      {/* Why Partner With Us */}
      <div className="bg-secondary/30 py-10 px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: Globe, title: 'Global Reach', desc: 'Nigerian & international audience across web, mobile, and TV' },
            { icon: Star, title: 'Premium Premieres', desc: 'Exclusive virtual cinema events with real-time ticket sales' },
            { icon: Users, title: 'Revenue Share', desc: 'Flexible monetization: tickets, VOD, subscriptions & licensing' },
          ].map(f => (
            <div key={f.title} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === s ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s === 1 ? 'Contact' : s === 2 ? 'Project Details' : 'Links & Assets'}
              </span>
              {s < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Contact */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" /> Your Contact Info
                </CardTitle>
                <CardDescription>Tell us who you are and how to reach you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.submitter_name}
                      onChange={e => setForm(f => ({ ...f, submitter_name: e.target.value }))}
                      placeholder="e.g. Kemi Adeyemi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address <span className="text-destructive">*</span></Label>
                    <Input
                      type="email"
                      value={form.submitter_email}
                      onChange={e => setForm(f => ({ ...f, submitter_email: e.target.value }))}
                      placeholder="you@studio.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company / Studio Name</Label>
                  <Input
                    value={form.company_name}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="e.g. Nile Pictures"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full rounded-full"
                  onClick={() => {
                    if (!form.submitter_name || !form.submitter_email) { toast.error('Name and email are required'); return; }
                    setStep(2);
                  }}
                >
                  Next: Project Details <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Project Details */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Film className="w-4 h-4" /> Project Details
                </CardTitle>
                <CardDescription>Tell us about your film</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Title <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.project_title}
                      onChange={e => setForm(f => ({ ...f, project_title: e.target.value }))}
                      placeholder="e.g. Keleke the Movie"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select value={form.project_type} onValueChange={v => setForm(f => ({ ...f, project_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="movie">Feature Film</SelectItem>
                        <SelectItem value="series">Series / TV Show</SelectItem>
                        <SelectItem value="short">Short Film</SelectItem>
                        <SelectItem value="documentary">Documentary</SelectItem>
                        <SelectItem value="animation">Animation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Synopsis</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Tell us what makes your film unique..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (mins)</Label>
                    <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="95" />
                  </div>
                  <div className="space-y-2">
                    <Label>Release Year</Label>
                    <Input type="number" value={form.release_year} onChange={e => setForm(f => ({ ...f, release_year: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Genres</Label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGenre(g)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          form.genres.includes(g)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setStep(1)}>Back</Button>
                  <Button type="button" className="flex-1 rounded-full" onClick={() => {
                    if (!form.project_title) { toast.error('Project title is required'); return; }
                    setStep(3);
                  }}>
                    Next: Links & Assets <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Links & Assets */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Links & Assets
                </CardTitle>
                <CardDescription>Upload your poster and share screener/trailer links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Poster Upload */}
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
                  <Label>Trailer URL (YouTube / Vimeo)</Label>
                  <Input value={form.trailer_url} onChange={e => setForm(f => ({ ...f, trailer_url: e.target.value }))} placeholder="https://youtu.be/..." />
                </div>

                <div className="space-y-2">
                  <Label>Private Screener URL</Label>
                  <Input value={form.screener_url} onChange={e => setForm(f => ({ ...f, screener_url: e.target.value }))} placeholder="https://vimeo.com/..." />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Budget Range</Label>
                    <Select value={form.budget_range} onValueChange={v => setForm(f => ({ ...f, budget_range: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        {BUDGET_RANGES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Distribution Rights</Label>
                    <Select value={form.distribution_rights} onValueChange={v => setForm(f => ({ ...f, distribution_rights: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select rights" /></SelectTrigger>
                      <SelectContent>
                        {RIGHTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setStep(2)}>Back</Button>
                  <Button type="submit" className="flex-1 rounded-full" disabled={submitting}>
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 mr-2" /> Submit Project</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </MainLayout>
  );
}
