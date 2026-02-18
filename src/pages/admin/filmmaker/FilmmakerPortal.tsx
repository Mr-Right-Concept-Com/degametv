import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import {
  Upload, Film, Users, CheckCircle, Clock, XCircle, Eye,
  FileVideo, Image, Link2, Plus, RefreshCw, Loader2, Search,
  Star, ChevronRight, Edit, Check, X
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance', 'Documentary', 'Animation', 'Sci-Fi', 'Fantasy', 'Crime', 'Biography', 'Musical', 'Nollywood', 'African Cinema'];
const BUDGET_RANGES = ['Under $10K', '$10K – $50K', '$50K – $250K', '$250K – $1M', '$1M – $5M', 'Over $5M'];
const RIGHTS = ['World rights available', 'African distribution only', 'Nigeria only', 'Digital/VOD only', 'Festival rights only', 'Revenue share open'];

interface Submission {
  id: string;
  submitter_name: string;
  submitter_email: string;
  company_name: string | null;
  project_title: string;
  project_type: string;
  description: string | null;
  genres: string[] | null;
  duration_minutes: number | null;
  release_year: number | null;
  poster_url: string | null;
  trailer_url: string | null;
  screener_url: string | null;
  video_url: string | null;
  budget_range: string | null;
  distribution_rights: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

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

export default function FilmmakerPortal() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingScreener, setUploadingScreener] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('filmmaker_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load submissions');
    else setSubmissions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, []);

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
      toast.success('Project submitted successfully! Our team will review it shortly.');
      setForm(emptyForm);
      fetchSubmissions();
    }
    setSubmitting(false);
  };

  const handleFileUpload = async (
    file: File,
    type: 'poster' | 'screener',
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `submissions/${Date.now()}-${type}.${ext}`;
    const { data, error } = await supabase.storage.from('content-uploads').upload(path, file);
    if (error) {
      toast.error('Upload failed: ' + error.message);
    } else {
      const { data: urlData } = supabase.storage.from('content-uploads').getPublicUrl(data.path);
      if (type === 'poster') setForm(f => ({ ...f, poster_url: urlData.publicUrl }));
      else setForm(f => ({ ...f, screener_url: urlData.publicUrl }));
      toast.success(`${type === 'poster' ? 'Poster' : 'Screener'} uploaded!`);
    }
    setUploading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingStatus(true);
    const { error } = await supabase
      .from('filmmaker_submissions')
      .update({ status, admin_notes: adminNote || undefined })
      .eq('id', id);
    if (error) toast.error('Update failed');
    else {
      toast.success(`Submission ${status}`);
      setSelectedSubmission(null);
      fetchSubmissions();
    }
    setUpdatingStatus(false);
  };

  const toggleGenre = (genre: string) => {
    setForm(f => ({
      ...f,
      genres: f.genres.includes(genre)
        ? f.genres.filter(g => g !== genre)
        : [...f.genres, genre]
    }));
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'in_review': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const filtered = submissions.filter(s => {
    const matchesSearch = !searchQuery || 
      s.project_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.submitter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.submitter_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    inReview: submissions.filter(s => s.status === 'in_review').length,
    approved: submissions.filter(s => s.status === 'approved').length,
  };

  return (
    <AdminLayout title="Filmmaker Portal" description="Manage filmmaker submissions, studio uploads, and content acquisition">
      <Tabs defaultValue="submissions" className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="submissions">All Submissions</TabsTrigger>
          <TabsTrigger value="submit">Submit Project</TabsTrigger>
          <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
        </TabsList>

        {/* ─── SUBMISSIONS LIST ─── */}
        <TabsContent value="submissions" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Submitted', value: stats.total, icon: Film, color: 'text-primary' },
              { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-yellow-400' },
              { label: 'In Review', value: stats.inReview, icon: Eye, color: 'text-blue-400' },
              { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-400' },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, filmmaker, or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'pending', 'in_review', 'approved', 'rejected'].map(s => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  className="capitalize text-xs"
                >
                  {s === 'all' ? 'All' : s.replace('_', ' ')}
                </Button>
              ))}
              <Button onClick={fetchSubmissions} variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No submissions yet. Share the Submit Project tab with filmmakers.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Filmmaker</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Genres</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(sub => (
                        <TableRow key={sub.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setSelectedSubmission(sub); setAdminNote(sub.admin_notes || ''); }}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {sub.poster_url ? (
                                <img src={sub.poster_url} alt={sub.project_title} className="w-10 h-14 object-cover rounded" />
                              ) : (
                                <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                                  <Film className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{sub.project_title}</p>
                                {sub.release_year && <p className="text-xs text-muted-foreground">{sub.release_year}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{sub.submitter_name}</p>
                              <p className="text-xs text-muted-foreground">{sub.submitter_email}</p>
                              {sub.company_name && <p className="text-xs text-muted-foreground">{sub.company_name}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize text-sm">{sub.project_type}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {sub.genres?.slice(0, 2).map(g => (
                                <Badge key={g} variant="outline" className="text-[10px] px-1 py-0">{g}</Badge>
                              ))}
                              {(sub.genres?.length || 0) > 2 && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">+{(sub.genres?.length || 0) - 2}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColor(sub.status)}>
                              {sub.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(sub.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setSelectedSubmission(sub); setAdminNote(sub.admin_notes || ''); }}>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── SUBMIT PROJECT ─── */}
        <TabsContent value="submit">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Project Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Film className="w-4 h-4" /> Project Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Project Title <span className="text-destructive">*</span></Label>
                        <Input
                          placeholder="e.g. Keleke the Movie"
                          value={form.project_title}
                          onChange={e => setForm(f => ({ ...f, project_title: e.target.value }))}
                          required
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
                      <Label>Synopsis / Description</Label>
                      <Textarea
                        placeholder="Tell us about your project — plot, themes, what makes it unique..."
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Duration (minutes)</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 95"
                          value={form.duration_minutes}
                          onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Release Year</Label>
                        <Input
                          type="number"
                          placeholder="2025"
                          value={form.release_year}
                          onChange={e => setForm(f => ({ ...f, release_year: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Genres */}
                    <div className="space-y-2">
                      <Label>Genres (select all that apply)</Label>
                      <div className="flex flex-wrap gap-2">
                        {GENRES.map(genre => (
                          <button
                            type="button"
                            key={genre}
                            onClick={() => toggleGenre(genre)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                              form.genres.includes(genre)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                            }`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Media Links */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileVideo className="w-4 h-4" /> Media & Screener
                    </CardTitle>
                    <CardDescription>Provide links to your trailer, screener, or full video. Use Google Drive, Vimeo, Dropbox, etc.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Link2 className="w-3 h-3" /> Trailer URL (YouTube / Vimeo)</Label>
                      <Input
                        placeholder="https://youtube.com/watch?v=..."
                        value={form.trailer_url}
                        onChange={e => setForm(f => ({ ...f, trailer_url: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Link2 className="w-3 h-3" /> Screener / Full Film URL</Label>
                      <Input
                        placeholder="https://vimeo.com/... or Google Drive / Dropbox link"
                        value={form.screener_url}
                        onChange={e => setForm(f => ({ ...f, screener_url: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><FileVideo className="w-3 h-3" /> Final Video URL (HLS/MP4 if available)</Label>
                      <Input
                        placeholder="https://cdn.example.com/movie.m3u8"
                        value={form.video_url}
                        onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                      />
                    </div>

                    {/* Poster upload */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Image className="w-3 h-3" /> Movie Poster</Label>
                      <div className="flex gap-3 items-start">
                        {form.poster_url && (
                          <img src={form.poster_url} alt="Poster preview" className="w-16 h-22 object-cover rounded-lg border border-border" />
                        )}
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Paste poster URL or upload below"
                            value={form.poster_url}
                            onChange={e => setForm(f => ({ ...f, poster_url: e.target.value }))}
                          />
                          <label className="block">
                            <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                              {uploadingPoster ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="text-sm text-muted-foreground">
                                {uploadingPoster ? 'Uploading...' : 'Upload poster image (JPG/PNG)'}
                              </span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, 'poster', setUploadingPoster);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Business */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Star className="w-4 h-4" /> Distribution & Business
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Production Budget Range</Label>
                        <Select value={form.budget_range} onValueChange={v => setForm(f => ({ ...f, budget_range: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                          <SelectContent>
                            {BUDGET_RANGES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Distribution Rights Available</Label>
                        <Select value={form.distribution_rights} onValueChange={v => setForm(f => ({ ...f, distribution_rights: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select rights" /></SelectTrigger>
                          <SelectContent>
                            {RIGHTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Filmmaker Info */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="w-4 h-4" /> Filmmaker / Studio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="Director / Producer name"
                        value={form.submitter_name}
                        onChange={e => setForm(f => ({ ...f, submitter_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address <span className="text-destructive">*</span></Label>
                      <Input
                        type="email"
                        placeholder="filmmaker@studio.com"
                        value={form.submitter_email}
                        onChange={e => setForm(f => ({ ...f, submitter_email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Production Company / Studio</Label>
                      <Input
                        placeholder="e.g. Inkblot Productions"
                        value={form.company_name}
                        onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Submission Summary */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm">Submission Checklist</h3>
                    {[
                      { label: 'Filmmaker name', done: !!form.submitter_name },
                      { label: 'Contact email', done: !!form.submitter_email },
                      { label: 'Project title', done: !!form.project_title },
                      { label: 'Synopsis', done: !!form.description },
                      { label: 'Genres selected', done: form.genres.length > 0 },
                      { label: 'Trailer or screener', done: !!(form.trailer_url || form.screener_url) },
                      { label: 'Poster image', done: !!form.poster_url },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2 text-sm">
                        {item.done
                          ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                          : <div className="w-4 h-4 rounded-full border border-muted-foreground/40 shrink-0" />
                        }
                        <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Submit Project
                </Button>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* ─── GUIDELINES ─── */}
        <TabsContent value="guidelines">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              {
                icon: '🎬',
                title: 'What We Accept',
                items: [
                  'Feature films (60+ min)',
                  'Short films (under 30 min)',
                  'Documentary films',
                  'Animated films and series',
                  'African / Nollywood productions',
                  'International co-productions',
                ],
              },
              {
                icon: '📋',
                title: 'Submission Requirements',
                items: [
                  'Completed or near-complete projects only',
                  'English or subtitled in English',
                  'Minimum 720p resolution screener',
                  'Clear chain of title and rights documentation',
                  'Trailer or screener link required',
                  'Synopsis and genre classification',
                ],
              },
              {
                icon: '💰',
                title: 'Revenue Model',
                items: [
                  'TVOD: Pay-per-view ticket sales',
                  'SVOD: Subscription library placement',
                  'Revenue share negotiated per title',
                  'Geo-specific pricing (Nigeria vs International)',
                  'Virtual cinema events for premieres',
                  'Promotional marketing support',
                ],
              },
              {
                icon: '⏱️',
                title: 'Review Process',
                items: [
                  'Initial screening: 2–5 business days',
                  'Full review: 1–2 weeks',
                  'Contract negotiation: 1–3 weeks',
                  'Onboarding & upload: 1 week',
                  'You\'ll receive email updates at each stage',
                  'All decisions communicated by email',
                ],
              },
            ].map(section => (
              <Card key={section.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-2xl">{section.icon}</span> {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {section.items.map(item => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── SUBMISSION DETAIL DIALOG ─── */}
      {selectedSubmission && (
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Film className="w-5 h-5" />
                {selectedSubmission.project_title}
              </DialogTitle>
              <DialogDescription>
                {selectedSubmission.submitter_name} • {selectedSubmission.submitter_email}
                {selectedSubmission.company_name && ` • ${selectedSubmission.company_name}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Poster */}
              {selectedSubmission.poster_url && (
                <img src={selectedSubmission.poster_url} alt={selectedSubmission.project_title} className="w-full max-h-56 object-cover rounded-lg" />
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Type', selectedSubmission.project_type],
                  ['Year', selectedSubmission.release_year?.toString() || '—'],
                  ['Duration', selectedSubmission.duration_minutes ? `${selectedSubmission.duration_minutes} min` : '—'],
                  ['Budget', selectedSubmission.budget_range || '—'],
                  ['Rights', selectedSubmission.distribution_rights || '—'],
                  ['Submitted', new Date(selectedSubmission.created_at).toLocaleDateString()],
                ].map(([k, v]) => (
                  <div key={k} className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="font-medium capitalize">{v}</p>
                  </div>
                ))}
              </div>

              {/* Genres */}
              {selectedSubmission.genres && selectedSubmission.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedSubmission.genres.map(g => (
                    <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                  ))}
                </div>
              )}

              {/* Synopsis */}
              {selectedSubmission.description && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Synopsis</p>
                  <p className="text-sm">{selectedSubmission.description}</p>
                </div>
              )}

              {/* Links */}
              <div className="space-y-2">
                {selectedSubmission.trailer_url && (
                  <a href={selectedSubmission.trailer_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Link2 className="w-4 h-4" /> View Trailer
                  </a>
                )}
                {selectedSubmission.screener_url && (
                  <a href={selectedSubmission.screener_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <FileVideo className="w-4 h-4" /> View Screener / Full Film
                  </a>
                )}
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Add internal notes about this submission..."
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => updateStatus(selectedSubmission.id, 'in_review')}
                disabled={updatingStatus}
                className="gap-1 text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
              >
                <Eye className="w-4 h-4" /> Mark In Review
              </Button>
              <Button
                variant="destructive"
                onClick={() => updateStatus(selectedSubmission.id, 'rejected')}
                disabled={updatingStatus}
                className="gap-1"
              >
                <X className="w-4 h-4" /> Reject
              </Button>
              <Button
                onClick={() => updateStatus(selectedSubmission.id, 'approved')}
                disabled={updatingStatus}
                className="gap-1 bg-green-600 hover:bg-green-700"
              >
                {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
