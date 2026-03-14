import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import {
  Film, CheckCircle, Clock, XCircle, Eye, Search, RefreshCw, Loader2, ChevronRight, Check, X
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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

export default function FilmmakerPortal() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    try {
      // Update submission status
      const { error } = await supabase
        .from('filmmaker_submissions')
        .update({ status, admin_notes: adminNote || undefined })
        .eq('id', id);
      if (error) { toast.error('Update failed'); setUpdating(false); return; }

      // If approved, create a content record and link it
      if (status === 'approved' && selected) {
        // Get tenant_id from admin's user_roles
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('tenant_id')
          .eq('user_id', currentUser!.id)
          .maybeSingle();

        const tenantId = roleData?.tenant_id;
        if (tenantId) {
          const slug = selected.project_title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

          const { data: contentData, error: contentError } = await supabase
            .from('content')
            .insert({
              tenant_id: tenantId,
              title: selected.project_title,
              slug,
              description: selected.description || '',
              type: (selected.project_type === 'series' ? 'series' : 'movie') as any,
              status: 'draft' as any,
              poster_url: selected.poster_url,
              trailer_url: selected.trailer_url,
              video_url: selected.video_url,
              duration: selected.duration_minutes ? selected.duration_minutes * 60 : null,
              genres: selected.genres,
              release_date: selected.release_year ? `${selected.release_year}-01-01` : null,
            })
            .select('id')
            .single();

          if (contentData && !contentError) {
            // Link content_id back to submission
            await supabase
              .from('filmmaker_submissions')
              .update({ content_id: contentData.id })
              .eq('id', id);

            toast.success('Content record created & linked!');
          } else if (contentError) {
            console.error('Failed to create content:', contentError);
            toast.warning('Approved but failed to create content record');
          }
        }
      }

      toast.success(`Submission ${status}`);
      setSelected(null);
      fetchSubmissions();
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Something went wrong');
    }
    setUpdating(false);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'approved': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      case 'in_review': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  const filtered = submissions.filter(s => {
    const matchSearch = !searchQuery ||
      s.project_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.submitter_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    inReview: submissions.filter(s => s.status === 'in_review').length,
    approved: submissions.filter(s => s.status === 'approved').length,
  };

  return (
    <AdminLayout title="Filmmaker Submissions" description="Review and manage filmmaker project submissions">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Film, color: 'text-primary' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-400' },
          { label: 'In Review', value: stats.inReview, icon: Eye, color: 'text-blue-400' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-400' },
        ].map(st => (
          <Card key={st.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{st.label}</p>
                <st.icon className={`w-4 h-4 ${st.color}`} />
              </div>
              <p className="text-2xl font-bold">{st.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by title or filmmaker..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'in_review', 'approved', 'rejected'].map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)} className="capitalize text-xs">
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </Button>
          ))}
          <Button onClick={fetchSubmissions} variant="ghost" size="sm"><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No submissions found</p>
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
                    <TableRow key={sub.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setSelected(sub); setAdminNote(sub.admin_notes || ''); }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {sub.poster_url ? (
                            <img src={sub.poster_url} alt={sub.project_title} className="w-10 h-14 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-14 bg-muted rounded flex items-center justify-center"><Film className="w-4 h-4 text-muted-foreground" /></div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{sub.project_title}</p>
                            {sub.release_year && <p className="text-xs text-muted-foreground">{sub.release_year}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{sub.submitter_name}</p>
                        <p className="text-xs text-muted-foreground">{sub.submitter_email}</p>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{sub.project_type}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {sub.genres?.slice(0, 2).map(g => <Badge key={g} variant="outline" className="text-[10px] px-1 py-0">{g}</Badge>)}
                          {(sub.genres?.length || 0) > 2 && <Badge variant="outline" className="text-[10px] px-1 py-0">+{(sub.genres?.length || 0) - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor(sub.status)}>{sub.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setSelected(sub); setAdminNote(sub.admin_notes || ''); }}>
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

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.project_title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Filmmaker:</span> <span className="font-medium">{selected.submitter_name}</span></div>
                  <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selected.submitter_email}</span></div>
                  {selected.company_name && <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{selected.company_name}</span></div>}
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{selected.project_type}</span></div>
                  {selected.duration_minutes && <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium">{selected.duration_minutes} min</span></div>}
                  {selected.budget_range && <div><span className="text-muted-foreground">Budget:</span> <span className="font-medium">{selected.budget_range}</span></div>}
                  {selected.distribution_rights && <div className="col-span-2"><span className="text-muted-foreground">Rights:</span> <span className="font-medium">{selected.distribution_rights}</span></div>}
                </div>
                {selected.description && <div><p className="text-xs text-muted-foreground mb-1">Synopsis</p><p className="text-sm">{selected.description}</p></div>}
                {selected.genres && selected.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">{selected.genres.map(g => <Badge key={g} variant="outline" className="text-xs">{g}</Badge>)}</div>
                )}
                <div className="flex flex-wrap gap-3 text-xs">
                  {selected.trailer_url && <a href={selected.trailer_url} target="_blank" rel="noopener" className="text-primary underline">Trailer</a>}
                  {selected.screener_url && <a href={selected.screener_url} target="_blank" rel="noopener" className="text-primary underline">Screener</a>}
                  {selected.video_url && <a href={selected.video_url} target="_blank" rel="noopener" className="text-primary underline">Video</a>}
                </div>
                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Internal notes about this submission..." rows={3} />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="destructive" size="sm" disabled={updating} onClick={() => updateStatus(selected.id, 'rejected')}>
                  <X className="w-4 h-4 mr-1" />Reject
                </Button>
                <Button variant="outline" size="sm" disabled={updating} onClick={() => updateStatus(selected.id, 'in_review')}>
                  <Eye className="w-4 h-4 mr-1" />Mark In Review
                </Button>
                <Button size="sm" disabled={updating} onClick={() => updateStatus(selected.id, 'approved')}>
                  <Check className="w-4 h-4 mr-1" />Approve
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
