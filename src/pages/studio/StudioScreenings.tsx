import { useState, useEffect } from 'react';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Loader2, Film } from 'lucide-react';

interface ScreeningRow {
  id: string;
  title: string;
  status: string;
  screening_date: string | null;
  slug: string;
}

export default function StudioScreenings() {
  const { user } = useAuth();
  const [screenings, setScreenings] = useState<ScreeningRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    const fetch = async () => {
      // Get approved submissions for this filmmaker
      const { data: subs } = await supabase
        .from('filmmaker_submissions')
        .select('content_id')
        .eq('submitter_email', user.email)
        .eq('status', 'approved')
        .not('content_id', 'is', null);

      if (!subs || subs.length === 0) { setLoading(false); return; }

      const contentIds = subs.map(s => s.content_id).filter(Boolean) as string[];
      const { data } = await supabase
        .from('screenings')
        .select('id, title, status, screening_date, slug')
        .in('content_id', contentIds)
        .order('screening_date', { ascending: false });

      setScreenings(data || []);
      setLoading(false);
    };
    fetch();
  }, [user?.email]);

  const statusColor: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    published: 'bg-success/15 text-success',
    ended: 'bg-secondary text-muted-foreground',
  };

  return (
    <StudioLayout title="My Screenings" description="Virtual premieres for your approved films">
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : screenings.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold mb-1">No screenings yet</h3>
          <p className="text-sm text-muted-foreground">Once your films are approved, screenings will appear here</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {screenings.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Film className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.screening_date ? new Date(s.screening_date).toLocaleDateString() : 'No date set'}
                    </p>
                  </div>
                </div>
                <Badge className={statusColor[s.status] || statusColor.draft}>{s.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </StudioLayout>
  );
}
