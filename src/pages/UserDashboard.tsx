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
  Ticket, Play, Clock, CheckCircle, Copy, Film, User,
  LogOut, ArrowRight, Calendar, Loader2, Settings, Star, Shield, Award, Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';
import { usePageTitle } from '@/hooks/usePageTitle';


const displayNameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name must be under 50 characters');

export default function UserDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  usePageTitle('My Dashboard');
  const [tickets, setTickets] = useState<any[]>([]);
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
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
        const account = Array.isArray(data) ? data[0] : data;
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
    if (profileRes.data) {
      setProfile(profileRes.data);
      setDisplayName(profileRes.data.display_name || profileRes.data.full_name || '');
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

        {/* Studio access is surfaced here only after approval. */}
        {studioAccess === 'approved' ? (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-semibold">Your Creator Studio is ready</p><p className="text-xs text-muted-foreground">Manage your catalogue, publish content and host ticketed live events.</p></div>
            <Button asChild className="rounded-full"><Link to="/studio"><Film className="mr-2 h-4 w-4"/>Open Studio Portal</Link></Button>
          </div>
        ) : (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-semibold">Become a DeGameTV creator</p><p className="text-xs text-muted-foreground">Apply for Creator or Business access to premiere films and host ticketed live events.</p></div>
            <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/apply-filmmaker">Apply for Studio access</Link></Button>
          </div>
        )}

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

        <Tabs defaultValue="tickets" className="space-y-4">
          <TabsList className="bg-secondary/50 w-full sm:w-auto">
            <TabsTrigger value="tickets">
              <Ticket className="w-4 h-4 mr-1.5" />
              Tickets
            </TabsTrigger>
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
  const symbol = ticket.currency === 'NGN' ? '₦' : '$';
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
          <p className="text-sm font-bold text-primary">{symbol}{Number(ticket.price).toLocaleString()}</p>
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
