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

export default function Payouts() {
  usePageTitle('Admin: Payouts & Studio Tiers');
  const [wrs, setWrs] = useState<WR[]>([]);
  const [accts, setAccts] = useState<SA[]>([]);

  const load = async () => {
    const [w, a] = await Promise.all([
      supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('studio_accounts').select('*').order('created_at', { ascending: false }),
    ]);
    setWrs((w.data as WR[]) || []);
    setAccts((a.data as SA[]) || []);
  };
  useEffect(() => { load(); }, []);

  const setW = async (id: string, status: string) => {
    const { error } = await supabase.from('withdrawal_requests').update({ status }).eq('id', id);
    error ? toast.error(error.message) : (toast.success(`Marked ${status}`), load());
  };
  const setA = async (id: string, status: string) => {
    const { error } = await supabase.from('studio_accounts').update({ status }).eq('id', id);
    error ? toast.error(error.message) : (toast.success(`Tier ${status}`), load());
  };

  return (
    <AdminLayout title="Payouts & Studio Tiers" description="Approve withdrawals and Creator/Business verifications">
      <div className="space-y-6">
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
