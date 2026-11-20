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
import { useRuntimeConfig } from '@/contexts/RuntimeConfigContext';

const wSchema = z.object({
  amount: z.number().positive('Enter an amount'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Choose a valid currency'),
  bank_country: z.string().regex(/^[A-Z]{2}$/, 'Choose a bank country'),
  bank_name: z.string().trim().min(2, 'Bank required').max(100),
  account_number: z.string().trim().regex(/^[A-Za-z0-9 -]{4,34}$/, 'Enter a valid local account number or IBAN'),
  account_name: z.string().trim().min(2, 'Account name required').max(150),
});

type Bal = { currency: string; gross: number; fees: number; escrow: number; withdrawable: number };
type WR = { id: string; amount: number; currency: string; bank_country: string | null; status: string; created_at: string; bank_name: string };
type Contribution = { id: string; contribution_type: 'tip' | 'gift'; amount_minor: number; amount_major: number | null; currency: string; contributor_name: string; message: string | null; is_anonymous: boolean; status: string; paid_at: string | null; event_title: string };
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
  const runtime = useRuntimeConfig();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<Bal[]>([]);
  const [reqs, setReqs] = useState<WR[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [form, setForm] = useState({ amount: '', currency: '', bank_country: '', bank_name: '', account_number: '', account_name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [b, w, c] = await Promise.all([
      supabase.rpc('wallet_balance_by_currency', { _user_id: user.id }),
      supabase.from('withdrawal_requests').select('id, amount, currency, bank_country, status, created_at, bank_name').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (b.error) toast.error('Wallet balances could not be loaded.');
    const rows = (b.data as Bal[] | null) || [];
    setBalances(rows.map(row => ({ ...row, gross: Number(row.gross), fees: Number(row.fees), escrow: Number(row.escrow), withdrawable: Number(row.withdrawable) })));
    setForm(current => ({ ...current, currency: current.currency || rows[0]?.currency || '', bank_country: current.bank_country || runtime.config?.geo.countryCode || '' }));
    setReqs((w.data as WR[]) || []);
    setContributions((c.data as unknown as Contribution[]) || []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [user?.id]);
  useEffect(() => { if (!form.bank_country && runtime.config?.geo.countryCode) setForm(current => ({ ...current, bank_country: runtime.config!.geo.countryCode! })); }, [runtime.config?.geo.countryCode, form.bank_country]);

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
    const { error } = await supabase.rpc('request_wallet_withdrawal', { p_amount: r.data.amount, p_currency: r.data.currency, p_bank_country: r.data.bank_country, p_bank_name: r.data.bank_name, p_account_number: r.data.account_number, p_account_name: r.data.account_name });
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
                  { label: 'Gross earnings · tickets, tips & gifts', value: money(balance.gross, balance.currency), icon: DollarSign },
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

          <Card>
            <CardHeader><CardTitle className="text-lg">Tips and digital gifts</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {contributions.length === 0 ? <p className="text-sm text-muted-foreground">No tips or gifts received yet.</p> : contributions.map(item => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0">
                  <div className="min-w-0"><p className="font-medium text-sm">{item.contribution_type === 'tip' ? 'Tip' : 'Digital gift'} · {item.event_title}</p><p className="text-xs text-muted-foreground">{item.contributor_name}{item.message ? ' · "' + item.message + '"' : ''}</p><p className="text-[10px] text-muted-foreground">{item.paid_at ? new Date(item.paid_at).toLocaleString() : 'Awaiting payment'}</p></div>
                  <div className="text-right"><p className="font-semibold">{money(Number(item.amount_major ?? 0), item.currency)}</p><Badge variant={item.status === 'paid' ? 'default' : item.status === 'failed' ? 'destructive' : 'secondary'}>{item.status}</Badge></div>
                </div>
              ))}
            </CardContent>
          </Card>

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
                <div className="space-y-1">
                  <Label htmlFor="bank_country">Bank country / destination</Label>
                  <select id="bank_country" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.bank_country} onChange={e => setForm(current => ({ ...current, bank_country: e.target.value }))}>
                    <option value="">Choose destination country</option>
                    {(runtime.config?.countries ?? []).map(country => <option key={country.country_code} value={country.country_code}>{String(country.metadata?.country_name || country.country_code)} · {country.country_code}</option>)}
                  </select>
                  {errors.bank_country && <p className="text-xs text-destructive">{errors.bank_country}</p>}
                </div>
                {([['amount', 'Amount', 'number'], ['bank_name', 'Bank / payout institution', 'text'], ['account_number', 'Account number / IBAN', 'text'], ['account_name', 'Account holder name', 'text']] as const).map(([key, label, type]) => (
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
                      <p className="text-xs text-muted-foreground">{row.bank_name} · {row.bank_country || '—'} · {new Date(row.created_at).toLocaleDateString()}</p>
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
