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
type HoldRow = { id: string; source_id: string; screening_id: string | null; live_stream_id: string | null; source_type: string; currency: string; gross_amount_minor: number; net_amount_minor: number; hold_status: string; event_ended_at: string | null; delivery_confirmed_at: string | null; release_at: string | null; hold_hours: number; created_at: string };
type ContributionRow = { id: string; screening_id: string | null; live_stream_id: string | null; contribution_type: string; gift_catalog_key: string | null; message: string | null; amount_minor: number; currency: string; status: string; is_anonymous: boolean; created_at: string };
const moneyMinor = (amount: number, currency: string) => {
  const digits = /^[A-Z]{3}$/.test(currency) ? new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits : 2;
  return money(Number(amount || 0) / Math.pow(10, digits), currency);
};
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
  const [eventHolds, setEventHolds] = useState<HoldRow[]>([]);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [refundReasons, setRefundReasons] = useState<Record<string, string>>({});
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [eventTitles, setEventTitles] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ amount: '', currency: '', bank_country: '', bank_name: '', account_number: '', account_name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [b, w, holds, fans] = await Promise.all([
      supabase.rpc('wallet_balance_by_currency', { _user_id: user.id }),
      supabase.from('withdrawal_requests').select('id, amount, currency, bank_country, status, created_at, bank_name').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('event_settlement_holds').select('id,source_id,screening_id,live_stream_id,source_type,currency,gross_amount_minor,net_amount_minor,hold_status,event_ended_at,delivery_confirmed_at,release_at,hold_hours,created_at').eq('creator_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('event_contributions').select('id,screening_id,live_stream_id,contribution_type,gift_catalog_key,message,amount_minor,currency,status,is_anonymous,created_at').eq('creator_id', user.id).order('created_at', { ascending: false }).limit(100),
    ]);
    if (b.error) toast.error('Wallet balances could not be loaded.');
    const rows = (b.data as Bal[] | null) || [];
    setBalances(rows.map(row => ({ ...row, gross: Number(row.gross), fees: Number(row.fees), escrow: Number(row.escrow), withdrawable: Number(row.withdrawable) })));
    setForm(current => ({ ...current, currency: current.currency || rows[0]?.currency || '', bank_country: current.bank_country || runtime.config?.geo.countryCode || '' }));
    setReqs((w.data as WR[]) || []);
    if (holds.error) toast.error('Event settlement holds could not be loaded.');
    if (fans.error) toast.error('Fan contributions could not be loaded.');
    const holdRows = (holds.data as HoldRow[]) || [];
    const contributionRows = (fans.data as ContributionRow[]) || [];
    setEventHolds(holdRows);
    setContributions(contributionRows);
    const screeningIds = [...new Set([...holdRows.map(row => row.screening_id), ...contributionRows.map(row => row.screening_id)].filter((id): id is string => Boolean(id)))];
    const streamIds = [...new Set([...holdRows.map(row => row.live_stream_id), ...contributionRows.map(row => row.live_stream_id)].filter((id): id is string => Boolean(id)))];
    const titleMap: Record<string, string> = {};
    const [screeningTitles, streamTitles] = await Promise.all([
      screeningIds.length ? supabase.from('screenings').select('id,title').in('id', screeningIds) : Promise.resolve({ data: [] }),
      streamIds.length ? supabase.from('live_streams').select('id,title').in('id', streamIds) : Promise.resolve({ data: [] }),
    ]);
    (screeningTitles.data || []).forEach(row => { titleMap[row.id] = row.title; });
    (streamTitles.data || []).forEach(row => { titleMap[row.id] = row.title; });
    setEventTitles(titleMap);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [user?.id]);
  useEffect(() => { if (!form.bank_country && runtime.config?.geo.countryCode) setForm(current => ({ ...current, bank_country: runtime.config!.geo.countryCode! })); }, [runtime.config?.geo.countryCode, form.bank_country]);

  const selectedBalance = balances.find(row => row.currency === form.currency);
  const requestRefund = async (hold: HoldRow) => {
    const reason = (refundReasons[hold.id] || '').trim();
    if (reason.length < 3) { toast.error('Enter a refund reason of at least three characters.'); return; }
    setRefundingId(hold.id);
    const { data, error } = await supabase.functions.invoke('process-refund', { body: { ticketId: hold.source_id, reason } });
    setRefundingId(null);
    if (error || data?.error) { toast.error(data?.error || error?.message || 'Refund request failed.'); return; }
    if (data?.pending) toast.message('The payment provider is processing the refund. Ticket access remains active until confirmation.');
    else toast.success('Provider-confirmed refund completed. Ticket access and settlement records were updated.');
    await load();
  };
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

          <section className="space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Event settlement holds</h2><Badge variant="outline">Platform verified</Badge></div>
            {eventHolds.length === 0 ? <Card><CardContent className="p-5 text-sm text-muted-foreground">Event-linked settlement records will appear after verified ticket, tip or gift payments.</CardContent></Card> :
              <div className="grid gap-3">{eventHolds.map(hold => <Card key={hold.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{eventTitles[hold.screening_id || hold.live_stream_id || ''] || 'Creator event'} · <span className="capitalize">{hold.source_type}</span> · {hold.currency}</p><Badge variant={hold.hold_status === 'eligible' ? 'default' : 'secondary'} className="capitalize">{hold.hold_status}</Badge></div>
                  <p className="mt-1 text-xs text-muted-foreground">Gross {moneyMinor(hold.gross_amount_minor, hold.currency)} · Creator net {moneyMinor(hold.net_amount_minor, hold.currency)} · {hold.hold_hours}h hold</p>
                  <p className="text-xs text-muted-foreground">{hold.event_ended_at ? 'Event ended ' + new Date(hold.event_ended_at).toLocaleString() : 'Awaiting event completion'} · {hold.delivery_confirmed_at ? 'Delivery verified' : 'Awaiting platform delivery confirmation'}</p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="text-left text-xs text-muted-foreground sm:text-right">{hold.release_at ? 'Settlement target: ' + new Date(hold.release_at).toLocaleString() : 'Funds remain held until delivery is verified'}</div>
                  {hold.source_type === 'ticket' && hold.hold_status !== 'refunded' && <div className="flex w-full gap-2 sm:max-w-xs"><Input aria-label="Refund reason" value={refundReasons[hold.id] || ''} onChange={e=>setRefundReasons(current=>({...current,[hold.id]:e.target.value}))} placeholder="Refund reason"/><Button size="sm" variant="outline" disabled={refundingId===hold.id} onClick={()=>void requestRefund(hold)}>{refundingId===hold.id?<Loader2 className="h-4 w-4 animate-spin"/>:'Refund'}</Button></div>}
                </div>
              </CardContent></Card>)}</div>}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Tips & fan gifts</h2><Badge variant="outline">{contributions.length} records</Badge></div>
            {contributions.length === 0 ? <Card><CardContent className="p-5 text-sm text-muted-foreground">Verified fan tips and gifts will appear here separately from ticket revenue.</CardContent></Card> :
              <div className="grid gap-2">{contributions.map(item => <Card key={item.id}><CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{eventTitles[item.screening_id || item.live_stream_id || ''] || 'Creator content'} · <span className="capitalize">{item.contribution_type}{item.gift_catalog_key ? ' · ' + item.gift_catalog_key : ''}</span></p><Badge variant="outline" className="capitalize">{item.status}</Badge></div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.is_anonymous ? 'Anonymous supporter' : 'Named supporter'} · {new Date(item.created_at).toLocaleString()}</p>
                  {item.message && <p className="mt-2 text-sm">{item.message}</p>}
                </div><p className="whitespace-nowrap text-sm font-semibold">{moneyMinor(item.amount_minor, item.currency)}</p>
              </CardContent></Card>)}</div>}
          </section>

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
