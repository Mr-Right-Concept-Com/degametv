import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Building2, UserRound, ShieldCheck, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudioApplication {
  id: string;
  user_id: string;
  tier: string;
  company_name: string | null;
  cac_number: string | null;
  tax_id: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  cac_doc_path: string | null;
  rights_declared: boolean;
  seats: number;
  status: string;
  created_at: string;
  review_notes: string | null;
  applicant_name?: string | null;
  applicant_email?: string | null;
  cac_document_url?: string | null;
}

export default function StudioApplications() {
  const [rows, setRows] = useState<StudioApplication[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'rejected' | 'approved'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('studio_accounts')
      .select('id,user_id,tier,company_name,cac_number,tax_id,bank_name,bank_account_number,bank_account_name,cac_doc_path,rights_declared,seats,status,created_at,review_notes')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Studio applications could not be loaded.');
      setRows([]);
      setLoading(false);
      return;
    }
    const accounts = (data ?? []) as StudioApplication[];
    const ids = [...new Set(accounts.map(row => row.user_id))];
    const { data: profiles } = ids.length
      ? await supabase.from('profiles').select('user_id,full_name,email').in('user_id', ids)
      : { data: [] };
    const people = new Map((profiles ?? []).map(profile => [profile.user_id, profile]));
    const hydrated = await Promise.all(accounts.map(async row => {
      const person = people.get(row.user_id);
      const signed = row.cac_doc_path
        ? await supabase.storage.from('kyb-docs').createSignedUrl(row.cac_doc_path, 300)
        : null;
      return { ...row, applicant_name: person?.full_name ?? null, applicant_email: person?.email ?? null, cac_document_url: signed?.data?.signedUrl ?? null };
    }));
    setRows(hydrated);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const review = async (row: StudioApplication, decision: 'approved' | 'rejected') => {
    const reason = (notes[row.id] ?? '').trim();
    if (reason.length < 10) {
      toast.error('Enter a review reason of at least 10 characters.');
      return;
    }
    setWorking(row.id);
    const { error } = await supabase.rpc('review_studio_account', {
      p_account_id: row.id,
      p_decision: decision,
      p_reason: reason,
    });
    if (error) {
      const message = error.message.includes('self_review_forbidden') ? 'You cannot approve your own studio.'
        : error.message.includes('creator_identity_role_required') ? 'The applicant must complete identity approval first.'
        : error.message.includes('business_evidence_required') ? 'Business approval requires a rights declaration and CAC document.'
        : error.message.includes('business_document_missing') ? 'The private CAC document is missing or does not belong to this applicant.'
        : 'Studio review was not saved. Check your permissions and the application status.';
      toast.error(message);
    } else {
      toast.success(decision === 'approved' ? 'Studio approved. Creator Studio access is now unlocked.' : 'Studio application rejected.');
      await load();
    }
    setWorking(null);
  };

  const visible = rows.filter(row => row.status === filter);
  return (
    <AdminLayout title="Studio Applications" description="Review Creator and Business studio onboarding">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['pending', 'rejected', 'approved'] as const).map(status => (
            <Button key={status} size="sm" variant={filter === status ? 'default' : 'outline'} onClick={() => setFilter(status)} className="capitalize">
              {status} <Badge variant="secondary" className="ml-2">{rows.filter(row => row.status === status).length}</Badge>
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> :
        visible.length === 0 ? <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">No {filter} studio applications.</CardContent></Card> :
        <div className="grid gap-4">
          {visible.map(row => (
            <Card key={row.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">{row.tier === 'business' ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}{row.company_name || row.applicant_name || 'Creator studio'}</CardTitle>
                  <Badge variant={row.status === 'approved' ? 'default' : row.status === 'rejected' ? 'destructive' : 'secondary'}>{row.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{row.applicant_email || row.user_id} · {new Date(row.created_at).toLocaleString()}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div><span className="text-muted-foreground">Tier:</span> <span className="font-medium capitalize">{row.tier}</span></div>
                  {row.company_name && <div><span className="text-muted-foreground">Company:</span> {row.company_name}</div>}
                  {row.cac_number && <div><span className="text-muted-foreground">CAC:</span> {row.cac_number}</div>}
                  {row.tax_id && <div><span className="text-muted-foreground">Tax ID:</span> {row.tax_id}</div>}
                  {row.bank_name && <div><span className="text-muted-foreground">Bank:</span> {row.bank_name}</div>}
                  {row.bank_account_name && <div><span className="text-muted-foreground">Account name:</span> {row.bank_account_name}</div>}
                  {row.bank_account_number && <div><span className="text-muted-foreground">Account:</span> ••••••{row.bank_account_number.slice(-4)}</div>}
                  <div><span className="text-muted-foreground">Team seats:</span> {row.seats}</div>
                  <div><span className="text-muted-foreground">Rights declared:</span> {row.rights_declared ? 'Yes' : 'No'}</div>
                </div>
                {row.cac_doc_path && (row.cac_document_url
                  ? <a className="inline-flex items-center gap-2 text-sm text-primary underline" href={row.cac_document_url} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" />View private CAC certificate</a>
                  : <p className="text-xs text-destructive">Private CAC evidence could not be opened.</p>)}
                {row.review_notes && <p className="text-xs text-muted-foreground">Previous review: {row.review_notes}</p>}
                {row.status !== 'approved' && (
                  <div className="space-y-2 border-t pt-4">
                    <Label htmlFor={'reason-' + row.id}>Review reason (required)</Label>
                    <Textarea id={'reason-' + row.id} value={notes[row.id] ?? ''} onChange={event => setNotes(current => ({ ...current, [row.id]: event.target.value }))} rows={2} placeholder="Record the basis for approval or rejection." />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => void review(row, 'approved')} disabled={working === row.id || row.status === 'approved' || (row.tier === 'business' && (!row.cac_doc_path || !row.rights_declared))}>
                        {working === row.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Approve studio
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void review(row, 'rejected')} disabled={working === row.id}>Reject</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>}
    </AdminLayout>
  );
}
