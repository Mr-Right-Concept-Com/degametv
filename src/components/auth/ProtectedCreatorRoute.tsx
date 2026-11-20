import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

type CreatorAccess = 'checking' | 'allowed' | 'apply' | 'signin' | 'error';

export function ProtectedCreatorRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [access, setAccess] = useState<CreatorAccess>('checking');

  useEffect(() => {
    let active = true;

    if (authLoading) {
      setAccess('checking');
      return () => {
        active = false;
      };
    }

    if (!userId) {
      setAccess('signin');
      return () => {
        active = false;
      };
    }

    setAccess('checking');

    const verify = async () => {
      try {
        const { data: roles, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .in('role', ['creator', 'super_admin', 'platform_admin']);

        if (roleError) throw roleError;

        const roleSet = new Set((roles ?? []).map((row) => row.role));
        if (roleSet.has('super_admin') || roleSet.has('platform_admin')) {
          if (active) setAccess('allowed');
          return;
        }

        if (!roleSet.has('creator')) {
          if (active) setAccess('apply');
          return;
        }

        // The migration-backed self-status RPC is the authoritative approval check.
        const { data: studioRows, error: studioError } = await supabase.rpc('get_my_studio_account');
        if (studioError) throw studioError;

        const studio = studioRows?.[0] ?? null;
        if (active) setAccess(studio?.status === 'approved' ? 'allowed' : 'apply');
      } catch {
        // Do not grant access when role or studio approval cannot be verified.
        if (active) setAccess('error');
      }
    };

    void verify();

    return () => {
      active = false;
    };
  }, [userId, authLoading]);

  if (authLoading || access === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Checking creator access">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (access === 'signin') return <Navigate to="/auth" replace />;
  if (access === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center" role="alert">
        <p className="max-w-md text-sm text-muted-foreground">
          Creator access could not be verified. Please refresh and try again.
        </p>
      </div>
    );
  }
  if (access !== 'allowed') return <Navigate to="/apply-filmmaker" replace />;

  return <>{children}</>;
}
