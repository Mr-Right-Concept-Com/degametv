import { useState, useEffect } from 'react';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Loader2, Film, BarChart3 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { EventLifecycleControls } from '@/components/studio/EventLifecycleControls';
import { EventInvitations } from '@/components/studio/EventInvitations';

interface ScreeningRow {
  id: string;
  title: string;
  status: string;
  screening_date: string | null;
  slug: string;
  lifecycle: string;
  event_visibility: 'public' | 'unlisted' | 'private' | 'invite_only';
  invite_only: boolean;
  sales_open_at: string | null;
  sales_close_at: string | null;
  early_bird_ends_at: string | null;
  early_bird_capacity: number | null;
  presale_enabled: boolean;
}

export default function StudioScreenings() {
  usePageTitle('Studio: Screenings');
  const { user } = useAuth();
  const [screenings, setScreenings] = useState<ScreeningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      const { data: owned } = await supabase.from('content').select('id').eq('creator_id', user.id);
      const contentIds = (owned || []).map(c => c.id);
      if (contentIds.length === 0) { setLoading(false); return; }
      const { data } = await supabase
        .from('screenings')
        .select('id, title, status, screening_date, slug, lifecycle, event_visibility, invite_only, sales_open_at, sales_close_at, early_bird_ends_at, early_bird_capacity, presale_enabled')
        .in('content_id', contentIds)
        .order('screening_date', { ascending: false });

      setScreenings((data as ScreeningRow[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user?.id, reload]);

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
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Film className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.screening_date ? new Date(s.screening_date).toLocaleString() : 'No date set'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sales: {s.presale_enabled ? (s.sales_open_at ? new Date(s.sales_open_at).toLocaleString() : 'Open now') : 'Closed'}
                      {s.sales_close_at ? ` · closes ${new Date(s.sales_close_at).toLocaleString()}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <Badge className={statusColor[s.status] || statusColor.draft}>{s.status}</Badge>
                  <Badge variant="outline" className="capitalize">{s.lifecycle}</Badge>
                  <Badge variant={s.event_visibility === 'private' || s.invite_only ? 'destructive' : 'secondary'} className="capitalize">
                    {s.invite_only ? 'Invite only' : s.event_visibility}
                  </Badge>
                  {s.early_bird_ends_at && new Date(s.early_bird_ends_at) > new Date() && (
                    <Badge variant="outline">Early bird until {new Date(s.early_bird_ends_at).toLocaleDateString()}</Badge>
                  )}
                  {s.early_bird_capacity !== null && <Badge variant="outline">{s.early_bird_capacity} early-bird seats</Badge>}
                  <EventLifecycleControls screeningId={s.id} lifecycle={s.lifecycle} onDone={() => setReload(r => r + 1)} />
                  <Button variant="outline" size="sm" className="rounded-full h-8 text-xs" asChild>
                    <Link to={`/studio/analytics/${s.id}`}><BarChart3 className="w-3 h-3 mr-1" /> Analytics</Link>
                  </Button>
                </div>
                <div className="w-full basis-full"><EventInvitations screeningId={s.id} /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </StudioLayout>
  );
}
