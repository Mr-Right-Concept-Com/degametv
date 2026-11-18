import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Clock, X, Check, Loader2, ScanFace, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Application {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  kyc_status: string;
  kyc_id_type: string | null;
  kyc_id_url: string | null;
  kyc_selfie_url: string | null;
  kyc_full_name: string | null;
  kyc_submitted_at: string | null;
}

export default function FilmmakerApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState<{ idUrl: string; selfieUrl: string } | null>(null);
  const [working, setWorking] = useState(false);
  const [tab, setTab] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, email, full_name, kyc_status, kyc_id_type, kyc_id_url, kyc_selfie_url, kyc_full_name, kyc_submitted_at')
      .in('kyc_status', ['pending', 'verified', 'rejected'])
      .order('kyc_submitted_at', { ascending: false });
    if (error) toast.error('Failed to load: ' + error.message);
    else setApps((data || []) as Application[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const review = async (app: Application, decision: 'verified' | 'rejected') => {
    if (note.trim().length < 10) {
      toast.error('Enter a review reason of at least 10 characters.');
      return;
    }
    setWorking(true);
    const { data, error } = await supabase.functions.invoke('review-kyc', {
      body: { user_id: app.user_id, decision, reason: note.trim() },
    });
    if (error || !data?.success) {
      toast.error(data?.error || 'The review decision was not saved.');
      setWorking(false);
      return;
    }
    toast.success(decision === 'verified'
      ? 'Identity approved and creator access granted.'
      : 'Identity application rejected.');
    setSelected(null);
    setEvidence(null);
    setWorking(false);
    await load();
  };

  const openApplication = async (app: Application) => {
    setSelected(app);
    setNote('');
    setEvidence(null);
    const [id, selfie] = await Promise.all([
      app.kyc_id_url ? supabase.storage.from('identity-documents').createSignedUrl(app.kyc_id_url, 300) : Promise.resolve({ data: null, error: new Error('Missing ID evidence') }),
      app.kyc_selfie_url ? supabase.storage.from('identity-documents').createSignedUrl(app.kyc_selfie_url, 300) : Promise.resolve({ data: null, error: new Error('Missing selfie evidence') }),
    ]);
    if (id.error || selfie.error || !id.data?.signedUrl || !selfie.data?.signedUrl) {
      toast.error('Private identity evidence could not be opened. Check reviewer permissions.');
      return;
    }
    setEvidence({ idUrl: id.data.signedUrl, selfieUrl: selfie.data.signedUrl });
  };

  const filtered = apps.filter(a => a.kyc_status === tab && (
    !q || (a.email?.toLowerCase().includes(q.toLowerCase()) || a.kyc_full_name?.toLowerCase().includes(q.toLowerCase()))
  ));

  const counts = {
    pending: apps.filter(a => a.kyc_status === 'pending').length,
    verified: apps.filter(a => a.kyc_status === 'verified').length,
    rejected: apps.filter(a => a.kyc_status === 'rejected').length,
  };

  return (
    <AdminLayout title="Filmmaker Applications" description="Review identity evidence and grant Creator eligibility; studio approval is a separate step">
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={q} onChange={e => setQ(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {(['pending', 'verified', 'rejected'] as const).map(t => (
            <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)} className="capitalize">
              {t} <Badge variant="secondary" className="ml-2">{counts[t]}</Badge>
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <ScanFace className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No {tab} applications</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(a => (
            <Card key={a.id} className="hover:border-primary/40 cursor-pointer transition-colors" onClick={() => openApplication(a)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center"><ScanFace className="w-6 h-6 text-muted-foreground" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{a.kyc_full_name || a.full_name || 'Unnamed'}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {a.kyc_id_type?.replace('_', ' ')} · submitted {a.kyc_submitted_at ? new Date(a.kyc_submitted_at).toLocaleDateString() : '-'}
                  </p>
                </div>
                <Badge variant="outline" className={
                  a.kyc_status === 'verified' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                  a.kyc_status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                  'bg-amber-500/10 text-amber-500 border-amber-500/30'
                }>
                  {a.kyc_status === 'verified' ? <ShieldCheck className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                  {a.kyc_status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.kyc_full_name || selected.full_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selected.email}</span></div>
                  <div><span className="text-muted-foreground">ID Type:</span> <span className="font-medium capitalize">{selected.kyc_id_type?.replace('_', ' ')}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Government ID</Label>
                    {selected.kyc_id_url ? (
                      evidence?.idUrl
                        ? <a href={evidence.idUrl} target="_blank" rel="noopener noreferrer"><img src={evidence.idUrl} alt="Government identity document" className="w-full h-48 object-contain rounded-lg border mt-1" /></a>
                        : <p className="text-xs text-muted-foreground">Loading private evidence…</p>
                    ) : <p className="text-xs text-muted-foreground">None</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Selfie with ID</Label>
                    {selected.kyc_selfie_url ? (
                      evidence?.selfieUrl
                        ? <a href={evidence.selfieUrl} target="_blank" rel="noopener noreferrer"><img src={evidence.selfieUrl} alt="Applicant selfie with identity document" className="w-full h-48 object-contain rounded-lg border mt-1" /></a>
                        : <p className="text-xs text-muted-foreground">Loading private evidence…</p>
                    ) : <p className="text-xs text-muted-foreground">None</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Review reason (required)</Label>
                  <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} />
                </div>
              </div>
              {selected.kyc_status === 'pending' && (
                <DialogFooter className="gap-2">
                  <Button variant="destructive" size="sm" disabled={working || note.trim().length < 10} onClick={() => review(selected, 'rejected')}>
                    <X className="w-4 h-4 mr-1" />Reject
                  </Button>
                  <Button size="sm" disabled={working || note.trim().length < 10} onClick={() => review(selected, 'verified')}>
                    {working ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                    Approve identity & grant Creator role
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
