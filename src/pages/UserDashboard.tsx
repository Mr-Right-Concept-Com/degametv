import { useState, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Ticket, Play, Clock, CheckCircle, Copy, Film, User, Wallet,
  LogOut, ArrowRight, Calendar, Loader2, Settings, Star, Shield, Award, Sparkles, Download
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRuntimeConfig } from '@/contexts/RuntimeConfigContext';
import type { Database, Tables } from '@/integrations/supabase/types';


const displayNameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name must be under 50 characters');
const invitationListSchema = z.array(z.object({
  id: z.string(),
  event: z.object({
    title: z.string().nullable().optional(),
    screening_date: z.string().nullable().optional(),
  }).nullable().optional(),
  invite_role: z.string(),
  expires_at: z.string().nullable().optional(),
  status: z.string(),
  screening_id: z.string().nullable().optional(),
}));
type DashboardTicket = Tables<'screening_tickets'> & {
  screening: Pick<Tables<'screenings'>, 'title' | 'poster_url' | 'slug'> | null;
};
type DashboardWatchHistory = Tables<'watch_history'> & {
  content: Pick<Tables<'content'>, 'title' | 'poster_url'> | null;
};
type WalletBalance = Database['public']['Functions']['wallet_balance_by_currency']['Returns'][number];
type PersonalWalletBalance = Database['public']['Functions']['get_my_personal_wallet_balances']['Returns'][number];
const walletTopupResponseSchema = z.union([z.object({ success: z.literal(true), checkoutUrl: z.string().url(), reference: z.string() }),z.object({ success: z.literal(true), paid: z.literal(true), reference: z.string() }),z.object({ success: z.literal(false), error: z.string().optional(), retryable: z.boolean().optional() })]);
type WalletActivity = Database['public']['Functions']['get_my_wallet_activity']['Returns'][number];
type DashboardInvitation = z.infer<typeof invitationListSchema>[number];

