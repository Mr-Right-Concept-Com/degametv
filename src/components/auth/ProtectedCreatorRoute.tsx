import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export function ProtectedCreatorRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsCreator(false); setChecking(false); return; }
    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['creator', 'super_admin', 'platform_admin'])
        .maybeSingle();
      let ok = !!data;
      if (!ok) {
        // Business team seats: claim pending invites, then check membership
        await supabase.rpc('accept_studio_invites' as any).then(() => {}, () => {});
        const { data: member } = await supabase.rpc('is_studio_member' as any, { _user_id: user.id });
        ok = !!member;
      }
      setIsCreator(ok);
      setChecking(false);
    })();
  }, [user, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isCreator) return <Navigate to="/apply-filmmaker" replace />;
  return <>{children}</>;
}
