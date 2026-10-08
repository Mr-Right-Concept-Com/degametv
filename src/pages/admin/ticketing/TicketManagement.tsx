import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, Download, Loader2, Mail, RotateCcw, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeFn } from '@/lib/invokeFn';
import { toast } from 'sonner';
import { usePageTitle } from '@/hooks/usePageTitle';

interface TicketRow {
  id: string;
  ticket_code: string;
  watch_code: string;
  email: string;
  location: string;
  price: number;
  currency: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  expires_at: string;
  refunded_at: string | null;
  refund_reason: string | null;
  stream_count: number;
  screening: { title: string; slug: string } | null;
}

export default function TicketManagement() {
  usePageTitle('Tickets — Admin');
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('screening_tickets')
      .select('id, ticket_code, watch_code, email, location, price, currency, payment_status, payment_method, created_at, expires_at, refunded_at, refund_reason, stream_count, screening:screenings(title, slug)')
      .order('created_at', { ascending: false })
      .limit(500);
    setTickets((data as unknown as TicketRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleRefund = async (id: string) => {
    setRefundingId(id);
    const r = await invokeFn('process-refund', { ticketId: id, reason: refundReason || 'Admin refund' });
    if (!r.ok) {
      toast.error(`Refund failed: ${r.error}`);
    } else {
      toast.success('Ticket refunded');
      setRefundReason('');
      fetchTickets();
    }
    setRefundingId(null);
  };

  const exportCSV = () => {
    const headers = ['Ticket', 'Movie', 'Email', 'Location', 'Amount', 'Status', 'Streams', 'Created'];
    const rows = filtered.map(t => [
      t.ticket_code,
      t.screening?.title || '—',
      t.email,
      t.location || '',
      `${t.currency === 'USD' ? '$' : '₦'}${t.price}`,
      t.refunded_at ? 'refunded' : t.payment_status,
      t.stream_count,
      new Date(t.created_at).toISOString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tickets-${Date.now()}.csv`;
    a.click();
  };

  const filtered = tickets.filter(t =>
    !search ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    t.ticket_code.toLowerCase().includes(search.toLowerCase()) ||
    t.screening?.title.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = tickets.filter(t => t.payment_status === 'completed' && !t.refunded_at).reduce((s, t) => s + Number(t.price || 0), 0);
  const refundedCount = tickets.filter(t => t.refunded_at).length;

  const statusBadge = (t: TicketRow) => {
    if (t.refunded_at) return <Badge variant="destructive">Refunded</Badge>;
    if (t.payment_status === 'completed') return <Badge>Valid</Badge>;
    if (t.payment_status === 'pending') return <Badge variant="secondary">Pending</Badge>;
    return <Badge variant="outline">{t.payment_status}</Badge>;
  };

  return (
    <AdminLayout title="Ticketing & Access" description={`${tickets.length} tickets · ₦${totalRevenue.toLocaleString()} net revenue · ${refundedCount} refunded`}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Tickets', value: tickets.length },
            { label: 'Valid', value: tickets.filter(t => t.payment_status === 'completed' && !t.refunded_at).length },
            { label: 'Pending', value: tickets.filter(t => t.payment_status === 'pending').length },
            { label: 'Refunded', value: refundedCount },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent></Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by email, code, or movie..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" onClick={exportCSV} disabled={!tickets.length}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">All Tickets</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No tickets found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Movie</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Streams</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.ticket_code}</TableCell>
                        <TableCell className="text-sm">{t.screening?.title || '—'}</TableCell>
                        <TableCell className="text-sm">
                          <p>{t.email}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{t.currency === 'USD' ? '$' : '₦'}{Number(t.price).toLocaleString()}</TableCell>
                        <TableCell>{statusBadge(t)}</TableCell>
                        <TableCell className="text-sm hidden sm:table-cell">{t.stream_count || 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Resend watch email"
                              onClick={async () => {
                                const watchUrl = `${window.location.origin}/watch/${t.watch_code}?email=${encodeURIComponent(t.email)}`;
                                const r = await invokeFn('send-watch-email', { email: t.email, movieTitle: t.screening?.title, watchUrl, ticketCode: t.ticket_code, expiresAt: t.expires_at, location: t.location, price: t.price, currency: t.currency });
                                if (r.ok) toast.success('Watch link resent'); else toast.error(`Email not sent: ${r.error}`);
                              }}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </Button>
                            {!t.refunded_at && t.payment_status === 'completed' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Refund">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Refund this ticket?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t.email} · {t.currency === 'USD' ? '$' : '₦'}{Number(t.price).toLocaleString()}. Access will be revoked immediately.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="space-y-2">
                                    <Label className="text-xs">Reason (optional)</Label>
                                    <Textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} rows={2} placeholder="Customer request..." />
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRefund(t.id)} disabled={refundingId === t.id}>
                                      {refundingId === t.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                      Refund
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
