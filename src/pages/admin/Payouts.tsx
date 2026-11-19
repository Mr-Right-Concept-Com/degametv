import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';

type WR = { id: string; user_id: string; amount: number; currency: string; bank_name: string; account_number: string; account_name: string; status: string; created_at: string };
type SA = { id: string; user_id: string; tier: string; status: string; company_name: string | null; cac_number: string | null; tax_id: string | null; seats: number; created_at: string };
type EH = { id: string; source_type: string; source_id: string; screening_id: string | null; live_stream_id: string | null; content_id: string | null; creator_id: string; currency: string; gross_amount_minor: number; net_amount_minor: number; hold_status: string; release_at: string | null; delivery_evidence: unknown };

export default function Payouts() {
  usePageTitle('Admin: Payouts & Studio Tiers');
  const [wrs, setWrs] = useState<WR[]>([]);
  const [accts, setAccts] = useState<SA[]>([]);
  const [eventHolds, setEventHolds] = useState<EH[]>([]);
  const [eventTitles, setEventTitles] = useState<Record<string, string>>({});
  const [verifyingHold, setVerifyingHold] = useState<string | null>(null);

  const load = async () => {
    const [w, a, h] = await Promise.all([
      supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('studio_accounts').select('*').order('created_at', { ascending: false }),
      supabase.from('event_settlement_holds').select('id,source_type,source_id,screening_id,live_stream_id,content_id,creator_id,currency,gross_amount_minor,net_amount_minor,hold_status,release_at,delivery_evidence').order('created_at', { ascending: false }).limit(200),
    ]);
    setWrs((w.data as WR[]) || []);
    setAccts((a.data as SA[]) || []);
    const holds = (h.data as EH[]) || [];
    setEventHolds(holds);
    const screeningIds = [...new Set(holds.map(row => row.screening_id).filter((id): id is string => Boolean(id)))];
    const streamIds = [...new Set(holds.map(row => row.live_stream_id).filter((id): id is string => Boolean(id)))];
    const contentIds = [...new Set(holds.map(row => row.content_id).filter((id): id is string => Boolean(id)))];
    const [screenings, streams, content] = await Promise.all([
      screeningIds.length ? supabase.from('screenings').select('id,title').in('id', screeningIds) : Promise.resolve({ data: [] }),
      streamIds.length ? supabase.from('live_streams').select('id,title').in('id', streamIds) : Promise.resolve({ data: [] }),
      contentIds.length ? supabase.from('content').select('id,title').in('id', contentIds) : Promise.resolve({ data: [] }),
    ]);
    const titles: Record<string, string> = {};
    (screenings.data || []).forEach(row => { titles[row.id] = row.title; });
    (streams.data || []).forEach(row => { titles[row.id] = row.title; });
    (content.data || []).forEach(row => { titles[row.id] = row.title; });
    setEventTitles(titles);
  };
  useEffect(() => { load(); }, []);

  const setW = async (id: string, status: string) => {
    const { error } = await supabase.from('withdrawal_requests').update({ status }).eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Marked ${status}`);
    await load();
  };
  const verifyDelivery = async (hold: EH) => {
    const sourceType = hold.live_stream_id ? 'live_stream' : hold.screening_id ? 'screening' : 'content';
    const eventId = hold.live_stream_id || hold.screening_id || hold.content_id;
    if (!eventId) return;
    setVerifyingHold(hold.id);
    try {
      const { data, error } = await supabase.functions.invoke('confirm-event-delivery', { body: { sourceType, eventId } });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || 'Platform delivery verification failed.');
        return;
      }
      toast.success(`Verified delivery and updated ${data.updatedHolds || 0} settlement hold(s).`);
      await load();
    } finally { setVerifyingHold(null); }
  };
  const setA = async (id: string, status: string) => {
    const { error } = await supabase.from('studio_accounts').update({ status }).eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Tier ${status}`);
    await load();
  };

  return (
    <AdminLayout title="Payouts & Studio Tiers" description="Approve withdrawals and Creator/Business verifications">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Event settlement delivery verification</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <p className="mb-4 text-sm text-muted-foreground">Only platform administrators can verify delivery. The verification endpoint checks actual event completion and provider replay evidence; creators cannot release their own earnings.</p>
            <Table>
              <TableHeader><TableRow><TableHead>Event / content</TableHead><TableHead>Source</TableHead><TableHead>Gross / net</TableHead><TableHead>Status</TableHead><TableHead>Release</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {eventHolds.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">No event settlement holds</TableCell></TableRow>}
                {eventHolds.map(hold => {
                  const target = hold.live_stream_id || hold.screening_id || hold.content_id || '';
                  return <TableRow key={hold.id}>
                    <TableCell className="font-medium">{eventTitles[target] || 'Creator event'}</TableCell>
                    <TableCell className="capitalize">{hold.source_type}</TableCell>
                    <TableCell>{hold.currency} {(hold.gross_amount_minor / 100).toLocaleString()} / {(hold.net_amount_minor / 100).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="secondary">{hold.hold_status}</Badge></TableCell>
                    <TableCell className="text-xs">{hold.release_at ? new Date(hold.release_at).toLocaleString() : 'Awaiting verified delivery'}</TableCell>
                    <TableCell>{hold.hold_status === 'held' ? <Button size="sm" onClick={() => void verifyDelivery(hold)} disabled={verifyingHold === hold.id}>{verifyingHold === hold.id ? 'Verifying…' : 'Verify delivery'}</Button> : '—'}</TableCell>
                  </TableRow>;
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Withdrawal requests</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Bank</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {wrs.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">No requests</TableCell></TableRow>}
                {wrs.map(w => (
                  <TableRow key={w.id}>
                    <TableCell>{new Date(w.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{w.currency} {Number(w.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{w.bank_name} · {w.account_number}<br />{w.account_name}</TableCell>
                    <TableCell><Badge variant="secondary">{w.status}</Badge></TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap">
                      {w.status === 'pending' && <><Button size="sm" onClick={() => setW(w.id, 'approved')}>Approve</Button><Button size="sm" variant="outline" onClick={() => setW(w.id, 'rejected')}>Reject</Button></>}
                      {w.status === 'approved' && <Button size="sm" onClick={() => setW(w.id, 'paid')}>Mark paid</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Studio tier applications (KYC / KYB)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Tier</TableHead><TableHead>Company</TableHead><TableHead>CAC / TIN</TableHead><TableHead>Seats</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {accts.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">No applications</TableCell></TableRow>}
                {accts.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="capitalize">{a.tier}</TableCell>
                    <TableCell>{a.company_name || '—'}</TableCell>
                    <TableCell className="text-xs">{a.cac_number || '—'} / {a.tax_id || '—'}</TableCell>
                    <TableCell>{a.seats}</TableCell>
                    <TableCell><Badge variant="secondary">{a.status}</Badge></TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap">
                      {a.status !== 'approved' && <Button size="sm" onClick={() => setA(a.id, 'approved')}>Approve</Button>}
                      {a.status !== 'rejected' && <Button size="sm" variant="outline" onClick={() => setA(a.id, 'rejected')}>Reject</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
