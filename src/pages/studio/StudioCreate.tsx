import { StudioLayout } from '@/components/studio/StudioLayout';
import StudioSubmit from '@/pages/studio/StudioSubmit';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Film, Radio } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function StudioCreate() {
  const [params, setParams] = useSearchParams();
  const live = params.get('flow') === 'live';

  const selectFlow = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'live') {
      next.set('flow', 'live');
      next.set('type', 'live');
    } else {
      next.delete('flow');
      next.delete('type');
    }
    setParams(next, { replace: true });
  };

  return (
    <StudioLayout title="Create" description="Publish a title or set up a ticketed live event from one workspace.">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <Tabs value={live ? 'live' : 'content'} onValueChange={selectFlow}>
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="content" className="gap-2"><Film className="h-4 w-4" />Create content</TabsTrigger>
            <TabsTrigger value="live" className="gap-2"><Radio className="h-4 w-4" />Go live</TabsTrigger>
          </TabsList>
        </Tabs>
        <StudioSubmit key={live ? 'live' : 'content'} />
      </div>
    </StudioLayout>
  );
}
