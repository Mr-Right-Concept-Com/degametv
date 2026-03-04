import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Film, Search, Loader2, Ticket } from 'lucide-react';

interface ScreeningRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  screening_date: string | null;
  created_at: string;
  poster_url: string | null;
  ticket_count: number;
  revenue: number;
}

export default function ScreeningsPage() {
  const [screenings, setScreenings] = useState<ScreeningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: sData } = await supabase.from('screenings').select('*').order('created_at', { ascending: false });
      const { data: tData } = await supabase.from('screening_tickets').select('screening_id, price, payment_status');

      const ticketMap = new Map<string, { count: number; revenue: number }>();
      (tData || []).forEach(t => {
        const cur = ticketMap.get(t.screening_id) || { count: 0, revenue: 0 };
        if (t.payment_status === 'completed') {
          cur.count++;
          cur.revenue += Number(t.price) || 0;
        }
        ticketMap.set(t.screening_id, cur);
      });

      const rows: ScreeningRow[] = (sData || []).map(s => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        status: s.status,
        screening_date: s.screening_date,
        created_at: s.created_at,
        poster_url: s.poster_url,
        ticket_count: ticketMap.get(s.id)?.count || 0,
        revenue: ticketMap.get(s.id)?.revenue || 0,
      }));

      setScreenings(rows);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = screenings.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => {
    if (s === 'published') return 'bg-green-500/20 text-green-400';
    if (s === 'draft') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <AdminLayout title="Screenings" description={`${screenings.length} screenings`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search screenings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No screenings found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Screening</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tickets Sold</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {s.poster_url ? (
                          <img src={s.poster_url} alt={s.title} className="w-10 h-14 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-14 bg-muted rounded flex items-center justify-center"><Film className="w-4 h-4 text-muted-foreground" /></div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{s.title}</p>
                          <p className="text-xs text-muted-foreground">/{s.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor(s.status)}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.screening_date ? new Date(s.screening_date).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Ticket className="w-3 h-3 text-muted-foreground" />
                        {s.ticket_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">₦{s.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
