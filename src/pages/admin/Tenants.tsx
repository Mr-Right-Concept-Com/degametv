import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Ban, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial' | 'pending';
  modules: number;
  users: number;
  revenue: number;
  createdAt: string;
}

const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'StreamFlix',
    slug: 'streamflix',
    domain: 'streamflix.com',
    plan: 'enterprise',
    status: 'active',
    modules: 8,
    users: 45000,
    revenue: 125000,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'FilmHub Africa',
    slug: 'filmhub-africa',
    domain: 'filmhubafrica.com',
    plan: 'professional',
    status: 'active',
    modules: 5,
    users: 12000,
    revenue: 34500,
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    name: 'LiveSports Pro',
    slug: 'livesports-pro',
    plan: 'professional',
    status: 'trial',
    modules: 3,
    users: 850,
    revenue: 0,
    createdAt: '2024-03-10',
  },
  {
    id: '4',
    name: 'Indie Cinema',
    slug: 'indie-cinema',
    domain: 'indiecinema.io',
    plan: 'starter',
    status: 'active',
    modules: 2,
    users: 3200,
    revenue: 8900,
    createdAt: '2024-02-28',
  },
  {
    id: '5',
    name: 'FestivalStream',
    slug: 'festivalstream',
    plan: 'enterprise',
    status: 'suspended',
    modules: 6,
    users: 0,
    revenue: 0,
    createdAt: '2023-12-01',
  },
];

const planColors = {
  starter: 'bg-muted text-muted-foreground',
  professional: 'bg-age-blue/20 text-age-blue',
  enterprise: 'bg-age-gold/20 text-age-gold',
};

const statusColors = {
  active: 'bg-success/20 text-success',
  suspended: 'bg-destructive/20 text-destructive',
  trial: 'bg-warning/20 text-warning',
  pending: 'bg-muted text-muted-foreground',
};

export default function TenantsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tenants] = useState<Tenant[]>(mockTenants);

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (num: number) => {
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <AdminLayout
      title="Tenants"
      description="Manage platform tenants and their configurations"
      actions={
        <Button className="gradient-primary" disabled>
          <Plus className="h-4 w-4 mr-2" />
          New Tenant
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Modules</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tenant.domain || `${tenant.slug}.agemedia.com`}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={planColors[tenant.plan]}>
                    {tenant.plan}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[tenant.status]}>
                    {tenant.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{tenant.modules}</TableCell>
                <TableCell className="text-right">{formatNumber(tenant.users)}</TableCell>
                <TableCell className="text-right">{formatCurrency(tenant.revenue)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Tenant
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {tenant.status === 'active' ? (
                        <DropdownMenuItem className="text-warning">
                          <Ban className="h-4 w-4 mr-2" />
                          Suspend
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="text-success">
                          <Check className="h-4 w-4 mr-2" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
