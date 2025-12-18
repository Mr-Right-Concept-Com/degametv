import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Plus, Search, Download, DollarSign, TrendingUp, Users, CreditCard, Percent, Gift, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';

const mockSubscriptions = [
  { id: '1', customer: 'StreamFlix Inc', email: 'billing@streamflix.com', plan: 'Enterprise', amount: 999, status: 'active', nextBilling: '2024-02-15', mrr: 999 },
  { id: '2', customer: 'MediaCo', email: 'admin@mediaco.com', plan: 'Professional', amount: 299, status: 'active', nextBilling: '2024-02-10', mrr: 299 },
  { id: '3', customer: 'FilmHouse', email: 'finance@filmhouse.tv', plan: 'Starter', amount: 99, status: 'past_due', nextBilling: '2024-01-28', mrr: 99 },
];

const mockRevenueSplits = [
  { id: '1', name: 'Default Split', platform: 20, tenant: 60, creator: 20, isDefault: true },
  { id: '2', name: 'Premium Creator', platform: 15, tenant: 50, creator: 35, isDefault: false },
  { id: '3', name: 'Enterprise', platform: 10, tenant: 70, creator: 20, isDefault: false },
];

const mockCoupons = [
  { id: '1', code: 'LAUNCH50', discount: '50%', type: 'percentage', uses: 234, maxUses: 500, status: 'active', expiresAt: '2024-03-01' },
  { id: '2', code: 'FIRST10', discount: '$10', type: 'fixed', uses: 89, maxUses: 100, status: 'active', expiresAt: '2024-02-15' },
  { id: '3', code: 'TRIAL30', discount: '30 days free', type: 'trial', uses: 456, maxUses: null, status: 'expired', expiresAt: '2024-01-01' },
];

const stats = [
  { label: 'Monthly Revenue', value: '$124,580', change: '+18%', icon: DollarSign },
  { label: 'Active Subscriptions', value: '1,234', change: '+12%', icon: Users },
  { label: 'Avg Revenue/User', value: '$101', change: '+5%', icon: TrendingUp },
  { label: 'Churn Rate', value: '2.3%', change: '-0.5%', icon: Percent },
];

export default function BillingManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <AdminLayout
      title="Monetization & Billing"
      description="Manage subscriptions, revenue splits, and billing automation"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold">{stat.value}</span>
                      <span className={`text-xs ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{stat.change}</span>
                    </div>
                  </div>
                  <stat.icon className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="subscriptions" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="revenue-splits">Revenue Splits</TabsTrigger>
            <TabsTrigger value="coupons">Coupons & Promos</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          {/* Subscriptions */}
          <TabsContent value="subscriptions" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subscriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Plan
                </Button>
              </div>
            </div>

            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Active Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Billing</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockSubscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.customer}</p>
                            <p className="text-xs text-muted-foreground">{sub.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sub.plan}</Badge>
                        </TableCell>
                        <TableCell>${sub.amount}/mo</TableCell>
                        <TableCell>
                          <Badge variant={sub.status === 'active' ? 'default' : 'destructive'}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{sub.nextBilling}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Change Plan</DropdownMenuItem>
                              <DropdownMenuItem>Invoice History</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Cancel</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Splits */}
          <TabsContent value="revenue-splits" className="space-y-4">
            <div className="flex justify-end">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Split Rule
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockRevenueSplits.map((split) => (
                <Card key={split.id} className="bg-card/50 border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{split.name}</CardTitle>
                      {split.isDefault && <Badge>Default</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Platform</span>
                        <span>{split.platform}%</span>
                      </div>
                      <Progress value={split.platform} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Tenant</span>
                        <span>{split.tenant}%</span>
                      </div>
                      <Progress value={split.tenant} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Creator</span>
                        <span>{split.creator}%</span>
                      </div>
                      <Progress value={split.creator} className="h-2" />
                    </div>
                    <Button variant="outline" className="w-full" size="sm">Edit Split</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Coupons */}
          <TabsContent value="coupons" className="space-y-4">
            <div className="flex justify-end">
              <Button>
                <Gift className="h-4 w-4 mr-2" />
                Create Coupon
              </Button>
            </div>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockCoupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                        <TableCell>{coupon.discount}</TableCell>
                        <TableCell>
                          {coupon.uses} / {coupon.maxUses || '∞'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={coupon.status === 'active' ? 'default' : 'secondary'}>
                            {coupon.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{coupon.expiresAt}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts */}
          <TabsContent value="payouts">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Payout management coming soon</p>
                <p className="text-sm mt-2">Configure automatic payouts to tenants and creators</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
