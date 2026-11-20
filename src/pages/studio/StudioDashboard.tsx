import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Film, Upload, CalendarDays, Eye, DollarSign, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TierUpgradeCard } from '@/components/studio/TierUpgradeCard';
import type { Tables } from '@/integrations/supabase/types';

type ContentRow=Pick<Tables<'content'>,'id'|'title'|'type'|'status'|'created_at'|'view_count'>;
type EventRow=Pick<Tables<'screenings'>,'id'|'title'|'screening_date'|'event_type'|'status'>;
export default function StudioDashboard(){
 usePageTitle('Studio: Dashboard');const {user}=useAuth();
 const [items,setItems]=useState<ContentRow[]>([]);const [events,setEvents]=useState<EventRow[]>([]);
 const [earnings,setEarnings]=useState<Record<string,number>>({});const [loading,setLoading]=useState(true);
 useEffect(()=>{if(!user?.id){setLoading(false);return;}let active=true;
  (async()=>{const [content,ledger]=await Promise.all([
   supabase.from('content').select('id,title,type,status,created_at,view_count').eq('creator_id',user.id).order('created_at',{ascending:false}).limit(100),
   supabase.from('wallet_ledger').select('net,currency').eq('user_id',user.id).eq('kind','sale')
  ]);
  if(!active)return;
  const titles=content.data ?? [];setItems(titles);
  const ids=titles.map(item=>item.id);
  if(ids.length){const {data:screenings}=await supabase.from('screenings').select('id,title,screening_date,event_type,status').in('content_id',ids).order('screening_date',{ascending:true}).limit(10);if(active)setEvents(screenings ?? []);}else setEvents([]);
  setEarnings((ledger.data||[]).reduce((a,row)=>{const currency=String(row.currency||'').toUpperCase();if(/^[A-Z]{3}$/.test(currency))a[currency]=(a[currency]||0)+(Number(row.net)||0);return a;},{} as Record<string,number>));setLoading(false);
  })();return()=>{active=false;};},[user?.id]);
 const published=items.filter(x=>x.status==='published').length;
 const views=items.reduce((n,x)=>n+(x.view_count||0),0);
 const earningsLabel=Object.entries(earnings).sort(([a],[b])=>a.localeCompare(b)).map(([currency,amount])=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:2}).format(amount);}catch{return currency+' '+amount.toLocaleString();}}).join(' · ')||'—';
 return <StudioLayout title="Creator Studio" description="One workspace for your catalogue, releases, live events and earnings.">
  <div className="mb-6"><TierUpgradeCard/></div>
  <div className="mb-6 flex flex-wrap gap-3"><Button asChild><Link to="/studio/create"><Upload className="mr-2 h-4 w-4"/>Create & publish</Link></Button><Button asChild variant="outline"><Link to="/studio/movies"><Film className="mr-2 h-4 w-4"/>My catalogue</Link></Button></div>
  <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
   {[{label:'My titles',value:items.length,icon:Film},{label:'Published',value:published,icon:Upload},{label:'Audience views',value:views.toLocaleString(),icon:Eye},{label:'Net earnings',value:earningsLabel,icon:DollarSign}].map(s=><Card key={s.label}><CardContent className="pt-5"><s.icon className="mb-2 h-5 w-5 text-primary"/><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>)}
  </div>
  <div className="grid gap-6 lg:grid-cols-2">
   <Card><CardContent className="p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Recently updated</h2><Button asChild size="sm" variant="ghost"><Link to="/studio/movies">View all</Link></Button></div>
   {loading?<Loader2 className="h-5 w-5 animate-spin"/>:items.length===0?<div className="py-8 text-center"><p className="mb-3 text-sm text-muted-foreground">Your creator catalogue is ready for its first title.</p><Button asChild><Link to="/studio/create">Create your first title</Link></Button></div>:<div className="space-y-3">{items.slice(0,6).map(x=><div key={x.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{x.title}</p><p className="text-xs capitalize text-muted-foreground">{x.type} · {new Date(x.created_at).toLocaleDateString()}</p></div><Badge variant={x.status==='published'?'default':'secondary'}>{x.status}</Badge></div>)}</div>}</CardContent></Card>
   <Card><CardContent className="p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Your upcoming events</h2><Button asChild size="sm" variant="ghost"><Link to="/studio/live/manage">Manage live</Link></Button></div>
   {events.length===0?<div className="py-8 text-center"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground"/><p className="text-sm text-muted-foreground">No scheduled screenings or premieres yet.</p></div>:<div className="space-y-3">{events.map(e=><div key={e.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{e.title}</p><p className="text-xs text-muted-foreground">{e.screening_date?new Date(e.screening_date).toLocaleString():'Date to be announced'}</p></div><Badge variant="outline">{e.event_type||e.status}</Badge></div>)}</div>}</CardContent></Card>
  </div>
 </StudioLayout>;
}