import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    if (authLoading) {
      setChecking(true);
      return () => {
        active = false;
      };
    }

    if (!userId) {
      setIsAdmin(false);
      setChecking(false);
      return () => {
        active = false;
      };
    }

    setChecking(true);
    setIsAdmin(null);

    const checkRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .in('role', ['super_admin', 'platform_admin'])
          .limit(1);

        if (error) throw error;
        if (active) setIsAdmin((data?.length ?? 0) > 0);
      } catch {
        // Authorization checks fail closed when the role query is unavailable.
        if (active) setIsAdmin(false);
      } finally {
        if (active) setChecking(false);
      }
    };

    void checkRole();

    return () => {
      active = false;
    };
  }, [userId, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Checking administrator access">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
