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
  currency: z.string().regex(/^[A-Z]{3}$/, 'Choose a valid currency'),
  bank_name: z.string().trim().min(2, 'Bank required').max(100),
  account_number: z.string().trim().regex(/^\d{10}$/, '10-digit account number'),
  account_name: z.string().trim().min(2, 'Account name required').max(150),
});

type Bal = { currency: string; gross: number; fees: number; escrow: number; withdrawable: number };
type WR = { id: string; amount: number; currency: string; status: string; created_at: string; bank_name: string };
const money = (n: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n || 0));
  } catch {
    return currency + ' ' + Number(n || 0).toLocaleString();
  }
};

export default function StudioEarnings() {
  usePageTitle('Studio: Wallet & Earnings');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<Bal[]>([]);
  const [reqs, setReqs] = useState<WR[]>([]);
  const [form, setForm] = useState({ amount: '', currency: '', bank_name: '', account_number: '', account_name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [b, w] = await Promise.all([
      supabase.rpc('wallet_balance_by_currency', { _user_id: user.id }),
      supabase.from('withdrawal_requests').select('id, amount, currency, status, created_at, bank_name').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (b.error) toast.error('Wallet balances could not be loaded.');
    const rows = (b.data as Bal[] | null) || [];
    setBalances(rows.map(row => ({ ...row, gross: Number(row.gross), fees: Number(row.fees), escrow: Number(row.escrow), withdrawable: Number(row.withdrawable) })));
    setForm(current => ({ ...current, currency: current.currency || rows[0]?.currency || '' }));
    setReqs((w.data as WR[]) || []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [user?.id]);

  const selectedBalance = balances.find(row => row.currency === form.currency);
  const request = async () => {
    if (!user) return;
    setErrors({});
    const r = wSchema.safeParse({ ...form, amount: Number(form.amount) });
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach(i => { e[String(i.path[0])] = i.message; });
      setErrors(e);
      return;
    }
    if (!selectedBalance || r.data.amount > selectedBalance.withdrawable) {
      setErrors({ amount: 'Exceeds the withdrawable balance in this currency.' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('withdrawal_requests').insert({ ...r.data, user_id: user.id } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Withdrawal requested in ' + r.data.currency + '.');
    setForm(current => ({ ...current, amount: '', bank_name: '', account_number: '', account_name: '' }));
    await load();
  };

  const statusCls: Record<string, string> = {
    pending: 'bg-accent/15 text-accent-foreground', approved: 'bg-primary/15 text-primary',
    paid: 'bg-success/15 text-success', rejected: 'bg-destructive/15 text-destructive',
  };

  return (
    <StudioLayout title="Wallet & Earnings" description="Currency-separated revenue, platform fees, escrow and payouts">
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-6">
          {balances.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No settled or pending wallet activity yet. Earnings will appear here in the original transaction currency.</CardContent></Card>
          ) : balances.map(balance => (
            <section key={balance.currency} className="space-y-3">
              <div className="flex items-center justify-between"><h2 className="font-semibold">{balance.currency} wallet</h2><Badge variant="outline">Original transaction currency</Badge></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Gross ticket revenue', value: money(balance.gross, balance.currency), icon: DollarSign },
                  { label: 'Platform fees', value: money(balance.fees, balance.currency), icon: Percent },
                  { label: 'In escrow', value: money(balance.escrow, balance.currency), icon: Lock },
                  { label: 'Withdrawable', value: money(balance.withdrawable, balance.currency), icon: Wallet },
                ].map(item => (
                  <Card key={item.label}><CardContent className="pt-6 pb-5">
                    <item.icon className="w-5 h-5 mb-3 text-primary" />
                    <p className="text-xl font-bold mb-1">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </CardContent></Card>
                ))}
              </div>
            </section>
          ))}

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Request withdrawal</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="withdraw-currency">Payout currency</Label>
                  <select id="withdraw-currency" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.currency} onChange={e => setForm(current => ({ ...current, currency: e.target.value }))}>
                    <option value="">Choose currency</option>
                    {balances.filter(balance => balance.withdrawable > 0).map(balance => <option key={balance.currency} value={balance.currency}>{balance.currency} · available {money(balance.withdrawable, balance.currency)}</option>)}
                  </select>
                  {errors.currency && <p className="text-xs text-destructive">{errors.currency}</p>}
                </div>
                {([['amount', 'Amount', 'number'], ['bank_name', 'Bank', 'text'], ['account_number', 'Account number', 'text'], ['account_name', 'Account name', 'text']] as const).map(([key, label, type]) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={key}>{label}</Label>
                    <Input id={key} type={type} value={form[key]} onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))} />
                    {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Payouts are requested only against settled funds in the selected currency. Availability depends on a verified payout provider for that currency and country.</p>
                <Button onClick={request} disabled={busy || !selectedBalance || selectedBalance.withdrawable <= 0} className="rounded-full">
                  {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Request payout
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Payout history</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {reqs.length === 0 && <p className="text-sm text-muted-foreground">No withdrawals yet.</p>}
                {reqs.map(row => (
                  <div key={row.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{money(row.amount, row.currency)}</p>
                      <p className="text-xs text-muted-foreground">{row.bank_name} · {new Date(row.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className={statusCls[row.status] || ''}>{row.status}</Badge>
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
