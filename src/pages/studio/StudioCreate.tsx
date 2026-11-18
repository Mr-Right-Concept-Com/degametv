import { Link } from 'react-router-dom';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Film, Clapperboard, Radio, CalendarDays, ArrowUpRight } from 'lucide-react';

const workflows = [
  { title: 'Film', description: 'Create a film project, add metadata and private master media, then submit it for rights and distribution review.', href: '/studio/submit?type=movie', icon: Film },
  { title: 'Series', description: 'Create a series project and submit its catalogue metadata and assets for review.', href: '/studio/submit?type=series', icon: Clapperboard },
  { title: 'Live stream', description: 'Configure a live production, stream settings and event readiness in the live production workspace.', href: '/studio/live', icon: Radio },
  { title: 'Virtual event', description: 'Create and manage a ticketed virtual screening, scheduling, pricing and audience access.', href: '/studio/screenings', icon: CalendarDays },
];

export default function StudioCreate() {
  return (
    <StudioLayout title="Create" description="Choose the production workflow that matches what you are making.">
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
        {workflows.map(({ title, description, href, icon: Icon }) => (
          <Link key={title} to={href} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
            <Card className="h-full transition-colors group-hover:border-primary/60 group-focus-visible:border-primary">
              <CardHeader>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {title}
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent><span className="text-sm font-medium text-primary">Open workflow</span></CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </StudioLayout>
  );
}
