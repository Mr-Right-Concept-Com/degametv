import { useState, useEffect } from 'react';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Film, Upload, Clock, CheckCircle, DollarSign, Loader2 } from 'lucide-react';

interface Submission {
  id: string;
  project_title: string;
  status: string;
  created_at: string;
  project_type: string;
}

export default function StudioDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('filmmaker_submissions')
        .select('id, project_title, status, created_at, project_type')
        .eq('submitter_email', user.email)
        .order('created_at', { ascending: false })
        .limit(10);
      setSubmissions(data || []);
      setLoading(false);
    };
    fetch();
  }, [user?.email]);

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    approved: 'bg-success/15 text-success',
    rejected: 'bg-destructive/15 text-destructive',
    in_review: 'bg-primary/15 text-primary',
  };

  return (
    <StudioLayout title="Studio Dashboard" description="Manage your films and track performance">
      {/* Quick Actions */}
      <div className="flex gap-3 mb-6">
        <Button asChild className="rounded-full gap-2">
          <Link to="/studio/submit"><Upload className="w-4 h-4" /> Submit New Film</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full gap-2">
          <Link to="/studio/movies"><Film className="w-4 h-4" /> View All Movies</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Submissions', value: stats.total, icon: Film, color: 'text-primary' },
          { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-warning' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-success' },
          { label: 'Revenue', value: '₦0', icon: DollarSign, color: 'text-accent' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <Film className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mb-3">No submissions yet</p>
              <Button asChild size="sm" className="rounded-full">
                <Link to="/studio/submit">Submit Your First Film</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-sm">{s.project_title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{s.project_type} · {new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge className={statusColor[s.status] || statusColor.pending}>
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </StudioLayout>
  );
}
