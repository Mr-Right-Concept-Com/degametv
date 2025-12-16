import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { ModuleCard } from '@/components/admin/ModuleCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant } from '@/hooks/useTenant';
import { MODULE_DEFINITIONS, ModuleId } from '@/types/modules';
import { mockAnalytics } from '@/data/mockData';
import { 
  Users, Building2, DollarSign, Activity, 
  TrendingUp, Eye, Film, Radio, Plus 
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

const revenueData = [
  { name: 'Jan', revenue: 186000, subscribers: 12400 },
  { name: 'Feb', revenue: 205000, subscribers: 13800 },
  { name: 'Mar', revenue: 237000, subscribers: 15200 },
  { name: 'Apr', revenue: 273000, subscribers: 17100 },
  { name: 'May', revenue: 309000, subscribers: 18900 },
  { name: 'Jun', revenue: 284000, subscribers: 18500 },
];

export default function AdminDashboard() {
  const { isSuperAdmin, tenant, isModuleEnabled, enableModule, disableModule } = useTenant();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num}`;
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
          value={formatCurrency(mockAnalytics.totalRevenue)}
          change={23.5}
          changeLabel="vs last month"
          icon={<DollarSign className="h-5 w-5" />}
          variant="primary"
        />
        <StatCard
          title="Active Subscribers"
          value={formatNumber(mockAnalytics.activeSubscribers)}
          change={12.3}
          changeLabel="vs last month"
          icon={<Users className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="Total Views"
          value={formatNumber(mockAnalytics.totalViews)}
          change={8.7}
          changeLabel="vs last month"
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          title="Live Viewers"
          value={formatNumber(mockAnalytics.liveViewers)}
          change={-2.4}
          changeLabel="vs last hour"
          icon={<Activity className="h-5 w-5" />}
          variant="warning"
        />
      </div>

      {/* Super Admin Stats */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Active Tenants"
            value="24"
            change={4}
            changeLabel="this month"
            icon={<Building2 className="h-5 w-5" />}
          />
          <StatCard
            title="Content Items"
            value={formatNumber(mockAnalytics.contentCount)}
            icon={<Film className="h-5 w-5" />}
          />
          <StatCard
            title="Live Streams"
            value="18"
            icon={<Radio className="h-5 w-5" />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Revenue Overview
            </CardTitle>
            <CardDescription>Monthly revenue and subscriber growth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
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
              <Link to="/admin/content/movies">
                <Film className="h-4 w-4 mr-2" />
                Manage Content
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/content/live">
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
