import { useCallback,useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card,CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Film,Upload,Loader2,ExternalLink,CalendarDays,Radio } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
type Title={id:string;title:string;type:string;status:string;created_at:string;poster_url:string|null;description:string|null;genres:string[]|null;duration:number|null;release_date:string|null;metadata:Record<string,unknown>|null};
type Event={id:string;content_id:string;screening_date:string|null;event_type:string;status:string};
export default function StudioMovies(){
 usePageTitle('Studio: My Catalogue');const {user}=useAuth();const [titles,setTitles]=useState<Title[]>([]);const [events,setEvents]=useState<Event[]>([]);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState<string|null>(null);
 const [scheduling,setScheduling]=useState<Title|null>(null);const [date,setDate]=useState('');const [ngn,setNgn]=useState('');const [usd,setUsd]=useState('');
 const load=useCallback(async()=>{if(!user?.id){setLoading(false);return;}setLoading(true);
  const {data,error}=await supabase.from('content').select('id,title,type,status,created_at,poster_url,description,genres,duration,release_date,metadata').eq('creator_id',user.id).order('created_at',{ascending:false});
  if(error){toast.error('Your creator catalogue could not be loaded.');setTitles([]);setEvents([]);setLoading(false);return;}
  const rows=(data||[]) as unknown as Title[];setTitles(rows);
  const ids=rows.map(x=>x.id);if(ids.length){const {data:eventRows}=await supabase.from('screenings').select('id,content_id,screening_date,event_type,status').in('content_id',ids).order('screening_date',{ascending:true});setEvents((eventRows||[]) as unknown as Event[]);}else setEvents([]);
  setLoading(false);
 },[user?.id]);
 useEffect(()=>{void load();},[load]);
 const publish=async(id:string)=>{setBusy(id);const {data,error}=await supabase.rpc('publish_creator_content',{p_content_id:id});setBusy(null);if(error){const m=error.message;toast.error(m.includes('content_poster_required')?'Add a poster before publishing.':m.includes('content_master_required')?'Upload the private master video before publishing.':m.includes('rights_declaration_required')?'Add your distribution-rights declaration.':m.includes('approved_creator_required')?'Creator verification and approval are required.':m.includes('master_media_missing')?'Your private master is missing. Re-upload it.':'Publishing failed. Check required assets and creator access.');return;}toast.success('Published to the shared DeGameTV catalogue.');await load();};
 const schedule=async()=>{if(!scheduling)return;const n=Number(ngn),u=Number(usd),when=new Date(date);if(!date||!Number.isFinite(n)||n<=0||!Number.isFinite(u)||u<=0||Number.isNaN(when.getTime())||when.getTime()<Date.now()+15*60*1000){toast.error('Enter a future event time (at least 15 minutes ahead) and positive NGN and USD prices.');return;}
  setBusy(scheduling.id);const {error}=await supabase.rpc('create_creator_screening',{p_content_id:scheduling.id,p_screening_date:when.toISOString(),p_location_pricing:{nigeria:n,international:u},p_event_type:scheduling.type==='live'?'live':scheduling.type==='series'?'series':'film',p_slug:scheduling.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)+'-'+crypto.randomUUID().slice(0,8)});setBusy(null);
  if(error){toast.error(error.message.includes('published_content_required')?'Publish this title first.':error.message.includes('approved_creator_required')?'Creator approval is required.':'The event could not be scheduled.');return;}
  toast.success('Event scheduled on your published title.');setScheduling(null);setDate('');setNgn('');setUsd('');await load();
 };
 return <StudioLayout title="My Catalogue" description="Manage the same titles audiences discover in Virtual Cinema." actions={<Button asChild size="sm"><Link to="/studio/submit"><Upload className="mr-2 h-4 w-4"/>Create title</Link></Button>}>
 {loading?<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin"/></div>:titles.length===0?<div className="py-20 text-center"><Film className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30"/><h3 className="mb-2 font-semibold">Your catalogue is empty</h3><p className="mb-4 text-sm text-muted-foreground">Create a film, series, episode, short, trailer, VOD title or live event.</p><Button asChild><Link to="/studio/submit">Create your first title</Link></Button></div>:<div className="grid gap-4">{titles.map(m=>{const event=events.find(e=>e.content_id===m.id);return <Card key={m.id} className="overflow-hidden"><CardContent className="flex gap-4 p-4">
 {m.poster_url?<img src={m.poster_url} alt={m.title} className="h-28 w-20 shrink-0 rounded-lg object-cover"/>:<div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-lg bg-secondary"><Film className="h-6 w-6 text-muted-foreground"/></div>}
 <div className="min-w-0 flex-1"><div className="mb-1 flex flex-wrap items-center justify-between gap-2"><h3 className="truncate text-sm font-semibold">{m.title}</h3><Badge variant={m.status==='published'?'default':'secondary'}>{m.status}</Badge></div><p className="mb-2 text-xs capitalize text-muted-foreground">{m.type} · {new Date(m.created_at).toLocaleDateString()}</p>{m.description&&<p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{m.description}</p>}<div className="flex flex-wrap gap-2">
 {m.status!=='published'&&<Button size="sm" className="h-8" disabled={busy===m.id} onClick={()=>void publish(m.id)}>{busy===m.id?<Loader2 className="h-3 w-3 animate-spin"/>:'Publish title'}</Button>}
 {m.status==='published'&&<Button size="sm" variant="outline" className="h-8" asChild><Link to={'/content/'+m.id}><ExternalLink className="mr-1 h-3 w-3"/>Public page</Link></Button>}
 {m.status==='published'&&<Button size="sm" variant="outline" className="h-8" onClick={()=>setScheduling(m)}><CalendarDays className="mr-1 h-3 w-3"/>Schedule event</Button>}
 {m.type==='live'&&<Button size="sm" variant="outline" className="h-8" asChild><Link to="/studio/live"><Radio className="mr-1 h-3 w-3"/>Go Live</Link></Button>}
 {event&&<Badge variant="outline">{event.status} · {event.screening_date?new Date(event.screening_date).toLocaleString():'TBA'}</Badge>}
 </div></div></CardContent></Card>;})}</div>}
 {scheduling&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setScheduling(null);}}><section role="dialog" aria-modal="true" className="w-full max-w-lg space-y-4 rounded-2xl border bg-background p-6 shadow-2xl"><div><h2 className="text-lg font-semibold">Schedule premiere or live event</h2><p className="text-sm text-muted-foreground">{scheduling.title}</p></div><div className="space-y-2"><label className="text-sm font-medium">Date and time</label><input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"/></div><div className="grid grid-cols-2 gap-3"><div><label className="text-sm">Nigeria price (NGN)</label><input type="number" min="1" value={ngn} onChange={e=>setNgn(e.target.value)} className="h-10 w-full rounded-md border px-3"/></div><div><label className="text-sm">International price (USD)</label><input type="number" min="0.01" step="0.01" value={usd} onChange={e=>setUsd(e.target.value)} className="h-10 w-full rounded-md border px-3"/></div></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setScheduling(null)}>Cancel</Button><Button disabled={!!busy} onClick={()=>void schedule()}>{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}Schedule</Button></div></section></div>}
 </StudioLayout>;
}