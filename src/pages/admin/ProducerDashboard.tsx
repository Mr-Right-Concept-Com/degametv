import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import {
  DollarSign, Users, Ticket, TrendingUp, MapPin, CreditCard,
  Film, BarChart3, RefreshCw, Trash2, Database, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { toast } from 'sonner';

export default function ProducerDashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [screenings, setScreenings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [ticketsRes, screeningsRes] = await Promise.all([
      supabase.from('screening_tickets').select('*, screening:screenings(title, slug)').order('created_at', { ascending: false }),
      supabase.from('screenings').select('*').order('screening_date', { ascending: true }),
    ]);
    setTickets(ticketsRes.data || []);
    setScreenings(screeningsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const seedData = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-data', { body: { action: 'seed' } });
      if (error) throw error;
      toast.success(data?.message || 'Sample data seeded!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed data');
    }
    setSeeding(false);
  };

  const deleteAllData = async () => {
    if (!confirm('Are you sure? This will delete ALL screenings, tickets, and content. This is for pre-launch cleanup.')) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-data', { body: { action: 'delete-all' } });
      if (error) throw error;
      toast.success(data?.message || 'All data deleted!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete data');
    }
    setDeleting(false);
  };

  // Analytics
  const totalRevenue = tickets.filter(t => t.payment_status === 'completed').reduce((s, t) => s + Number(t.price), 0);
  const totalTickets = tickets.filter(t => t.payment_status === 'completed').length;
  const nigeriaTickets = tickets.filter(t => t.location === 'nigeria' && t.payment_status === 'completed');
  const intlTickets = tickets.filter(t => t.location === 'international' && t.payment_status === 'completed');
  const nigeriaRevenue = nigeriaTickets.reduce((s, t) => s + Number(t.price), 0);
  const intlRevenue = intlTickets.reduce((s, t) => s + Number(t.price), 0);

  const locationData = [
    { name: 'Nigeria', value: nigeriaTickets.length, revenue: nigeriaRevenue },
    { name: 'International', value: intlTickets.length, revenue: intlRevenue },
  ];

  const paymentMethodData = ['stripe', 'paystack', 'flutterwave', 'bank_transfer'].map(m => ({
    name: m.charAt(0).toUpperCase() + m.slice(1).replace('_', ' '),
    count: tickets.filter(t => t.payment_method === m && t.payment_status === 'completed').length,
  })).filter(d => d.count > 0);

  const screeningStats = screenings.map(s => {
    const sTickets = tickets.filter(t => t.screening_id === s.id && t.payment_status === 'completed');
    return {
      name: s.title?.substring(0, 20) || 'Unknown',
      tickets: sTickets.length,
      revenue: sTickets.reduce((sum: number, t: any) => sum + Number(t.price), 0),
    };
  });

  const COLORS = ['hsl(350, 85%, 55%)', 'hsl(43, 90%, 55%)', 'hsl(152, 69%, 40%)', 'hsl(220, 14%, 55%)'];

  return (
    <AdminLayout title="Sales & Analytics" description="Producer dashboard — ticket sales, revenue, and audience insights">
      {/* Admin Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={seedData} disabled={seeding} variant="outline" size="sm" className="gap-2">
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Seed Sample Data
        </Button>
        <Button onClick={deleteAllData} disabled={deleting} variant="destructive" size="sm" className="gap-2">
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete All Data (Pre-Launch)
        </Button>
        <Button onClick={fetchData} variant="ghost" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: `₦${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-primary' },
          { label: 'Tickets Sold', value: totalTickets.toString(), icon: Ticket, color: 'text-success' },
          { label: 'Screenings', value: screenings.length.toString(), icon: Film, color: 'text-accent' },
          { label: 'Avg/Ticket', value: totalTickets ? `₦${Math.round(totalRevenue / totalTickets).toLocaleString()}` : '₦0', icon: TrendingUp, color: 'text-warning' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-xl sm:text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue by Screening */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Revenue by Screening</CardTitle>
          </CardHeader>
          <CardContent>
            {screeningStats.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={screeningStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No sales data yet. Seed sample data to get started.</p>
            )}
          </CardContent>
        </Card>

        {/* Location Split */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> Audience by Location</CardTitle>
          </CardHeader>
          <CardContent>
            {locationData.some(d => d.value > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={locationData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {locationData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                No audience data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Ticket Sales</CardTitle>
          <CardDescription className="text-xs">{tickets.length} total tickets</CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Movie</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Location</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Method</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.slice(0, 20).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-medium">{t.screening?.title?.substring(0, 25) || '—'}</TableCell>
                      <TableCell className="text-xs">{t.email}</TableCell>
                      <TableCell className="text-xs capitalize">{t.location}</TableCell>
                      <TableCell className="text-xs font-medium">{t.currency === 'NGN' ? '₦' : '$'}{Number(t.price).toLocaleString()}</TableCell>
                      <TableCell className="text-xs capitalize">{t.payment_method?.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Badge variant={t.payment_status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                          {t.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No tickets sold yet.</p>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
