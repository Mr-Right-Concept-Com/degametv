import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export function ProtectedCreatorRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [access, setAccess] = useState<'checking' | 'allowed' | 'apply' | 'signin'>('checking');

  useEffect(() => {
    let active = true;
    if (authLoading) return;
    if (!user) {
      setAccess('signin');
      return;
    }

    const verify = async () => {
      try {
        const { data: roles, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['creator', 'super_admin', 'platform_admin']);

        if (roleError) throw roleError;
        const roleSet = new Set((roles ?? []).map(row => row.role));
        if (roleSet.has('super_admin') || roleSet.has('platform_admin')) {
          if (active) setAccess('allowed');
          return;
        }

        if (roleSet.has('creator')) {
          const { data: studioRows, error: studioError } = await supabase.rpc('get_my_studio_account' as never);
          const studio = Array.isArray(studioRows) ? studioRows[0] : studioRows;
          if (studioError) throw studioError;
          if (active) setAccess(studio?.status === 'approved' ? 'allowed' : 'apply');
          return;
        }

        // Business team seats: claim pending invites, then check active membership.
        await supabase.rpc('accept_studio_invites' as never).then(() => undefined, () => undefined);
        const { data: member, error: memberError } = await supabase.rpc('is_studio_member' as never, { _user_id: user.id } as never);
        if (memberError) throw memberError;
        if (active) setAccess(member === true ? 'allowed' : 'apply');
      } catch {
        if (active) setAccess('apply');
      }
    };

    void verify();
    return () => { active = false; };
  }, [user, authLoading]);

  if (authLoading || access === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (access === 'signin') return <Navigate to="/auth" replace />;
  if (access !== 'allowed') return <Navigate to="/apply-filmmaker" replace />;
  return <>{children}</>;
}
