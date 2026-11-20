import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, DollarSign, Radio, Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type StreamRow = Pick<Tables<'live_streams'>, 'id' | 'title' | 'description' | 'thumbnail_url' | 'banner_url' | 'status' | 'viewer_count' | 'is_ticketed' | 'ticket_price' | 'currency' | 'scheduled_start' | 'recording_enabled' | 'chat_enabled'>;
type StreamTicketRow = Pick<Tables<'tickets'>, 'stream_id' | 'price' | 'currency'>;

const statusClass = (status: string) => {
  switch (status) {
    case 'live': return 'border-red-500/30 bg-red-500/10 text-red-500';
    case 'scheduled': return 'border-blue-500/30 bg-blue-500/10 text-blue-500';
    case 'ended': return 'border-muted bg-muted text-muted-foreground';
    case 'cancelled': return 'border-muted bg-muted text-muted-foreground';
    default: return 'border-border bg-background text-muted-foreground';
  }
};

export default function StreamManagement() {
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [ticketRows, setTicketRows] = useState<StreamTicketRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const [streamsResult, ticketsResult] = await Promise.all([
        supabase.from('live_streams').select('id,title,description,thumbnail_url,banner_url,status,viewer_count,is_ticketed,ticket_price,currency,scheduled_start,recording_enabled,chat_enabled').order('created_at', { ascending: false }).limit(500),
        supabase.from('tickets').select('stream_id,price,currency').not('stream_id', 'is', null).is('revoked_at', null).limit(5000),
      ]);
      if (!active) return;
      if (streamsResult.error || ticketsResult.error) {
        setLoadError('Live stream data could not be loaded with the current admin permissions.');
      } else {
        setStreams(streamsResult.data ?? []);
        setTicketRows(ticketsResult.data ?? []);
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  const filteredStreams = useMemo(() => streams.filter(stream => stream.title.toLowerCase().includes(searchQuery.toLowerCase())), [streams, searchQuery]);
  const liveCount = streams.filter(stream => stream.status === 'live').length;
  const scheduledCount = streams.filter(stream => stream.status === 'scheduled').length;
  const viewerCount = streams.filter(stream => stream.status === 'live').reduce((total, stream) => total + (stream.viewer_count ?? 0), 0);
  const revenueByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const ticket of ticketRows) {
      if (!ticket.currency || ticket.stream_id === null) continue;
      totals.set(ticket.currency, (totals.get(ticket.currency) ?? 0) + Number(ticket.price));
    }
    return [...totals.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [ticketRows]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-3xl font-display font-bold">Live Streams</h1><p className="text-muted-foreground">Live stream records and paid ticket entitlements from the platform database.</p></div>
          <Button asChild className="gap-2"><Link to="/studio/live"><Radio className="h-4 w-4" /> Open Creator Live Studio</Link></Button>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Radio className="h-5 w-5 text-red-500"/><div><p className="text-2xl font-bold">{loading ? '—' : liveCount.toLocaleString()}</p><p className="text-sm text-muted-foreground">Live now</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary"/><div><p className="text-2xl font-bold">{loading ? '—' : viewerCount.toLocaleString()}</p><p className="text-sm text-muted-foreground">Current viewers</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-primary"/><div><p className="text-2xl font-bold">{loading ? '—' : scheduledCount.toLocaleString()}</p><p className="text-sm text-muted-foreground">Scheduled</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-green-500"/><div><p className="text-2xl font-bold">{loading ? '—' : ticketRows.length.toLocaleString()}</p><p className="text-sm text-muted-foreground">Valid stream tickets</p><p className="mt-1 text-xs text-muted-foreground">{revenueByCurrency.length ? revenueByCurrency.map(([currency, amount]) => `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`).join(' · ') : 'No paid stream tickets recorded'}</p></div></div></CardContent></Card>
        </div>
        <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input placeholder="Search streams..." value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="pl-10"/></div>
        {loadError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{loadError}</div>}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table><TableHeader><TableRow><TableHead>Stream</TableHead><TableHead>Status</TableHead><TableHead>Viewers</TableHead><TableHead>Monetization</TableHead><TableHead>Scheduled</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Loading live streams…</TableCell></TableRow>
                : filteredStreams.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{loadError ? 'Stream records are unavailable.' : 'No live streams match this search.'}</TableCell></TableRow>
                : filteredStreams.map(stream => <TableRow key={stream.id}>
                  <TableCell><div className="flex items-center gap-3">{(stream.thumbnail_url || stream.banner_url) && <img src={stream.thumbnail_url || stream.banner_url || ''} alt="" className="h-12 w-20 rounded-lg object-cover"/>}<div><p className="font-medium">{stream.title}</p><p className="line-clamp-1 text-sm text-muted-foreground">{stream.description || '—'}</p><p className="mt-1 text-xs text-muted-foreground">{stream.chat_enabled ? 'Chat enabled' : 'Chat disabled'} · {stream.recording_enabled ? 'Recording enabled' : 'Recording disabled'}</p></div></div></TableCell>
                  <TableCell><Badge variant="outline" className={statusClass(stream.status)}>{stream.status}</Badge></TableCell>
                  <TableCell>{(stream.viewer_count ?? 0).toLocaleString()}</TableCell>
                  <TableCell>{stream.is_ticketed ? `${Number(stream.ticket_price ?? 0).toLocaleString()} ${stream.currency ?? ''}` : 'Free'}</TableCell>
                  <TableCell>{stream.scheduled_start ? new Date(stream.scheduled_start).toLocaleString() : '—'}</TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
