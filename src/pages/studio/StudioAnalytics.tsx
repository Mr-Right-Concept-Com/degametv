import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Globe, Clock, Eye, DollarSign, ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { LucideIcon } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Stat = { label: string; value: string; icon: LucideIcon; sub?: string };
type Screening = Pick<Tables<'screenings'>, 'title'>;
type Ticket = Tables<'screening_tickets'>;
type WatchHistory = Tables<'watch_history'>;

export default function StudioAnalytics() {
  const { screeningId } = useParams<{ screeningId: string }>();
  const [loading, setLoading] = useState(true);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [history, setHistory] = useState<WatchHistory[]>([]);
  usePageTitle(screening?.title ? `Analytics — ${screening.title}` : 'Screening Analytics');

  useEffect(() => {
    const load = async () => {
      if (!screeningId) return;
      const [{ data: s }, { data: t }, { data: h }] = await Promise.all([
        supabase.from('screenings').select('*').eq('id', screeningId).maybeSingle(),
        supabase.from('screening_tickets').select('*').eq('screening_id', screeningId),
        supabase.from('watch_history').select('*').eq('screening_id', screeningId),
      ]);
      setScreening(s);
      setTickets(t || []);
      setHistory(h || []);
      setLoading(false);
    };
    load();
  }, [screeningId]);

  if (loading) {
    return (
      <StudioLayout>
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </StudioLayout>
    );
  }

  const completed = tickets.filter(t => t.payment_status === 'completed');
  const revenue = completed.reduce<Record<string, number>>((totals, ticket) => {
    const currency = typeof ticket.currency === 'string' && /^[A-Z]{3}$/.test(ticket.currency) ? ticket.currency : null;
    if (currency) totals[currency] = (totals[currency] || 0) + (Number(ticket.price) || 0);
    return totals;
  }, {});
  const formatMoney = (amount: number, currency: string) => {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
    catch { return currency + ' ' + amount.toLocaleString(); }
  };
  const revenueDisplay = Object.entries(revenue).sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => formatMoney(amount, currency)).join(' · ') || '—';
  const totalSeconds = history.reduce((s, h) => s + (Number(h.watch_duration_seconds) || 0), 0);
  const avgSeconds = history.length ? Math.round(totalSeconds / history.length) : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  // Top cities (use country as city proxy if city missing)
  const countryCounts = history.reduce<Record<string, number>>((acc, h) => {
    const k = h.country || 'Unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const topCountries = Object.entries(countryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const stats: Stat[] = [
    { label: 'Tickets Sold', value: completed.length.toString(), icon: Users },
    { label: 'Revenue', value: revenueDisplay, icon: DollarSign },
    { label: 'Unique Viewers', value: new Set(history.map(row => row.user_id || row.session_id).filter(Boolean)).size.toString(), icon: Eye },
    { label: 'Avg Watch Time', value: fmt(avgSeconds), icon: Clock, sub: `${Math.round(totalSeconds / 60)} total mins` },
  ];

  return (
    <StudioLayout>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link to="/studio/screenings"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Screenings</Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{screening?.title || 'Screening'}</h1>
          <p className="text-sm text-muted-foreground">Performance insights & viewer engagement</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                {s.sub && <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCountries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No viewer data yet — analytics populate as fans start streaming.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCountries}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {completed.slice(0, 20).map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.email}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()} · {t.last_country || t.location || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{t.currency && /^[A-Z]{3}$/.test(t.currency) ? formatMoney(Number(t.price) || 0, t.currency) : (Number(t.price) || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{t.stream_count || 0} streams</p>
                  </div>
                </div>
              ))}
              {completed.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No ticket sales yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </StudioLayout>
  );
}