import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CalendarDays, Clock, Share2, Ticket, Film } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePageTitle } from '@/hooks/usePageTitle';

interface PublicContent {
  id: string;
  title: string;
  description: string | null;
  type: string;
  poster_url: string | null;
  trailer_url: string | null;
  duration: number | null;
  release_date: string | null;
  genres: string[] | null;
  cast_crew: Array<{name?:string;role?:string}> | null;
}
interface PublicScreening { id: string; title: string; slug: string; screening_date: string | null; location_pricing: { nigeria?: number; international?: number } }

export default function ContentLanding() {
  const { id } = useParams<{id:string}>();
  const [content,setContent]=useState<PublicContent|null>(null);
  const [screenings,setScreenings]=useState<PublicScreening[]>([]);
  const [loading,setLoading]=useState(true);
  usePageTitle(content?.title ? content.title + ' — DeGameTV' : 'DeGameTV');
  useEffect(()=>{
    let active=true;
    const load=async()=>{
      if(!id){setLoading(false);return;}
      const {data,error}=await supabase.from('content').select('id,title,description,type,poster_url,trailer_url,duration,release_date,genres,cast_crew').eq('id',id).eq('status','published').maybeSingle();
      if(!active)return;
      if(error||!data){setContent(null);setLoading(false);return;}
      setContent(data as PublicContent);
      const {data:events}=await supabase.from('screenings').select('id,title,slug,screening_date,location_pricing').eq('content_id',id).eq('status','published').order('screening_date',{ascending:true});
      if(active)setScreenings((events??[]) as PublicScreening[]);
      setLoading(false);
    };
    void load();
    return()=>{active=false;};
  },[id]);
  const share=async()=>{
    const url=window.location.href;
    try{
      if(navigator.share) await navigator.share({title:content?.title??'DeGameTV',url});
      else {await navigator.clipboard.writeText(url);toast.success('Public page link copied.');}
    }catch{toast.message('Copy this page address to share it.');}
  };
  if(loading)return <MainLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin"/></div></MainLayout>;
  if(!content)return <MainLayout><div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center"><Film className="mb-4 h-12 w-12 text-muted-foreground"/><h1 className="text-xl font-bold">This title is not available</h1><p className="mt-2 text-sm text-muted-foreground">The page may be unpublished or the link may be incorrect.</p><Button asChild className="mt-5"><Link to="/cinema">Browse cinema</Link></Button></div></MainLayout>;
  return <MainLayout>
    <article className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-[minmax(220px,320px)_1fr]">
        <div>{content.poster_url?<img src={content.poster_url} alt={content.title+' poster'} className="w-full rounded-2xl object-cover shadow-xl"/>:<div className="flex aspect-[2/3] items-center justify-center rounded-2xl bg-secondary"><Film className="h-16 w-16 text-muted-foreground"/></div>}</div>
        <div className="flex flex-col justify-center">
          <Badge className="mb-3 w-fit capitalize">{content.type}</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{content.title}</h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {content.release_date&&<span className="flex items-center gap-1"><CalendarDays className="h-4 w-4"/>{new Date(content.release_date).getFullYear()}</span>}
            {content.duration&&<span className="flex items-center gap-1"><Clock className="h-4 w-4"/>{Math.round(content.duration/60)} min</span>}
          </div>
          {content.genres?.length ? <div className="mt-4 flex flex-wrap gap-2">{content.genres.map(genre=><Badge key={genre} variant="outline">{genre}</Badge>)}</div>:null}
          {content.description&&<p className="mt-6 whitespace-pre-wrap leading-7 text-muted-foreground">{content.description}</p>}
          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={share} variant="outline"><Share2 className="mr-2 h-4 w-4"/>Share title</Button>
            {content.trailer_url&&<Button asChild variant="outline"><a href={content.trailer_url} target="_blank" rel="noopener noreferrer">Watch trailer</a></Button>}
          </div>
        </div>
      </div>
      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold">Upcoming screenings</h2>
        {screenings.length===0?<Card><CardContent className="py-8 text-center text-sm text-muted-foreground">This title is published. No ticketed screenings are available yet.</CardContent></Card>:
          <div className="grid gap-3 sm:grid-cols-2">{screenings.map(event=><Card key={event.id}><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="font-medium">{event.title}</p><p className="text-xs text-muted-foreground">{event.screening_date?new Date(event.screening_date).toLocaleString():'Date to be announced'}</p></div><Button asChild size="sm"><Link to={'/buy/'+event.slug}><Ticket className="mr-2 h-4 w-4"/>Get ticket</Link></Button></CardContent></Card>)}</div>}
      </section>
    </article>
  </MainLayout>;
}
