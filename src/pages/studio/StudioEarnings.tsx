import { useState, useEffect } from 'react';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Ticket, TrendingUp, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function StudioEarnings() {
  usePageTitle('Studio: Earnings');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({ totalRevenue: 0, ticketsSold: 0, screeningCount: 0 });

  useEffect(() => {
    if (!user?.email) return;
    const fetch = async () => {
      // Get approved submissions
      const { data: subs } = await supabase
        .from('filmmaker_submissions')
        .select('content_id')
        .eq('submitter_email', user.email)
        .eq('status', 'approved')
        .not('content_id', 'is', null);

      if (!subs || subs.length === 0) { setLoading(false); return; }

      const contentIds = subs.map(s => s.content_id).filter(Boolean) as string[];

      // Get screenings for those content items
      const { data: scrs } = await supabase
        .from('screenings')
        .select('id')
        .in('content_id', contentIds);

      if (!scrs || scrs.length === 0) { setLoading(false); return; }

      const screeningIds = scrs.map(s => s.id);

      // Get tickets for those screenings
      const { data: tickets } = await supabase
        .from('screening_tickets')
        .select('price')
        .in('screening_id', screeningIds)
        .eq('payment_status', 'completed');

      const totalRevenue = (tickets || []).reduce((sum, t) => sum + Number(t.price), 0);

      setEarnings({
        totalRevenue,
        ticketsSold: tickets?.length || 0,
        screeningCount: scrs.length,
      });
      setLoading(false);
    };
    fetch();
  }, [user?.email]);

  return (
    <StudioLayout title="Earnings" description="Track revenue from your screenings">
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Revenue', value: `₦${earnings.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-success' },
            { label: 'Tickets Sold', value: earnings.ticketsSold, icon: Ticket, color: 'text-primary' },
            { label: 'Active Screenings', value: earnings.screeningCount, icon: TrendingUp, color: 'text-accent' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-6 pb-5">
                <s.icon className={`w-6 h-6 mb-3 ${s.color}`} />
                <p className="text-3xl font-bold mb-1">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </StudioLayout>
  );
}
