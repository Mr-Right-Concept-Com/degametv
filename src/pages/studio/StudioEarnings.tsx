import { useState, useEffect } from 'react';
import { z } from 'zod';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Percent, Lock, Wallet, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';

const wSchema = z.object({
  amount: z.number().positive('Enter an amount'),
  bank_name: z.string().trim().min(2, 'Bank required').max(100),
  account_number: z.string().trim().regex(/^\d{10}$/, '10-digit account number'),
  account_name: z.string().trim().min(2, 'Account name required').max(150),
});

type Bal = { gross: number; fees: number; escrow: number; withdrawable: number };
type WR = { id: string; amount: number; status: string; created_at: string; bank_name: string };

const naira = (n: number) => `₦${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function StudioEarnings() {
  usePageTitle('Studio: Wallet & Earnings');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bal, setBal] = useState<Bal>({ gross: 0, fees: 0, escrow: 0, withdrawable: 0 });
  const [reqs, setReqs] = useState<WR[]>([]);
  const [form, setForm] = useState({ amount: '', bank_name: '', account_number: '', account_name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [b, w] = await Promise.all([
      supabase.rpc('wallet_balance', { _user_id: user.id }),
      supabase.from('withdrawal_requests').select('id, amount, status, created_at, bank_name').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    const row = (b.data as Bal[] | null)?.[0];
    if (row) setBal({ gross: +row.gross, fees: +row.fees, escrow: +row.escrow, withdrawable: +row.withdrawable });
    setReqs((w.data as WR[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  const request = async () => {
    if (!user) return;
    setErrors({});
    const r = wSchema.safeParse({ ...form, amount: Number(form.amount) });
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach(i => { e[String(i.path[0])] = i.message; });
      setErrors(e); return;
    }
    if (r.data.amount > bal.withdrawable) { setErrors({ amount: 'Exceeds withdrawable balance' }); return; }
    setBusy(true);
    const { error } = await supabase.from('withdrawal_requests').insert({ ...r.data, user_id: user.id } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Withdrawal requested');
    setForm({ amount: '', bank_name: '', account_number: '', account_name: '' });
    load();
  };

  const statusCls: Record<string, string> = {
    pending: 'bg-accent/15 text-accent-foreground', approved: 'bg-primary/15 text-primary',
    paid: 'bg-success/15 text-success', rejected: 'bg-destructive/15 text-destructive',
  };

  return (
    <StudioLayout title="Wallet & Earnings" description="Gross revenue, platform fees, escrow and payouts">
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Gross ticket revenue', value: naira(bal.gross), icon: DollarSign },
              { label: 'Platform fees', value: naira(bal.fees), icon: Percent },
              { label: 'In escrow (7-day hold)', value: naira(bal.escrow), icon: Lock },
              { label: 'Withdrawable', value: naira(bal.withdrawable), icon: Wallet },
            ].map(s => (
              <Card key={s.label}><CardContent className="pt-6 pb-5">
                <s.icon className="w-5 h-5 mb-3 text-primary" />
                <p className="text-2xl font-bold mb-1">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent></Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Request withdrawal</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {([['amount', 'Amount (₦)', 'number'], ['bank_name', 'Bank', 'text'], ['account_number', 'Account number', 'text'], ['account_name', 'Account name', 'text']] as const).map(([k, l, t]) => (
                  <div key={k} className="space-y-1">
                    <Label htmlFor={k}>{l}</Label>
                    <Input id={k} type={t} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                    {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
                  </div>
                ))}
                <Button onClick={request} disabled={busy || bal.withdrawable <= 0} className="rounded-full">
                  {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Request payout
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Payout history</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {reqs.length === 0 && <p className="text-sm text-muted-foreground">No withdrawals yet.</p>}
                {reqs.map(r => (
                  <div key={r.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{naira(r.amount)}</p>
                      <p className="text-xs text-muted-foreground">{r.bank_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className={statusCls[r.status]}>{r.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </StudioLayout>
  );
}
