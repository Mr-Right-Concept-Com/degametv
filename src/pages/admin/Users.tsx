import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Plus, Search, MoreHorizontal, Edit, Trash2, Shield, Ban, Mail } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'super_admin' | 'platform_admin' | 'licensee_admin' | 'creator' | 'moderator' | 'viewer';
  status: 'active' | 'suspended' | 'pending';
  tenant?: string;
  lastActive: string;
  createdAt: string;
}

const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@agemedia.com',
    name: 'System Admin',
    role: 'super_admin',
    status: 'active',
    lastActive: '2024-03-15T14:30:00Z',
    createdAt: '2023-01-01',
  },
  {
    id: '2',
    email: 'john@streamflix.com',
    name: 'John Smith',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    role: 'licensee_admin',
    status: 'active',
    tenant: 'StreamFlix',
    lastActive: '2024-03-15T12:00:00Z',
    createdAt: '2024-01-15',
  },
  {
    id: '3',
    email: 'sarah@filmhub.com',
    name: 'Sarah Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    role: 'creator',
    status: 'active',
    tenant: 'FilmHub Africa',
    lastActive: '2024-03-14T18:45:00Z',
    createdAt: '2024-02-20',
  },
  {
    id: '4',
    email: 'mike@example.com',
    name: 'Mike Wilson',
    role: 'viewer',
    status: 'suspended',
    lastActive: '2024-03-10T09:15:00Z',
    createdAt: '2024-03-01',
  },
  {
    id: '5',
    email: 'emma@livesports.com',
    name: 'Emma Davis',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    role: 'moderator',
    status: 'active',
    tenant: 'LiveSports Pro',
    lastActive: '2024-03-15T10:30:00Z',
    createdAt: '2024-03-05',
  },
];

const roleColors: Record<User['role'], string> = {
  super_admin: 'bg-age-gold/20 text-age-gold',
  platform_admin: 'bg-age-violet/20 text-age-violet',
  licensee_admin: 'bg-age-blue/20 text-age-blue',
  creator: 'bg-age-pink/20 text-age-pink',
  moderator: 'bg-age-cyan/20 text-age-cyan',
  viewer: 'bg-muted text-muted-foreground',
};

const roleLabels: Record<User['role'], string> = {
  super_admin: 'Super Admin',
  platform_admin: 'Platform Admin',
  licensee_admin: 'Tenant Admin',
  creator: 'Creator',
  moderator: 'Moderator',
  viewer: 'Viewer',
};

const statusColors = {
  active: 'bg-success/20 text-success',
  suspended: 'bg-destructive/20 text-destructive',
  pending: 'bg-warning/20 text-warning',
};

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users] = useState<User[]>(mockUsers);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout
      title="Users"
      description="Manage platform users and their roles"
      actions={
        <Button className="gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
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
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={roleColors[user.role]}>
                    {roleLabels[user.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">
                    {user.tenant || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[user.status]}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(user.lastActive)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Shield className="h-4 w-4 mr-2" />
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user.status === 'active' ? (
                        <DropdownMenuItem className="text-warning">
                          <Ban className="h-4 w-4 mr-2" />
                          Suspend
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="text-success">
                          <Shield className="h-4 w-4 mr-2" />
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
