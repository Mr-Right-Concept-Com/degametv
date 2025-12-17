import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Users, Eye, Clock, DollarSign,
  Film, Tv, Play, Calendar
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const viewsData = [
  { date: 'Mon', views: 125000, revenue: 12500 },
  { date: 'Tue', views: 142000, revenue: 14200 },
  { date: 'Wed', views: 138000, revenue: 13800 },
  { date: 'Thu', views: 156000, revenue: 15600 },
  { date: 'Fri', views: 178000, revenue: 17800 },
  { date: 'Sat', views: 245000, revenue: 24500 },
  { date: 'Sun', views: 268000, revenue: 26800 },
];

const genreData = [
  { name: 'Action', value: 35, color: 'hsl(var(--primary))' },
  { name: 'Drama', value: 25, color: 'hsl(var(--accent))' },
  { name: 'Comedy', value: 20, color: '#10b981' },
  { name: 'Thriller', value: 12, color: '#f59e0b' },
  { name: 'Other', value: 8, color: '#6b7280' },
];

const topContent = [
  { title: 'The Last Frontier', views: '1.25M', change: '+12%', type: 'movie' },
  { title: 'The Code', views: '4.5M', change: '+28%', type: 'series' },
  { title: 'Echoes of Tomorrow', views: '2.1M', change: '+8%', type: 'movie' },
  { title: 'Dynasty', views: '3.8M', change: '+15%', type: 'series' },
  { title: 'Shadow Empire', views: '1.8M', change: '+5%', type: 'movie' },
];

export default function OTTAnalytics() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">OTT Analytics</h1>
          <p className="text-muted-foreground">Track your streaming content performance</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-3xl font-bold">45.8M</p>
                  <div className="flex items-center gap-1 mt-1 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+23.5%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Eye className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Subscribers</p>
                  <p className="text-3xl font-bold">185K</p>
                  <div className="flex items-center gap-1 mt-1 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+12.8%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/20">
                  <Users className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Watch Time</p>
                  <p className="text-3xl font-bold">2h 34m</p>
                  <div className="flex items-center gap-1 mt-1 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+8.2%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-green-500/20">
                  <Clock className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-3xl font-bold">$2.84M</p>
                  <div className="flex items-center gap-1 mt-1 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+18.4%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/20">
                  <DollarSign className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Views Chart */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader>
              <CardTitle>Weekly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="views">
                <TabsList className="mb-4">
                  <TabsTrigger value="views">Views</TabsTrigger>
                  <TabsTrigger value="revenue">Revenue</TabsTrigger>
                </TabsList>
                <TabsContent value="views">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={viewsData}>
                        <defs>
                          <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="views" 
                          stroke="hsl(var(--primary))" 
                          fill="url(#viewsGradient)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                <TabsContent value="revenue">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={viewsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Genre Distribution */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Genre Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genreData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {genreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {genreData.map((genre) => (
                  <div key={genre.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: genre.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {genre.name} ({genre.value}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Content */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Top Performing Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topContent.map((content, index) => (
                <div 
                  key={content.title}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-3">
                      {content.type === 'movie' ? (
                        <Film className="w-5 h-5 text-purple-400" />
                      ) : (
                        <Tv className="w-5 h-5 text-cyan-400" />
                      )}
                      <div>
                        <p className="font-medium">{content.title}</p>
                        <p className="text-sm text-muted-foreground capitalize">{content.type}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{content.views} views</p>
                    <p className="text-sm text-green-400">{content.change}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
