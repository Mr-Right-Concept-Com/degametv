import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, DollarSign, Activity, TrendingUp, Film, Loader2, Ticket, Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalTickets: 0, totalScreenings: 0, completedTickets: 0 });
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [ticketsRes, screeningsRes, recentTicketsRes, submissionsRes] = await Promise.all([
          supabase.from('screening_tickets').select('price, payment_status'),
          supabase.from('screenings').select('id', { count: 'exact', head: true }),
          supabase.from('screening_tickets').select('*, screening:screenings(title)').order('created_at', { ascending: false }).limit(5),
          supabase.from('filmmaker_submissions').select('*').order('created_at', { ascending: false }).limit(5),
        ]);

        const tickets = ticketsRes.data || [];
        const completed = tickets.filter(t => t.payment_status === 'completed');
        const totalRevenue = completed.reduce((sum, t) => sum + (Number(t.price) || 0), 0);

        setMetrics({
          totalRevenue,
          totalTickets: tickets.length,
          totalScreenings: screeningsRes.count || 0,
          completedTickets: completed.length,
        });
        setRecentTickets(recentTicketsRes.data || []);
        setRecentSubmissions(submissionsRes.data || []);
      } catch (err) {
        console.error('Failed to fetch dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const fmt = (n: number) => {
    if (n >= 1000000) return `₦${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `₦${(n / 1000).toFixed(0)}K`;
    return `₦${n.toLocaleString()}`;
  };

  return (
    <AdminLayout title="Dashboard" description="Platform overview & real-time metrics">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Revenue" value={loading ? '...' : fmt(metrics.totalRevenue)} icon={<DollarSign className="h-5 w-5" />} variant="primary" />
        <StatCard title="Tickets Sold" value={loading ? '...' : metrics.completedTickets.toString()} icon={<Ticket className="h-5 w-5" />} variant="success" />
        <StatCard title="Total Screenings" value={loading ? '...' : metrics.totalScreenings.toString()} icon={<Film className="h-5 w-5" />} />
        <StatCard title="Pending Tickets" value={loading ? '...' : (metrics.totalTickets - metrics.completedTickets).toString()} icon={<Activity className="h-5 w-5" />} variant="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Revenue Overview
            </CardTitle>
            <CardDescription>Real-time ticket sales data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 flex items-center justify-center text-muted-foreground">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : metrics.totalRevenue === 0 ? (
                <div className="text-center">
                  <Film className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">No sales data yet</p>
                  <p className="text-sm">Revenue charts will appear once tickets are sold</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">{fmt(metrics.totalRevenue)}</p>
                  <p className="text-sm mt-2">Total revenue from {metrics.completedTickets} ticket(s)</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/screenings"><Film className="h-4 w-4 mr-2" />Manage Screenings</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/sales"><TrendingUp className="h-4 w-4 mr-2" />Sales Analytics</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/users"><Users className="h-4 w-4 mr-2" />User Management</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/filmmaker"><Upload className="h-4 w-4 mr-2" />Filmmaker Submissions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Tickets</CardTitle>
              <CardDescription>Latest ticket purchases</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/sales">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No tickets yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Movie</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTickets.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-medium">{t.screening?.title?.substring(0, 20) || '—'}</TableCell>
                      <TableCell className="text-xs">{t.email}</TableCell>
                      <TableCell className="text-xs">{t.currency === 'NGN' ? '₦' : '$'}{Number(t.price).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={t.payment_status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                          {t.payment_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Submissions</CardTitle>
              <CardDescription>Latest filmmaker submissions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/filmmaker">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No submissions yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Project</TableHead>
                    <TableHead className="text-xs">Filmmaker</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSubmissions.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-medium">{s.project_title}</TableCell>
                      <TableCell className="text-xs">{s.submitter_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{s.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
