import { useState, useEffect } from 'react';
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
  LogOut, ArrowRight, Calendar, Loader2, Settings, Star, Shield, Award, Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRuntimeConfig } from '@/contexts/RuntimeConfigContext';


const displayNameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name must be under 50 characters');

export default function UserDashboard() {
  const { user, signOut } = useAuth();
  const { config: runtimeConfig, refresh: refreshRuntimeConfig } = useRuntimeConfig();
  const navigate = useNavigate();
  usePageTitle('My Dashboard');
  const [tickets, setTickets] = useState<any[]>([]);
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any[]>([]);
  const [walletBalances, setWalletBalances] = useState<any[]>([]);
  const [supportTransactions, setSupportTransactions] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [preferredCountry, setPreferredCountry] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState('');
  const [preferredLocale, setPreferredLocale] = useState('');
  const [studioAccess, setStudioAccess] = useState<'checking' | 'approved' | 'not-approved'>('checking');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchAll();
    checkStudioAccess();
  }, [user]);

  const checkStudioAccess = async () => {
    if (!user) return;
    try {
      const { data: roles, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['creator', 'super_admin', 'platform_admin']);
      if (roleError) throw roleError;
      const roleSet = new Set((roles ?? []).map((row: any) => row.role));
      if (roleSet.has('super_admin') || roleSet.has('platform_admin')) { setStudioAccess('approved'); return; }
      if (roleSet.has('creator')) {
        const { data, error } = await supabase.rpc('get_my_studio_account');
        if (error) throw error;
        const account = data?.[0] ?? null;
        setStudioAccess(account?.status === 'approved' ? 'approved' : 'not-approved');
        return;
      }
      const { data: member, error: memberError } = await supabase.rpc('is_studio_member' as never, { _user_id: user.id } as never);
      if (memberError) throw memberError;
      setStudioAccess(member === true ? 'approved' : 'not-approved');
    } catch {
      setStudioAccess('not-approved');
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    const [ticketsRes, historyRes, profileRes, loyaltyRes] = await Promise.all([
      supabase.from('screening_tickets')
        .select('*, screening:screenings(*)')
        .or(`user_id.eq.${user!.id},email.eq.${user!.email}`)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('watch_history')
        .select('*, content(*)')
        .eq('user_id', user!.id)
        .order('last_watched_at', { ascending: false })
        .limit(10),
      supabase.from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single(),
      supabase.from('loyalty_points')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    if (ticketsRes.data) setTickets(ticketsRes.data);
    if (historyRes.data) setWatchHistory(historyRes.data);
    if (loyaltyRes.data) setLoyalty(loyaltyRes.data);
    const { data: walletData, error: walletError } = await (supabase as any).rpc('wallet_balance_by_currency', { _user_id: user!.id });
    if (!walletError && Array.isArray(walletData)) setWalletBalances(walletData);
    const { data: supportData, error: supportError } = await (supabase as any).rpc('get_my_support_transactions');
    if (!supportError && Array.isArray(supportData)) setSupportTransactions(supportData);
    const { data: inviteData } = await supabase.functions.invoke("manage-event-invites", { body: { action: "my_invitations" } });
    if (inviteData?.invitations) setInvitations(inviteData.invitations);
    if (profileRes.data) {
      setProfile(profileRes.data);
      setDisplayName(profileRes.data.display_name || profileRes.data.full_name || '');
      setPreferredCountry(profileRes.data.preferred_country || runtimeConfig?.geo.countryCode || '');
      setPreferredCurrency(profileRes.data.preferred_currency || '');
      setPreferredLocale(profileRes.data.locale_code || runtimeConfig?.locale || '');
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    const result = displayNameSchema.safeParse(displayName);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase.from('profiles')
      .update({ display_name: result.data, updated_at: new Date().toISOString() })
      .eq('user_id', user!.id);
    if (error) toast.error('Failed to save');
    else toast.success('Profile updated!');
    setSavingProfile(false);
  };

  const savePreferences = async () => {
    if (!user?.id) return;
    if (preferredCountry && !/^[A-Z]{2}$/.test(preferredCountry)) { toast.error('Choose a valid country.'); return; }
    if (preferredCurrency && !/^[A-Z]{3}$/.test(preferredCurrency)) { toast.error('Choose a valid currency.'); return; }
    if (preferredLocale.trim().length > 24 || (preferredLocale.trim() && !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(preferredLocale.trim()))) { toast.error('Enter a valid language tag, such as en-US or fr-CA.'); return; }
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update({
      preferred_country: preferredCountry || null,
      preferred_currency: preferredCurrency || null,
      locale_code: preferredLocale.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Language, location and currency preferences saved.');
      setProfile((current: any) => ({ ...current, preferred_country: preferredCountry || null, preferred_currency: preferredCurrency || null, locale_code: preferredLocale.trim() || null }));
      await refreshRuntimeConfig();
    }
    setSavingProfile(false);
  };

  const now = new Date();
  const activeTickets = tickets.filter(t => t.payment_status === 'completed' && new Date(t.expires_at) > now);
  const pendingTickets = tickets.filter(t => t.payment_status === 'pending');
  const expiredTickets = tickets.filter(t => t.payment_status === 'completed' && new Date(t.expires_at) <= now);

  const copyWatchLink = (watchCode: string, email: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/watch/${watchCode}?email=${encodeURIComponent(email)}`);
    toast.success('Watch link copied!');
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
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4"/> Wallet &amp; creator earnings</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Your earnings are shown by their original transaction currency. Pending settlement is not withdrawable; only verified settled funds appear as available.</p>
                {walletBalances.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center"><Wallet className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40"/><p className="font-medium">No creator earnings yet</p><p className="mt-1 text-xs text-muted-foreground">When you earn from ticket sales, tips or gifts as an approved creator, your balances will appear here.</p></div> : walletBalances.map((balance:any) => <div key={balance.currency} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Currency</p><p className="text-lg font-bold">{balance.currency}</p></div><div><p className="text-xs text-muted-foreground">Pending settlement</p><p className="text-lg font-semibold">{Number(balance.escrow || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p></div><div><p className="text-xs text-muted-foreground">Available to withdraw</p><p className="text-lg font-semibold text-primary">{Number(balance.withdrawable || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p></div></div>)}
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Creator earnings are tracked separately from personal stored-value funds. This history includes your sent and received tips and gifts; it does not imply that a personal cash wallet or top-up balance is enabled.</div>
                <div className="space-y-3"><h3 className="font-semibold">Tips &amp; gifts activity</h3>{supportTransactions.length===0?<p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No tips or gifts yet.</p>:<div className="space-y-2">{supportTransactions.map((tx:any)=><div key={tx.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><p className="text-sm font-medium">{tx.direction==='received'?'Received':'Sent'} {tx.contribution_type} · {tx.target_title}</p><p className="text-xs text-muted-foreground">{tx.display_name} · {new Date(tx.created_at).toLocaleString()}</p>{tx.message&&<p className="mt-1 text-xs text-muted-foreground">{tx.message}</p>}</div><div className="text-right"><p className="font-semibold">{Number(tx.amount_major||0).toLocaleString(undefined,{maximumFractionDigits:2})} {tx.currency}</p><Badge variant={tx.status==='paid'?'default':'secondary'}>{tx.status}</Badge></div></div>)}</div>}</div>
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
                  <div><p className="font-medium text-sm">Region, language & currency</p><p className="text-xs text-muted-foreground">Location is suggested automatically. You can override display preferences at any time. Ticket and payment amounts remain in their original transaction currency.</p></div>
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

function TicketRow({ ticket, type, onCopy }: { ticket: any; type: string; onCopy: (wc: string, email: string) => void }) {
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
