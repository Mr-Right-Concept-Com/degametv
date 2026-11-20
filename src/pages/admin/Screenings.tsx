import { useCallback, useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Film, Search, Loader2, Ticket, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const screeningSchema = z.object({
  content_id: z.string().uuid('Select a published title'),
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  description: z.string().max(2000).optional(),
  poster_url: z.string().url().optional().or(z.literal('')),
  screening_date: z.string().optional(),
  status: z.enum(['draft', 'published']),
  refund_policy: z.string().max(1000).optional(),
  allowed_countries: z.string().optional(),
  blocked_countries: z.string().optional(),
  max_streams_per_ticket: z.coerce.number().int().min(1).max(50).default(5),
  max_concurrent_streams: z.coerce.number().int().min(1).max(10).default(1),
  price_ngn: z.coerce.number().positive().max(10000000),
  price_usd: z.coerce.number().positive().max(100000),
});

type ContentOption = Pick<Tables<'content'>, 'id' | 'title' | 'slug' | 'description' | 'poster_url' | 'type' | 'tenant_id'>;
type ScreeningRow = Pick<Tables<'screenings'>, 'id' | 'title' | 'slug' | 'status' | 'screening_date' | 'created_at' | 'poster_url' | 'content_id'> & {
  ticket_count: number;
  revenue: number;
};

export default function ScreeningsPage() {
  const [screenings, setScreenings] = useState<ScreeningRow[]>([]);
  const [contentOptions, setContentOptions] = useState<ContentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    content_id: '', title: '', slug: '', description: '', poster_url: '', screening_date: '',
    status: 'draft' as 'draft' | 'published',
    refund_policy: '', allowed_countries: '', blocked_countries: '',
    max_streams_per_ticket: 5, max_concurrent_streams: 1, price_ngn: 0, price_usd: 0,
  });

  const fetchScreenings = useCallback(async () => {
    setLoading(true);
    const { data: contentData } = await supabase.from('content').select('id,title,slug,description,poster_url,type,tenant_id').eq('status','published').order('title');
    setContentOptions(contentData ?? []);
    const { data: sData } = await supabase.from('screenings').select('id,title,slug,status,screening_date,created_at,poster_url,content_id').order('created_at', { ascending: false });
    const { data: tData } = await supabase.from('screening_tickets').select('screening_id, price, payment_status');

    const ticketMap = new Map<string, { count: number; revenue: number }>();
    (tData || []).forEach(t => {
      const cur = ticketMap.get(t.screening_id) || { count: 0, revenue: 0 };
      if (t.payment_status === 'completed') {
        cur.count++;
        cur.revenue += Number(t.price) || 0;
      }
      ticketMap.set(t.screening_id, cur);
    });

    const rows: ScreeningRow[] = (sData || []).map(s => ({
      id: s.id, title: s.title, slug: s.slug, status: s.status,
      screening_date: s.screening_date, created_at: s.created_at,
      poster_url: s.poster_url, content_id: s.content_id,
      ticket_count: ticketMap.get(s.id)?.count || 0,
      revenue: ticketMap.get(s.id)?.revenue || 0,
    }));

    setScreenings(rows);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchScreenings(); }, [fetchScreenings]);

  const handleCreate = async () => {
    const parsed = screeningSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    const source = contentOptions.find(item => item.id === parsed.data.content_id);
    if (!source) {
      toast.error('Choose an existing published title. Screening creation cannot create placeholder content.');
      return;
    }
    setSaving(true);
    const parseList = (value: string) => value.split(',').map(item => item.trim().toUpperCase()).filter(Boolean);
    const { error } = await supabase.from('screenings').insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description || source.description,
      poster_url: parsed.data.poster_url || source.poster_url,
      screening_date: parsed.data.screening_date || null,
      status: 'draft',
      refund_policy: parsed.data.refund_policy || null,
      allowed_countries: parsed.data.allowed_countries ? parseList(parsed.data.allowed_countries) : null,
      blocked_countries: parsed.data.blocked_countries ? parseList(parsed.data.blocked_countries) : null,
      max_streams_per_ticket: parsed.data.max_streams_per_ticket,
      max_concurrent_streams: parsed.data.max_concurrent_streams,
      content_id: source.id,
      tenant_id: source.tenant_id,
      event_type: source.type === 'series' ? 'series' : 'film',
      location_pricing: { nigeria: parsed.data.price_ngn, international: parsed.data.price_usd },
    });
    if (error) toast.error('Screening draft could not be created. Check the selected title and fields.');
    else {
      toast.success('Screening draft created from the selected title.');
      setDialogOpen(false);
      setForm({ content_id:'',title:'',slug:'',description:'',poster_url:'',screening_date:'',status:'draft',refund_policy:'',allowed_countries:'',blocked_countries:'',max_streams_per_ticket:5,max_concurrent_streams:1,price_ngn:0,price_usd:0 });
      await fetchScreenings();
    }
    setSaving(false);
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('screenings').update({ status: newStatus }).eq('id', id);
    if (error) toast.error('Failed to update status');
    else {
      setScreenings(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      toast.success(`Screening ${newStatus === 'published' ? 'published' : 'unpublished'}`);
    }
  };

  const deleteScreening = async (id: string) => {
    const { error } = await supabase.from('screenings').delete().eq('id', id);
    if (error) toast.error('Failed to delete: ' + error.message);
    else {
      setScreenings(prev => prev.filter(s => s.id !== id));
      toast.success('Screening deleted');
    }
  };

  const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const filtered = screenings.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => {
    if (s === 'published') return 'bg-green-500/20 text-green-400';
    if (s === 'draft') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <AdminLayout title="Screenings" description={`${screenings.length} screenings`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search screenings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Create Screening</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Screening</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Published title *</Label>
                <Select value={form.content_id} onValueChange={value => {
                  const selected = contentOptions.find(item => item.id === value);
                  setForm(current => ({ ...current, content_id:value, title:selected?.title ?? '', slug:selected?.slug ?? autoSlug(selected?.title ?? ''), description:selected?.description ?? '', poster_url:selected?.poster_url ?? '' }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select an existing published title"/></SelectTrigger>
                  <SelectContent>{contentOptions.map(item=><SelectItem key={item.id} value={item.id}>{item.title} · {item.type}</SelectItem>)}</SelectContent>
                </Select>
                {contentOptions.length===0&&<p className="text-xs text-muted-foreground">No published creator titles are available yet.</p>}
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value, slug: autoSlug(e.target.value) })); }} placeholder="My Movie Premiere" />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="my-movie-premiere" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Screening Date</Label>
                  <Input type="datetime-local" value={form.screening_date} onChange={e => setForm(f => ({ ...f, screening_date: e.target.value }))} />
                </div>
                <div className="space-y-2"><Label>Status</Label><Input readOnly value="Draft — requires review" /></div>
              </div>
              <div className="space-y-2">
                <Label>Poster URL</Label>
                <Input value={form.poster_url} onChange={e => setForm(f => ({ ...f, poster_url: e.target.value }))} placeholder="https://..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Nigeria ticket price (NGN) *</Label><Input type="number" min="1" value={form.price_ngn || ''} onChange={e=>setForm(current=>({...current,price_ngn:Number(e.target.value)}))}/></div>
                <div className="space-y-2"><Label>International ticket price (USD) *</Label><Input type="number" min="0.01" step="0.01" value={form.price_usd || ''} onChange={e=>setForm(current=>({...current,price_usd:Number(e.target.value)}))}/></div>
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Geo & Access Controls</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Allowed Countries</Label>
                    <Input value={form.allowed_countries} onChange={e => setForm(f => ({ ...f, allowed_countries: e.target.value }))} placeholder="NG, US, GB (blank = all)" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Blocked Countries</Label>
                    <Input value={form.blocked_countries} onChange={e => setForm(f => ({ ...f, blocked_countries: e.target.value }))} placeholder="ISO codes, comma-sep" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max Streams / Ticket</Label>
                    <Input type="number" min={1} max={50} value={form.max_streams_per_ticket} onChange={e => setForm(f => ({ ...f, max_streams_per_ticket: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max Concurrent Streams</Label>
                    <Input type="number" min={1} max={10} value={form.max_concurrent_streams} onChange={e => setForm(f => ({ ...f, max_concurrent_streams: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Refund Policy</Label>
                  <Textarea value={form.refund_policy} onChange={e => setForm(f => ({ ...f, refund_policy: e.target.value }))} rows={2} placeholder="e.g. Refunds available up to 24 hours before premiere." />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No screenings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Screening</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Tickets</TableHead>
                    <TableHead className="hidden sm:table-cell">Revenue</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {s.poster_url ? (
                            <img src={s.poster_url} alt={s.title} className="w-10 h-14 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-14 bg-muted rounded flex items-center justify-center"><Film className="w-4 h-4 text-muted-foreground" /></div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{s.title}</p>
                            <p className="text-xs text-muted-foreground">/{s.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor(s.status)}>{s.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {s.screening_date ? new Date(s.screening_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm">
                          <Ticket className="w-3 h-3 text-muted-foreground" />
                          {s.ticket_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium hidden sm:table-cell">₦{s.revenue.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(s.id, s.status)}>
                            {s.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{s.title}"?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete this screening and cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteScreening(s.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
