import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, Users as UsersIcon } from 'lucide-react';

interface UserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: string | null;
}

const roleColors: Record<string, string> = {
  super_admin: 'bg-amber-500/20 text-amber-400',
  platform_admin: 'bg-violet-500/20 text-violet-400',
  licensee_admin: 'bg-blue-500/20 text-blue-400',
  creator: 'bg-pink-500/20 text-pink-400',
  moderator: 'bg-cyan-500/20 text-cyan-400',
  viewer: 'bg-muted text-muted-foreground',
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  platform_admin: 'Platform Admin',
  licensee_admin: 'Tenant Admin',
  creator: 'Creator',
  moderator: 'Moderator',
  viewer: 'Viewer',
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, avatar_url, created_at')
        .order('created_at', { ascending: false });

      if (pErr) {
        console.error('Failed to fetch profiles:', pErr);
        setLoading(false);
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap = new Map<string, string>();
      (roles || []).forEach(r => roleMap.set(r.user_id, r.role));

      const merged: UserRow[] = (profiles || []).map(p => ({
        ...p,
        role: roleMap.get(p.user_id) || 'viewer',
      }));

      setUsers(merged);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    !searchQuery ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Users" description={`${users.length} registered users`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{u.full_name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[u.role || 'viewer'] || roleColors.viewer}>
                      {roleLabels[u.role || 'viewer'] || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminLayout>
  );
}
