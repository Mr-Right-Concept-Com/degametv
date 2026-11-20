import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';

type WR = { id: string; user_id: string; amount: number; currency: string; bank_name: string; account_last4: string | null; account_name: string; bank_country: string | null; status: string; admin_note: string | null; created_at: string };
type SA = Pick<Tables<'studio_accounts'>, 'id' | 'user_id' | 'tier' | 'status' | 'company_name' | 'cac_number' | 'tax_id' | 'seats' | 'created_at'>;

function isWithdrawalRow(value: unknown): value is WR {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.user_id === 'string'
    && typeof row.amount === 'number' && typeof row.currency === 'string'
    && typeof row.bank_name === 'string' && (typeof row.account_last4 === 'string' || row.account_last4 === null)
    && typeof row.account_name === 'string' && (typeof row.bank_country === 'string' || row.bank_country === null)
    && typeof row.status === 'string' && (typeof row.admin_note === 'string' || row.admin_note === null)
    && typeof row.created_at === 'string';
}

export default function Payouts() {
  usePageTitle('Admin: Payouts & Studio Tiers');
  const [wrs, setWrs] = useState<WR[]>([]);
  const [accts, setAccts] = useState<SA[]>([]);

  const load = async () => {
    const [w, a] = await Promise.all([
      supabase.functions.invoke('admin-payouts', { body: { action: 'list' } }),
      supabase.from('studio_accounts').select('id,user_id,tier,status,company_name,cac_number,tax_id,seats,created_at').order('created_at', { ascending: false }),
    ]);
    if (w.error || w.data?.error) toast.error(w.error?.message || w.data?.error || 'Unable to load payout queue.');
    if (a.error) toast.error(a.error.message);
    const withdrawals: unknown = w.data && typeof w.data === 'object' && 'withdrawals' in w.data ? w.data.withdrawals : undefined;
    setWrs(Array.isArray(withdrawals) ? withdrawals.filter(isWithdrawalRow) : []);
    setAccts(a.data || []);
  };
  useEffect(() => { load(); }, []);

  const setW = async (id: string, status: string) => {
    const transition = status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : null;
    if (!transition) return;
    const adminNote = transition === 'reject' ? window.prompt('Enter the rejection reason (minimum 5 characters):') : undefined;
    if (transition === 'reject' && (!adminNote || adminNote.trim().length < 5)) return;
    const { data, error } = await supabase.functions.invoke('admin-payouts', {
      body: { action: 'transition', id, transition, adminNote: adminNote?.trim() },
    });
    if (error || data?.error) {
      toast.error(error?.message || data?.error || 'Withdrawal transition failed.');
      return;
    }
    toast.success(transition === 'approve' ? 'Withdrawal approved. Payment is not yet confirmed.' : 'Withdrawal rejected.');
    await load();
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
          <CardHeader><CardTitle>Withdrawal requests</CardTitle><p className="text-sm text-muted-foreground">Approval is not payment confirmation. Only a verified payout-provider callback can mark a withdrawal paid.</p></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Bank</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {wrs.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">No requests</TableCell></TableRow>}
                {wrs.map(w => (
                  <TableRow key={w.id}>
                    <TableCell>{new Date(w.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{w.currency} {Number(w.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{w.bank_name} · {w.bank_country || '—'}<br />Account ending ····{w.account_last4 || 'unavailable'}<br />{w.account_name}</TableCell>
                    <TableCell><Badge variant="secondary">{w.status}</Badge></TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap">
                      {w.status === 'pending' && <><Button size="sm" onClick={() => setW(w.id, 'approved')}>Approve</Button><Button size="sm" variant="outline" onClick={() => setW(w.id, 'rejected')}>Reject</Button></>}
                      {w.status === 'approved' && <span className="text-xs text-muted-foreground">Awaiting payout provider confirmation</span>}
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
