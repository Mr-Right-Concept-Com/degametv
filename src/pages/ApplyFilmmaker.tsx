import { MainLayout } from '@/components/layout/MainLayout';
import { KYCVerification } from '@/components/kyc/KYCVerification';
import { TierUpgradeCard } from '@/components/studio/TierUpgradeCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Film, Globe, DollarSign, Users, Loader2, Clock, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function ApplyFilmmaker() {
  const { user, loading } = useAuth();
  usePageTitle('Apply to Premiere Your Film');
  const [checking, setChecking] = useState(true);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [studioStatus, setStudioStatus] = useState<string | null>(null);
  const [canEnterStudio, setCanEnterStudio] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) { setChecking(false); return; }
    const load = async () => {
      const [profile, roles, studio] = await Promise.all([
        supabase.from('profiles').select('kyc_status').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['creator', 'super_admin', 'platform_admin']),
        supabase.from('studio_accounts').select('status').eq('user_id', user.id).maybeSingle(),
      ]);
      if (!active) return;
      const roleSet = new Set((roles.data ?? []).map(row => row.role));
      const admin = roleSet.has('super_admin') || roleSet.has('platform_admin');
      setIdentityVerified(profile.data?.kyc_status === 'verified');
      setStudioStatus(studio.data?.status ?? null);
      setCanEnterStudio(admin || (roleSet.has('creator') && studio.data?.status === 'approved'));
      setChecking(false);
    };
    void load();
    return () => { active = false; };
  }, [user?.id]);

  if (loading || checking) {
    return <MainLayout><div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></MainLayout>;
  }
  if (!user) return <Navigate to="/auth?redirect=/apply-filmmaker" replace />;
  if (canEnterStudio) return <Navigate to="/dashboard" replace />;

  return (
    <MainLayout>
      <div className="relative isolate overflow-hidden border-b border-border bg-[#090909] px-4 py-16 text-center text-white sm:py-20"><div className="absolute inset-0 -z-20 bg-[url(https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&auto=format&fit=crop)] bg-cover bg-center opacity-25"/><div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/85 to-primary/20"/>
        <Badge className="mb-3 border border-white/20 bg-white/10 text-white text-xs">CREATOR APPLICATION</Badge>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Become a DeGameTV Creator</h1>
        <p className="mx-auto max-w-xl text-sm text-white/75">
          Complete identity verification, select your Creator or Business studio tier, and submit your studio for approval. Your viewer account stays the same.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { icon: Globe, label: 'Global reach' },
            { icon: Film, label: 'Virtual premieres' },
            { icon: DollarSign, label: 'Ticket revenue' },
            { icon: Users, label: 'Live audience' },
          ].map(item => (
            <Card key={item.label} className="rounded-[1.4rem] border-border/70 shadow-sm"><CardContent className="p-4 flex flex-col items-center gap-1.5">
              <item.icon className="w-5 h-5 text-primary" />
              <p className="text-xs font-medium">{item.label}</p>
            </CardContent></Card>
          ))}
        </div>

        {studioStatus === 'pending' && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <div><p className="font-semibold text-sm">Studio approval pending</p><p className="text-xs text-muted-foreground">Your identity and studio application are being reviewed. Creator publishing stays locked until the studio is approved.</p></div>
            </CardContent>
          </Card>
        )}
        {studioStatus === 'rejected' && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4"><p className="font-semibold text-sm">Studio application needs changes</p><p className="text-xs text-muted-foreground">Review your application details and resubmit for approval.</p></CardContent>
          </Card>
        )}

        <KYCVerification onVerified={() => setIdentityVerified(true)} />
        {identityVerified ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600"><ShieldCheck className="w-4 h-4" /> Identity verified — continue to studio setup</div>
            <TierUpgradeCard />
          </div>
        ) : (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">Complete identity verification before submitting a Creator or Business studio application. Your private documents are reviewed separately from your public creator profile.</CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
