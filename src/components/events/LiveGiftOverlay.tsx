import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Sparkles } from 'lucide-react';

type GiftEvent={id:string;created_at:string;contribution_type:string;gift_catalog_key:string|null;amount_major:number;currency:string;contributor_name:string;message:string|null;gift_name:string|null;gift_emoji:string|null;gift_asset_url:string|null;gift_animation_url:string|null;animation_duration_ms:number|null};
const isGiftEvent = (value: unknown): value is GiftEvent => {
 const row = typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
 return row !== null && typeof row.id === 'string' && typeof row.created_at === 'string'
  && typeof row.contribution_type === 'string' && (row.gift_catalog_key === null || typeof row.gift_catalog_key === 'string')
  && typeof row.amount_major === 'number' && typeof row.currency === 'string'
  && typeof row.contributor_name === 'string' && (row.message === null || typeof row.message === 'string')
  && (row.gift_name === null || typeof row.gift_name === 'string') && (row.gift_emoji === null || typeof row.gift_emoji === 'string')
  && (row.gift_asset_url === null || typeof row.gift_asset_url === 'string')
  && (row.gift_animation_url === null || typeof row.gift_animation_url === 'string')
  && (row.animation_duration_ms === null || typeof row.animation_duration_ms === 'number');
};

export function LiveGiftOverlay({streamId}:{streamId:string}){
 const [active,setActive]=useState<GiftEvent|null>(null);
 const [queue,setQueue]=useState<GiftEvent[]>([]);
 const seenIds=useRef<Set<string>>(new Set());
 const initialised=useRef(false);

 useEffect(()=>{
  let alive=true;
  const poll=async()=>{
   const {data,error}=await supabase.rpc('get_event_contribution_feed' as never,{p_screening_id:null,p_live_stream_id:streamId} as never);
   if(!alive||error||!Array.isArray(data))return;
   const rows=data.filter(isGiftEvent);
   if(!initialised.current){
    rows.forEach(item=>seenIds.current.add(item.id));
    initialised.current=true;
    return;
   }
   const fresh=rows.filter(item=>{
    if(seenIds.current.has(item.id))return false;
    seenIds.current.add(item.id);
    return true;
   });
   const gifts=fresh.filter(item=>item.contribution_type==='gift')
    .sort((a,b)=>new Date(a.created_at||0).getTime()-new Date(b.created_at||0).getTime());
   if(gifts.length)setQueue(current=>[...current,...gifts]);
  };
  void poll();
  const timer=window.setInterval(()=>void poll(),2500);
  return()=>{alive=false;window.clearInterval(timer);};
 },[streamId]);

 useEffect(()=>{
  if(active||queue.length===0)return;
  setActive(queue[0]);
  setQueue(current=>current.slice(1));
 },[active,queue]);

 useEffect(()=>{
  if(!active)return;
  const timer=window.setTimeout(()=>setActive(null),Math.max(1800,Math.min(active.animation_duration_ms||2200,10000)));
  return()=>clearTimeout(timer);
 },[active]);

 if(!active)return null;
 const media=active.gift_animation_url||active.gift_asset_url;
 const isVideo=Boolean(media&&/\\.(mp4|webm)(\\?|$)/i.test(media));
 return <div className="pointer-events-none absolute right-3 top-3 z-30 w-[min(20rem,75%)] animate-in slide-in-from-right-6 fade-in duration-300">
  <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-black/75 p-3 text-white shadow-2xl backdrop-blur-md">
   <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/10">{media?(isVideo?<video src={media} autoPlay muted loop playsInline className="h-full w-full rounded-xl object-contain"/>:<img src={media} alt="" className="h-full w-full rounded-xl object-contain"/>):<span className="text-3xl">{active.gift_emoji||'🎁'}</span>}</div>
   <div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/70"><Sparkles className="h-3 w-3"/> Gift received</p><p className="truncate text-sm font-bold">{active.contributor_name} sent {active.gift_name||'a gift'}</p>{active.message&&<p className="truncate text-xs text-white/70">{active.message}</p>}</div>
   <Gift className="h-5 w-5 shrink-0 text-pink-300"/>
  </div>
 </div>;
}