export default function UserDashboard() {
  const { user, signOut } = useAuth();
  const { config: runtimeConfig, refresh: refreshRuntimeConfig } = useRuntimeConfig();
  const navigate = useNavigate();
  usePageTitle('My Dashboard');
  const [tickets, setTickets] = useState<DashboardTicket[]>([]);
  const [watchHistory, setWatchHistory] = useState<DashboardWatchHistory[]>([]);
  const [loyalty, setLoyalty] = useState<Tables<'loyalty_points'>[]>([]);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [personalWalletBalances, setPersonalWalletBalances] = useState<PersonalWalletBalance[]>([]);
  const [walletTopupCurrencies, setWalletTopupCurrencies] = useState<string[]>([]);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupCurrency, setTopupCurrency] = useState('');
  const [topupBusy, setTopupBusy] = useState(false);
  const topupIdempotencyKey = useRef(crypto.randomUUID());
  const [walletActivity, setWalletActivity] = useState<WalletActivity[]>([]);
  const [walletCurrencyFilter, setWalletCurrencyFilter] = useState('all');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawCurrency, setWithdrawCurrency] = useState('');
  const [bankCountry, setBankCountry] = useState('NG');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);

  const [invitations, setInvitations] = useState<DashboardInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [preferredCountry, setPreferredCountry] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState('');
  const [preferredLocale, setPreferredLocale] = useState('');
  const [preferredTimezone, setPreferredTimezone] = useState('');
  const [studioAccess, setStudioAccess] = useState<'checking' | 'approved' | 'not-approved'>('checking');

  const checkStudioAccess = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!user?.id) return;
    try {
      const { data: roles, error: roleError } = await supabase.from('user_roles')
        .select('role').eq('user_id', user.id)
        .in('role', ['creator', 'super_admin', 'platform_admin']);
      if (roleError) throw roleError;
      if (!isCurrent()) return;
      const roleSet = new Set((roles ?? []).map(row => row.role));
      if (roleSet.has('super_admin') || roleSet.has('platform_admin')) {
        setStudioAccess('approved');
        return;
      }
      if (roleSet.has('creator')) {
        const { data, error } = await supabase.rpc('get_my_studio_account');
        if (error) throw error;
        if (!isCurrent()) return;
        setStudioAccess(data?.[0]?.status === 'approved' ? 'approved' : 'not-approved');
        return;
      }
      const { data: member, error: memberError } = await supabase.rpc('is_studio_member', { _user_id: user.id });
      if (memberError) throw memberError;
      if (isCurrent()) setStudioAccess(member ? 'approved' : 'not-approved');
    } catch {
      if (isCurrent()) setStudioAccess('not-approved');
    }
  }, [user?.id]);

  const fetchAll = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [ticketsRes, historyRes, profileRes, loyaltyRes, walletRes, personalWalletRes, walletActivityRes, currencyRulesRes, inviteRes] = await Promise.all([
        supabase.from('screening_tickets')
          .select('*, screening:screenings(title,poster_url,slug)')
          .or('user_id.eq.' + user.id + ',email.eq.' + (user.email ?? ''))
          .order('created_at', { ascending: false }).limit(20),
        supabase.from('watch_history').select('*, content(title,poster_url)')
          .eq('user_id', user.id).order('last_watched_at', { ascending: false }).limit(10),
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('loyalty_points').select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(50),
        supabase.rpc('wallet_balance_by_currency', { _user_id: user.id }),
        supabase.rpc('get_my_personal_wallet_balances'),
        supabase.rpc('get_my_wallet_activity', { p_limit: 100 }),
        supabase.from('country_currency_rules').select('currency_code').eq('enabled', true).order('currency_code'),
        supabase.functions.invoke('manage-event-invites', { body: { action: 'my_invitations' } }),
      ]);
      if (!isCurrent()) return;
      if (ticketsRes.error) toast.error('Your tickets could not be loaded.');
      setTickets(ticketsRes.data ?? []);
      if (historyRes.error) toast.error('Your watch history could not be loaded.');
      setWatchHistory(historyRes.data ?? []);
      if (loyaltyRes.error) toast.error('Your rewards history could not be loaded.');
      setLoyalty(loyaltyRes.data ?? []);
      if (walletRes.error) toast.error('Creator balances could not be loaded.');
      setWalletBalances(walletRes.data ?? []);
      if (personalWalletRes.error) toast.error('Personal Wallet balances could not be loaded.');
      const personalBalances = personalWalletRes.data ?? [];
      setPersonalWalletBalances(personalBalances);
      if (currencyRulesRes.error) toast.error('Available wallet currencies could not be loaded.');
      const supportedCurrencies = [...new Set((currencyRulesRes.data ?? []).map(row => row.currency_code))].sort();
      setWalletTopupCurrencies(supportedCurrencies);
      setTopupCurrency(current => current || (profileRes.data?.preferred_currency && supportedCurrencies.includes(profileRes.data.preferred_currency) ? profileRes.data.preferred_currency : supportedCurrencies[0] || personalBalances[0]?.currency || ''));
      if (walletActivityRes.error) toast.error('Wallet activity could not be loaded.');
      setWalletActivity(walletActivityRes.data ?? []);
      if (inviteRes.error) toast.error('Your event invitations could not be loaded.');
      else {
        const parsed = invitationListSchema.safeParse(inviteRes.data?.invitations);
        if (parsed.success) setInvitations(parsed.data);
        else if (inviteRes.data?.invitations != null) toast.error('The event invitation response was invalid.');
      }
      if (profileRes.error) toast.error('Your profile could not be loaded.');
      else if (profileRes.data) {
        setProfile(profileRes.data);
        setDisplayName(profileRes.data.display_name || profileRes.data.full_name || '');
        setPreferredCountry(profileRes.data.preferred_country || runtimeConfig?.geo.countryCode || '');
        setPreferredCurrency(profileRes.data.preferred_currency || '');
        setPreferredLocale(profileRes.data.locale_code || runtimeConfig?.locale || '');
        setPreferredTimezone(profileRes.data.timezone || runtimeConfig?.timezone || 'UTC');
      }
    } catch {
      if (isCurrent()) toast.error('Some dashboard information could not be loaded. Please try again.');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [user?.id, user?.email, runtimeConfig?.geo.countryCode, runtimeConfig?.locale, runtimeConfig?.timezone]);

  useEffect(() => {
    let active = true;
    if (!user) {
      navigate('/auth');
      setLoading(false);
      return () => { active = false; };
    }
    void fetchAll(() => active);
    void checkStudioAccess(() => active);
    return () => { active = false; };
  }, [user?.id, user?.email, navigate, fetchAll, checkStudioAccess]);

  const submitWalletTopup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(topupCurrency)) { toast.error('Enter a valid top-up amount and currency.'); return; }
    if (topupBusy) return;
    setTopupBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('personal-wallet-topup', { body: { amount, currency: topupCurrency, idempotencyKey: topupIdempotencyKey.current } });
      const parsed = walletTopupResponseSchema.safeParse(data);
      if (error || !parsed.success || !parsed.data.success) {
        if (parsed.success && !parsed.data.success && parsed.data.retryable) topupIdempotencyKey.current = crypto.randomUUID();
        toast.error(parsed.success && !parsed.data.success ? parsed.data.error || 'Wallet top-up could not be started.' : error?.message || 'Wallet top-up returned an invalid response.');
        return;
      }
      topupIdempotencyKey.current = crypto.randomUUID();
      if ('paid' in parsed.data && parsed.data.paid) { toast.success('Personal Wallet top-up confirmed.'); setTopupAmount(''); await fetchAll(); return; }
      if ('checkoutUrl' in parsed.data) window.location.assign(parsed.data.checkoutUrl);
      else toast.error('Wallet top-up response did not include a checkout destination.');
    } catch { toast.error('Wallet top-up could not be started. You can safely retry.'); }
    finally { setTopupBusy(false); }
  };

  const submitWithdrawalRequest = async () => {
    if (!user?.id) return;
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(withdrawCurrency) ||
        !/^[A-Z]{2}$/.test(bankCountry) || bankName.trim().length < 2 ||
        accountName.trim().length < 2 || !/^[A-Za-z0-9 -]{4,34}$/.test(accountNumber.trim())) {
      toast.error('Enter a valid amount, currency and bank account details.');
      return;
    }
    setRequestingWithdrawal(true);
    try {
      const { error } = await supabase.rpc('request_wallet_withdrawal', {
        p_amount: amount, p_currency: withdrawCurrency, p_bank_country: bankCountry,
        p_bank_name: bankName.trim(), p_account_number: accountNumber.trim(), p_account_name: accountName.trim(),
      });
      if (error) toast.error(error.message || 'Unable to submit withdrawal request.');
      else {
        toast.success('Withdrawal request submitted for review.');
        setWithdrawAmount(''); setBankName(''); setAccountNumber(''); setAccountName('');
        await fetchAll();
      }
    } catch {
      toast.error('Unable to submit withdrawal request. Please try again.');
    } finally {
      setRequestingWithdrawal(false);
    }
  };

  const saveProfile = async () => {
    const result = displayNameSchema.safeParse(displayName);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    if (!user?.id) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles')
        .update({ display_name: result.data, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) toast.error('Failed to save');
      else {
        setProfile(current => current ? { ...current, display_name: result.data } : current);
        toast.success('Profile updated!');
      }
    } catch {
      toast.error('Failed to save your profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePreferences = async () => {
    if (!user?.id) return;
    if (preferredCountry && !/^[A-Z]{2}$/.test(preferredCountry)) { toast.error('Choose a valid country.'); return; }
    if (preferredCurrency && !/^[A-Z]{3}$/.test(preferredCurrency)) { toast.error('Choose a valid currency.'); return; }
    if (preferredLocale.trim().length > 24 || (preferredLocale.trim() && !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(preferredLocale.trim()))) { toast.error('Enter a valid language tag, such as en-US or fr-CA.'); return; }
    setSavingProfile(true);
    const locale = preferredLocale.trim() || null;
    try {
      const { data, error } = await supabase.functions.invoke('update-locale-preferences', {
        body: {
          country: preferredCountry || null,
          currency: preferredCurrency || null,
          language: locale ? locale.split('-')[0] : null,
          locale,
          timezone: preferredTimezone.trim() || null,
        },
      });
      if (error) toast.error(error.message);
      else if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') toast.error(data.error);
      else {
        setProfile(current => current ? {
          ...current,
          preferred_country: preferredCountry || null,
          preferred_currency: preferredCurrency || null,
          locale_code: locale,
          timezone: preferredTimezone.trim() || null,
        } : current);
        toast.success('Language, location, currency and timezone preferences saved.');
        await refreshRuntimeConfig();
      }
    } catch {
      toast.error('Unable to save your preferences. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const now = new Date();
  const activeTickets = tickets.filter(t => t.payment_status === 'completed' && new Date(t.expires_at) > now);
  const pendingTickets = tickets.filter(t => t.payment_status === 'pending');
  const expiredTickets = tickets.filter(t => t.payment_status === 'completed' && new Date(t.expires_at) <= now);

  const copyWatchLink = async (watchCode: string, email: string) => {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/watch/' + watchCode + '?email=' + encodeURIComponent(email));
      toast.success('Watch link copied!');
    } catch {
      toast.error('Unable to copy the watch link. Copy the page address manually.');
    }
  };

  const initials = (user?.email || 'U').charAt(0).toUpperCase();
  const userName = displayName || profile?.full_name || user?.email?.split('@')[0] || 'User';
  const loyaltyBalance = loyalty.reduce((sum, l) => sum + (l.points || 0), 0);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8 p-5 rounded-2xl bg-secondary/50">
          <Avatar className="w-16 h-16 border-2 border-primary/20">
            <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{userName}</h1>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 text-primary">
                <Shield className="w-2.5 h-2.5 mr-1" />Viewer
              </Badge>
              <span className="text-xs text-muted-foreground">{activeTickets.length} active ticket{activeTickets.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => { signOut(); navigate('/'); }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"><div><p className="font-semibold">Need a hand?</p><p className="text-xs text-muted-foreground">Get help with your account, tickets, wallet, playback or Creator Studio.</p></div><Button asChild variant="outline" className="rounded-full"><Link to="/support">Help &amp; Support <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>

        {/* Studio access is surfaced here only after approval. */}
        {studioAccess === 'approved' ? (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-semibold">Your Creator Studio is ready</p><p className="text-xs text-muted-foreground">Manage your catalogue, publish content and host ticketed live events.</p></div>
            <Button asChild className="rounded-full"><Link to="/studio"><Film className="mr-2 h-4 w-4"/>Open Studio Portal</Link></Button>
          </div>
        ) : studioAccess === 'not-approved' ? (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-semibold">Become a DeGameTV creator</p><p className="text-xs text-muted-foreground">Apply for Creator or Business access to premiere films and host ticketed live events.</p></div>
            <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/apply-filmmaker">Apply for Studio access</Link></Button>
          </div>
        ) : null}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Active Tickets', value: activeTickets.length, icon: CheckCircle, color: 'text-success' },
            { label: 'Pending', value: pendingTickets.length, icon: Clock, color: 'text-warning' },
            { label: 'Watched', value: watchHistory.length, icon: Play, color: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-secondary/50 p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue={(["wallet","invitations","history","rewards","profile","tickets"].includes(new URLSearchParams(window.location.search).get("tab") || "") ? new URLSearchParams(window.location.search).get("tab")! : "tickets")} className="space-y-4">
          <TabsList className="bg-secondary/50 w-full sm:w-auto">
            <TabsTrigger value="wallet"><Wallet className="w-4 h-4 mr-1.5" /> Wallet</TabsTrigger>
            <TabsTrigger value="tickets">
              <Ticket className="w-4 h-4 mr-1.5" />
              My Tickets
            </TabsTrigger>
            <TabsTrigger value="invitations"><Calendar className="w-4 h-4 mr-1.5" /> Invitations{invitations.length > 0 ? ` (${invitations.length})` : ""}</TabsTrigger>
            <TabsTrigger value="history">
              <Film className="w-4 h-4 mr-1.5" />
              History
            </TabsTrigger>
            <TabsTrigger value="rewards">
              <Award className="w-4 h-4 mr-1.5" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Settings className="w-4 h-4 mr-1.5" />
              Profile
            </TabsTrigger>
          </TabsList>


          <TabsContent value="wallet" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4"/> Financial Centre</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div><h3 className="font-semibold">Personal stored-value wallet</h3><p className="text-xs text-muted-foreground">Funds you top up and spend on creator tips and gifts. This balance is separate from creator earnings, escrow and payouts.</p></div>
                  {personalWalletBalances.length === 0 ? <p className="text-sm text-muted-foreground">No personal wallet balance yet. Complete a verified top-up to fund your wallet.</p> : <div className="grid gap-2 sm:grid-cols-2">{personalWalletBalances.map(balance => <div key={balance.currency} className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">{balance.currency} available to spend</p><p className="text-xl font-bold">{Number(balance.balance_major).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} {balance.currency}</p></div>)}</div>}
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div className="space-y-1"><Label htmlFor="personal-wallet-topup-amount">Top-up amount</Label><Input id="personal-wallet-topup-amount" type="number" min="0.01" step="0.01" value={topupAmount} onChange={event => setTopupAmount(event.target.value)} placeholder="0.00"/></div>
                    <div className="space-y-1"><Label htmlFor="personal-wallet-topup-currency">Currency</Label><select id="personal-wallet-topup-currency" value={topupCurrency} onChange={event => setTopupCurrency(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Choose currency</option>{walletTopupCurrencies.map(currency => <option key={currency} value={currency}>{currency}</option>)}</select></div>
                    <Button type="button" onClick={() => void submitWalletTopup()} disabled={topupBusy || !topupCurrency || !topupAmount.trim()}>{topupBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wallet className="mr-2 h-4 w-4"/>}Top up wallet</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Wallet funds are credited only after the payment provider webhook signature and transaction amount are verified.</p>
                </section>
                <div className="space-y-1"><h3 className="font-semibold">Creator earnings &amp; settlement</h3><p className="text-sm text-muted-foreground">Revenue from your creator activity remains in the creator ledger. Pending settlement is not withdrawable; only verified settled funds appear as available.</p></div>
                {walletBalances.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center"><Wallet className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40"/><p className="font-medium">No creator earnings yet</p><p className="mt-1 text-xs text-muted-foreground">When you earn from ticket sales, tips or gifts as an approved creator, your balances will appear here.</p></div> : walletBalances.map(balance => <div key={balance.currency} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Currency</p><p className="text-lg font-bold">{balance.currency}</p></div><div><p className="text-xs text-muted-foreground">Pending settlement</p><p className="text-lg font-semibold">{Number(balance.escrow || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p></div><div><p className="text-xs text-muted-foreground">Available to withdraw</p><p className="text-lg font-semibold text-primary">{Number(balance.withdrawable || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p></div></div>)}
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Creator earnings and settlement holds remain separate from your Personal Wallet balance.</div>
                <Card className="border-primary/20">
                  <CardHeader><CardTitle className="text-base">Request a creator payout</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><Label htmlFor="withdraw-amount">Amount</Label><Input id="withdraw-amount" type="number" min="0.01" step="0.01" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} placeholder="0.00"/></div>
                    <div className="space-y-1"><Label htmlFor="withdraw-currency">Earnings currency</Label><select id="withdraw-currency" value={withdrawCurrency} onChange={e=>setWithdrawCurrency(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select currency</option>{walletBalances.map(b=><option key={b.currency} value={b.currency}>{b.currency} · available {Number(b.withdrawable||0).toLocaleString()}</option>)}</select></div>
                    <div className="space-y-1"><Label htmlFor="bank-country">Bank country (ISO code)</Label><Input id="bank-country" value={bankCountry} onChange={e=>setBankCountry(e.target.value.toUpperCase().slice(0,2))} maxLength={2}/></div>
                    <div className="space-y-1"><Label htmlFor="bank-name">Bank name</Label><Input id="bank-name" value={bankName} onChange={e=>setBankName(e.target.value)} maxLength={120}/></div>
                    <div className="space-y-1"><Label htmlFor="account-number">Account number</Label><Input id="account-number" value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} maxLength={34} autoComplete="off"/></div>
                    <div className="space-y-1"><Label htmlFor="account-name">Account holder name</Label><Input id="account-name" value={accountName} onChange={e=>setAccountName(e.target.value)} maxLength={120}/></div>
                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Requests are checked against settled earnings and reserved balances. Submission does not guarantee approval or immediate payment.</p><Button onClick={()=>void submitWithdrawalRequest()} disabled={requestingWithdrawal||walletBalances.length===0}>{requestingWithdrawal?'Submitting…':'Request payout'}</Button></div>
                  </CardContent>
                </Card>
                <div className="space-y-3 rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><h3 className="font-semibold">Wallet activity</h3><p className="text-xs text-muted-foreground">Unified personal wallet, ticket, creator contribution and payout activity.</p></div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select aria-label="Filter wallet activity by currency" value={walletCurrencyFilter} onChange={event => setWalletCurrencyFilter(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
                        <option value="all">All currencies</option>
                        {[...new Set(walletActivity.map(row => row.currency))].sort().map(currency => <option key={currency} value={currency}>{currency}</option>)}
                      </select>
                      <Button type="button" size="sm" variant="outline" disabled={walletActivity.length === 0} onClick={() => {
                        const rows = walletActivity.filter(row => walletCurrencyFilter === 'all' || row.currency === walletCurrencyFilter);
                        const columns = ['Date','Type','Direction','Amount','Currency','Status','Description','Counterparty','Reference'];
                        const safeCell = (value: string | number) => {
                          const text = String(value ?? '');
                          const protectedText = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
                          return '"' + protectedText.replaceAll('"', '""') + '"';
                        };
                        const csv = [columns, ...rows.map(row => [row.created_at,row.activity_type,row.direction,row.amount_major,row.currency,row.status,row.description,row.counterparty,row.reference])].map(row => row.map(safeCell).join(',')).join('\r\n');
                        const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
                        const anchor = document.createElement('a');
                        anchor.href = url;
                        anchor.download = 'degametv-wallet-activity.csv';
                        anchor.click();
                        URL.revokeObjectURL(url);
                      }}><Download className="mr-2 h-4 w-4"/>Export CSV</Button>
                    </div>
                  </div>
                  {walletActivity.filter(row => walletCurrencyFilter === 'all' || row.currency === walletCurrencyFilter).length === 0
                    ? <p className="py-5 text-center text-sm text-muted-foreground">No wallet activity is recorded for this filter.</p>
                    : <div className="divide-y">{walletActivity.filter(row => walletCurrencyFilter === 'all' || row.currency === walletCurrencyFilter).map(row => <div key={row.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-medium">{row.description || row.activity_type}</p><p className="text-xs text-muted-foreground">{row.counterparty || 'Platform'} · {new Date(row.created_at).toLocaleString()} · {row.status}</p>{row.reference && <p className="truncate font-mono text-[10px] text-muted-foreground">{row.reference}</p>}</div><p className={`text-sm font-semibold ${row.direction === 'incoming' ? 'text-emerald-600' : 'text-foreground'}`}>{row.direction === 'incoming' ? '+' : '−'}{Number(row.amount_major).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} {row.currency}</p></div>)}</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TICKETS ─── */}
          <TabsContent value="tickets" className="space-y-3">
            {tickets.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Film className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <h3 className="font-bold mb-1">No tickets yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Browse our exclusive screenings and get your first ticket</p>
                  <Button className="rounded-full" asChild>
                    <Link to="/cinema">Browse Screenings <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {activeTickets.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Active</p>
                    {activeTickets.map(t => (
                      <TicketRow key={t.id} ticket={t} type="active" onCopy={copyWatchLink} />
                    ))}
                  </div>
                )}
                {pendingTickets.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Pending Payment</p>
                    {pendingTickets.map(t => (
                      <TicketRow key={t.id} ticket={t} type="pending" onCopy={copyWatchLink} />
                    ))}
                  </div>
                )}
                {expiredTickets.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Expired</p>
                    {expiredTickets.map(t => (
                      <TicketRow key={t.id} ticket={t} type="expired" onCopy={copyWatchLink} />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="space-y-3">
            {invitations.length === 0 ? (
              <Card><CardContent className="p-10 text-center"><Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" /><h3 className="font-semibold">No event invitations</h3><p className="mt-1 text-sm text-muted-foreground">Private premieres and screenings you are invited to will appear here.</p></CardContent></Card>
            ) : invitations.map(invite => (
              <Card key={invite.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0"><p className="font-semibold">{invite.event?.title || "Private event"}</p><p className="text-xs text-muted-foreground">{invite.invite_role} · {invite.event?.screening_date ? new Date(invite.event.screening_date).toLocaleString() : "Date to be announced"}</p><p className="text-xs text-muted-foreground">{invite.expires_at ? "Invitation expires " + new Date(invite.expires_at).toLocaleDateString() : "No expiry"}</p></div>
                <div className="flex items-center gap-2"><Badge variant={invite.status === "accepted" ? "default" : invite.status === "revoked" || invite.status === "expired" ? "destructive" : "secondary"}>{invite.status}</Badge>{invite.status === "accepted" && invite.screening_id && <Button asChild size="sm"><Link to={`/invited/${invite.screening_id}`}>Open event</Link></Button>}</div>
              </CardContent></Card>
            ))}
          </TabsContent>

          {/* ─── WATCH HISTORY ─── */}
          <TabsContent value="history">
            {watchHistory.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Play className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <h3 className="font-bold mb-1">No watch history</h3>
                  <p className="text-sm text-muted-foreground">Movies you watch will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {watchHistory.map(h => (
                  <Card key={h.id}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-12 h-16 rounded-lg bg-secondary overflow-hidden shrink-0">
                        {h.content?.poster_url && <img src={h.content.poster_url} alt={h.content.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{h.content?.title || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {h.completed ? '✓ Completed' : `${Math.round((h.watch_position || 0) / 60)}min watched`}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(h.last_watched_at).toLocaleDateString()}
                        </p>
                      </div>
                      {h.completed && <Star className="w-4 h-4 text-accent fill-accent shrink-0" />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── REWARDS ─── */}
          <TabsContent value="rewards" className="space-y-4">
            <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent">
              <CardContent className="p-6 text-center">
                <Sparkles className="w-8 h-8 text-accent mx-auto mb-2" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Loyalty Balance</p>
                <p className="text-5xl font-extrabold text-primary mt-1">{loyaltyBalance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">points · earn 1 pt per ₦100 spent</p>
                <p className="text-[11px] text-muted-foreground/70 mt-3">Redeem 500 pts for 10% off your next ticket</p>
              </CardContent>
            </Card>
            {loyalty.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Award className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No activity yet — buy a ticket to start earning</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {loyalty.map(l => (
                  <Card key={l.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{l.reason}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-sm font-bold ${l.points >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {l.points >= 0 ? '+' : ''}{l.points}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── PROFILE ─── */}

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" /> Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-3 rounded-xl border p-4">
                  <div><p className="font-medium text-sm">Region, language & currency</p><p className="text-xs text-muted-foreground">Location is suggested automatically. You can override display preferences whenever needed. Ticket and payment amounts remain in their original transaction currency.</p></div>
                  <div className="space-y-2">
                    <Label>Country / region</Label>
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={preferredCountry} onChange={e => { setPreferredCountry(e.target.value); const rule = runtimeConfig?.countries.find(c => c.country_code === e.target.value); if (rule) { if (!preferredCurrency) setPreferredCurrency(rule.currency_code); setPreferredLocale(rule.locale_code); } }}>
                      <option value="">Use detected location</option>
                      {(runtimeConfig?.countries ?? []).map(country => <option key={country.country_code} value={country.country_code}>{String(country.metadata?.country_name || country.country_code)} · {country.currency_code}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Display currency</Label>
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={preferredCurrency} onChange={e => setPreferredCurrency(e.target.value)}>
                      <option value="">Use country default</option>
                      {Array.from(new Map((runtimeConfig?.countries ?? []).map(country => [country.currency_code, country])).values()).map(country => <option key={country.currency_code} value={country.currency_code}>{country.currency_code} · {country.currency_symbol || country.currency_code}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language / locale</Label>
                    <Input value={preferredLocale} maxLength={24} onChange={e => setPreferredLocale(e.target.value)} placeholder="en-US" />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone (IANA)</Label>
                    <Input value={preferredTimezone} maxLength={100} onChange={e => setPreferredTimezone(e.target.value)} placeholder="Africa/Lagos" />
                  </div>
                  <Button variant="outline" onClick={savePreferences} disabled={savingProfile} className="w-full">{savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save region preferences</Button>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled className="opacity-60" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
                </div>
                <Button onClick={saveProfile} disabled={savingProfile} className="w-full">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => { signOut(); navigate('/'); }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function TicketRow({ ticket, type, onCopy }: { ticket: DashboardTicket; type: 'active' | 'pending' | 'expired'; onCopy: (wc: string, email: string) => void }) {
  const currency = typeof ticket.currency === 'string' && /^[A-Z]{3}$/.test(ticket.currency) ? ticket.currency : null;
  const formattedPrice = currency
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(ticket.price || 0))
    : Number(ticket.price || 0).toLocaleString();
  const title = ticket.screening?.title || 'Screening';

  return (
    <Card className={`transition-all ${type === 'expired' ? 'opacity-60' : ''} ${type === 'active' ? 'border-success/30' : type === 'pending' ? 'border-warning/30' : ''}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-14 rounded-lg bg-secondary overflow-hidden shrink-0">
          {ticket.screening?.poster_url && (
            <img src={ticket.screening.poster_url} alt={title} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{title}</p>
          <p className="text-xs text-muted-foreground capitalize">{ticket.location}</p>
          <p className="text-sm font-bold text-primary">{formattedPrice}</p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {type === 'active' && (
            <>
              <Button size="sm" className="rounded-full h-8 text-xs px-3" asChild>
                <Link to={`/watch/${ticket.watch_code}?email=${encodeURIComponent(ticket.email)}`}>
                  <Play className="w-3 h-3 mr-1" /> Watch
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="rounded-full h-8 text-xs px-3" onClick={() => onCopy(ticket.watch_code, ticket.email)}>
                <Copy className="w-3 h-3 mr-1" /> Copy Link
              </Button>
            </>
          )}
          {type === 'pending' && (
            <Badge variant="secondary" className="text-[10px]">
              <Clock className="w-2.5 h-2.5 mr-1" />Pending
            </Badge>
          )}
          {type === 'expired' && (
            <Button size="sm" variant="outline" className="rounded-full h-8 text-xs px-3" asChild>
              <Link to={`/buy/${ticket.screening?.slug || ''}`}>Renew</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}