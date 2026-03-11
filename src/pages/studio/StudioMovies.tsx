import { useState, useEffect } from 'react';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Film, Upload, Loader2, ExternalLink } from 'lucide-react';

interface Submission {
  id: string;
  project_title: string;
  project_type: string;
  status: string;
  created_at: string;
  genres: string[] | null;
  poster_url: string | null;
  duration_minutes: number | null;
  release_year: number | null;
  description: string | null;
}

export default function StudioMovies() {
  const { user } = useAuth();
  const [movies, setMovies] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('filmmaker_submissions')
        .select('*')
        .eq('submitter_email', user.email)
        .order('created_at', { ascending: false });
      setMovies(data || []);
      setLoading(false);
    };
    fetch();
  }, [user?.email]);

  const statusColor: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    approved: 'bg-success/15 text-success',
    rejected: 'bg-destructive/15 text-destructive',
    in_review: 'bg-primary/15 text-primary',
  };

  return (
    <StudioLayout
      title="My Movies"
      description={`${movies.length} submissions`}
      actions={
        <Button asChild size="sm" className="rounded-full gap-2">
          <Link to="/studio/submit"><Upload className="w-4 h-4" /> New Submission</Link>
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-20">
          <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold mb-1">No movies submitted</h3>
          <p className="text-sm text-muted-foreground mb-4">Start by submitting your first film</p>
          <Button asChild className="rounded-full">
            <Link to="/studio/submit">Submit Film</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {movies.map(m => (
            <Card key={m.id} className="overflow-hidden">
              <CardContent className="p-4 flex gap-4">
                {m.poster_url ? (
                  <img src={m.poster_url} alt={m.project_title} className="w-20 h-28 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-20 h-28 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Film className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{m.project_title}</h3>
                    <Badge className={statusColor[m.status] || statusColor.pending}>
                      {m.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize mb-2">
                    {m.project_type} {m.duration_minutes ? `· ${m.duration_minutes} min` : ''} {m.release_year ? `· ${m.release_year}` : ''}
                  </p>
                  {m.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{m.description}</p>
                  )}
                  {m.genres && m.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.genres.slice(0, 4).map(g => (
                        <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </StudioLayout>
  );
}
