import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { ModuleCard } from '@/components/admin/ModuleCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant } from '@/hooks/useTenant';
import { MODULE_DEFINITIONS, ModuleId } from '@/types/modules';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, Building2, DollarSign, Activity, 
  TrendingUp, Eye, Film, Radio, Plus, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardMetrics {
  totalRevenue: number;
  totalTickets: number;
  totalScreenings: number;
  completedTickets: number;
}

export default function AdminDashboard() {
  const { isSuperAdmin, tenant, isModuleEnabled, enableModule, disableModule } = useTenant();
  const [metrics, setMetrics] = useState<DashboardMetrics>({ totalRevenue: 0, totalTickets: 0, totalScreenings: 0, completedTickets: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [ticketsRes, screeningsRes] = await Promise.all([
          supabase.from('screening_tickets').select('price, payment_status'),
          supabase.from('screenings').select('id', { count: 'exact', head: true }),
        ]);

        const tickets = ticketsRes.data || [];
        const completedTickets = tickets.filter(t => t.payment_status === 'completed');
        const totalRevenue = completedTickets.reduce((sum, t) => sum + (Number(t.price) || 0), 0);

        setMetrics({
          totalRevenue,
          totalTickets: tickets.length,
          totalScreenings: screeningsRes.count || 0,
          completedTickets: completedTickets.length,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const formatCurrency = (num: number) => {
    if (num >= 1000000) return `₦${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `₦${(num / 1000).toFixed(0)}K`;
    return `₦${num.toLocaleString()}`;
  };

  const handleModuleToggle = (moduleId: ModuleId, enabled: boolean) => {
    if (enabled) {
      enableModule(moduleId);
    } else {
      disableModule(moduleId);
    }
  };

  return (
    <AdminLayout 
      title="Dashboard" 
      description={isSuperAdmin ? "Global platform overview" : `${tenant?.name} overview`}
      actions={
        <Button className="gradient-primary" asChild>
          <Link to="/admin/tenants/new">
            <Plus className="h-4 w-4 mr-2" />
            New Tenant
          </Link>
        </Button>
      }
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Revenue"
          value={loading ? '...' : formatCurrency(metrics.totalRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          variant="primary"
        />
        <StatCard
          title="Tickets Sold"
          value={loading ? '...' : metrics.completedTickets.toString()}
          icon={<Users className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="Total Screenings"
          value={loading ? '...' : metrics.totalScreenings.toString()}
          icon={<Film className="h-5 w-5" />}
        />
        <StatCard
          title="Pending Tickets"
          value={loading ? '...' : (metrics.totalTickets - metrics.completedTickets).toString()}
          icon={<Activity className="h-5 w-5" />}
          variant="warning"
        />
      </div>

      {/* Super Admin Stats */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Active Tenants"
            value="1"
            icon={<Building2 className="h-5 w-5" />}
          />
          <StatCard
            title="Screenings"
            value={loading ? '...' : metrics.totalScreenings.toString()}
            icon={<Film className="h-5 w-5" />}
          />
          <StatCard
            title="Live Streams"
            value="0"
            icon={<Radio className="h-5 w-5" />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Revenue Overview
            </CardTitle>
            <CardDescription>Real-time ticket sales data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center text-muted-foreground">
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
                  <p className="text-4xl font-bold text-primary">{formatCurrency(metrics.totalRevenue)}</p>
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
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/modules/ott-vod">
                <Film className="h-4 w-4 mr-2" />
                Manage Content
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/modules/live-streaming">
                <Radio className="h-4 w-4 mr-2" />
                Live Events
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/users">
                <Users className="h-4 w-4 mr-2" />
                User Management
              </Link>
            </Button>
            {isSuperAdmin && (
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/admin/tenants">
                  <Building2 className="h-4 w-4 mr-2" />
                  Tenant Management
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modules Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Platform Modules</h2>
            <p className="text-sm text-muted-foreground">Enable or disable modules for your platform</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/admin/modules">View All</Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULE_DEFINITIONS.slice(0, 6).map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              enabled={isModuleEnabled(module.id)}
              onToggle={handleModuleToggle}
            />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
