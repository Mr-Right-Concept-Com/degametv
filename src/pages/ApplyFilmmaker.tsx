import { MainLayout } from '@/components/layout/MainLayout';
import { KYCVerification } from '@/components/kyc/KYCVerification';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Film, Globe, DollarSign, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function ApplyFilmmaker() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  usePageTitle('Apply to Premiere Your Film');
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'creator').maybeSingle()
      .then(({ data }) => { setIsCreator(!!data); setChecking(false); });
  }, [user?.id]);

  if (loading || checking) {
    return <MainLayout><div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></MainLayout>;
  }
  if (!user) return <Navigate to="/auth?redirect=/apply-filmmaker" replace />;
  if (isCreator) return <Navigate to="/studio" replace />;

  return (
    <MainLayout>
      <div className="bg-primary text-primary-foreground py-12 px-4 text-center">
        <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-3 text-xs">FILMMAKER APPLICATION</Badge>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Apply to Premiere on DeGameTV</h1>
        <p className="text-primary-foreground max-w-xl mx-auto text-sm">
          Once approved, your studio dashboard unlocks — schedule premieres, sell tickets, and earn revenue. Your filmmaker profile sits inside your existing account.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { icon: Globe, label: 'Global reach' },
            { icon: Film, label: 'Virtual premieres' },
            { icon: DollarSign, label: 'Ticket revenue' },
            { icon: Users, label: 'Live audience' },
          ].map(b => (
            <Card key={b.label}><CardContent className="p-3 flex flex-col items-center gap-1.5">
              <b.icon className="w-5 h-5 text-primary" />
              <p className="text-xs font-medium">{b.label}</p>
            </CardContent></Card>
          ))}
        </div>

        <KYCVerification />

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            Continue as viewer
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
