import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Gift, Heart, MessageCircle, Sparkles } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
type LeaderboardRow=Database["public"]["Functions"]["get_event_contribution_leaderboard"]["Returns"][number];
type TotalsRow=Database["public"]["Functions"]["get_event_contribution_totals"]["Returns"][number];
type Item={id:string;contribution_type:"tip"|"gift";gift_catalog_key?:string|null;gift_name?:string|null;gift_emoji?:string|null;gift_asset_url?:string|null;gift_animation_url?:string|null;animation_duration_ms?:number|null;amount_major:number;currency:string;contributor_name:string;message:string|null;created_at:string};
const isItem=(value:unknown):value is Item=>{
 const row=typeof value==="object"&&value!==null&&!Array.isArray(value)?value as Record<string,unknown>:null;
 return row!==null&&typeof row.id==="string"&&(row.contribution_type==="tip"||row.contribution_type==="gift")&&typeof row.amount_major==="number"&&typeof row.currency==="string"&&typeof row.contributor_name==="string"&&(typeof row.message==="string"||row.message===null)&&typeof row.created_at==="string"&&(row.gift_catalog_key===undefined||typeof row.gift_catalog_key==="string"||row.gift_catalog_key===null)&&(row.gift_name===undefined||typeof row.gift_name==="string"||row.gift_name===null)&&(row.gift_emoji===undefined||typeof row.gift_emoji==="string"||row.gift_emoji===null)&&(row.gift_asset_url===undefined||typeof row.gift_asset_url==="string"||row.gift_asset_url===null)&&(row.gift_animation_url===undefined||typeof row.gift_animation_url==="string"||row.gift_animation_url===null)&&(row.animation_duration_ms===undefined||typeof row.animation_duration_ms==="number"||row.animation_duration_ms===null);
};
const formatMoney=(amount:number,currency:string)=>{try{return new Intl.NumberFormat(undefined,{style:"currency",currency,maximumFractionDigits:2}).format(Number(amount||0));}catch{return Number(amount||0).toFixed(2)+" "+currency;}};
export function EventContributionFeed({screeningId,liveStreamId,contentId}:{screeningId?:string;liveStreamId?:string;contentId?:string}){
 const [items,setItems]=useState<Item[]>([]);
 const [leaderboard,setLeaderboard]=useState<LeaderboardRow[]>([]);
 const [totals,setTotals]=useState<TotalsRow[]>([]);
 const [celebration,setCelebration]=useState<Item|null>(null);
 const latestSeen=useRef<string|null>(null);
 const celebrationTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{
  if(!screeningId&&!liveStreamId&&!contentId)return;
  let active=true;
  const load=async()=>{
   try{
    let data:unknown=null;
    if(contentId){
     const result=await supabase.rpc("get_content_support_feed",{p_content_id:contentId});
     if(result.error)throw result.error;
     data=result.data;
    }else{
     const result=await supabase.rpc("get_event_contribution_feed",{p_screening_id:screeningId??null,p_live_stream_id:liveStreamId??null});
     if(result.error)throw result.error;
     data=result.data;
    }
    if(!active)return;
    if(Array.isArray(data)){
     const rows=data.filter(isItem);
     const newest=rows[0];
     if(latestSeen.current===null)latestSeen.current=newest?.id??null;
     else if(newest&&newest.id!==latestSeen.current){
      latestSeen.current=newest.id;
      if(newest.contribution_type==="gift"){
       setCelebration(newest);
       const duration=Math.min(10000,Math.max(1200,Number(newest.animation_duration_ms)||2600));
       if(celebrationTimer.current)window.clearTimeout(celebrationTimer.current);
       celebrationTimer.current=window.setTimeout(()=>setCelebration(current=>current?.id===newest.id?null:current),duration);
      }
     }
     setItems(rows);
    }
    const targetKind=contentId?"content":screeningId?"screening":"live_stream";
    const targetId=contentId??screeningId??liveStreamId;
    if(targetId){
     const [leaderboardResult,totalsResult]=await Promise.all([
      supabase.rpc("get_event_contribution_leaderboard",{p_target_kind:targetKind,p_target_id:targetId}),
      supabase.rpc("get_event_contribution_totals",{p_target_kind:targetKind,p_target_id:targetId})
     ]);
     if(!active)return;
     if(leaderboardResult.error)console.error("Creator support leaderboard refresh failed.");
     else setLeaderboard(leaderboardResult.data??[]);
     if(totalsResult.error)console.error("Creator support milestone totals refresh failed.");
     else setTotals(totalsResult.data??[]);
    }
   }catch{if(active)console.error("Creator support feed refresh failed.");}
  };
  void load();
  const timer=window.setInterval(()=>void load(),liveStreamId?2500:10000);
  return()=>{active=false;window.clearInterval(timer);if(celebrationTimer.current)window.clearTimeout(celebrationTimer.current);};
 },[screeningId,liveStreamId,contentId]);
 if(items.length===0&&!celebration&&totals.length===0&&leaderboard.length===0)return null;
 return <>
  {celebration&&<div key={celebration.id} className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex justify-center px-4"><div className="flex max-w-sm items-center gap-4 rounded-2xl border border-primary/40 bg-background/95 p-4 shadow-2xl backdrop-blur animate-in zoom-in-75 fade-in duration-300"><div className="flex h-16 w-16 shrink-0 items-center justify-center">{celebration.gift_animation_url?<img src={celebration.gift_animation_url} alt="" className="max-h-16 max-w-16 object-contain"/>:celebration.gift_asset_url?<img src={celebration.gift_asset_url} alt="" className="max-h-16 max-w-16 object-contain animate-bounce"/>:<span className="text-5xl animate-bounce">{celebration.gift_emoji||"🎁"}</span>}</div><div className="min-w-0"><p className="text-sm font-bold">{celebration.contributor_name} sent {celebration.gift_name||"a gift"}!</p><p className="text-xs text-muted-foreground">{formatMoney(Number(celebration.amount_major||0),celebration.currency)} · Thank you for supporting the creator</p>{celebration.message&&<p className="mt-1 truncate text-xs">{celebration.message}</p>}</div></div></div>}
  {(items.length>0||totals.length>0||leaderboard.length>0)&&<section className="rounded-xl border border-border/70 p-4">
   <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Heart className="h-4 w-4 text-primary"/> Creator support <Badge variant="secondary">{items.length}</Badge></h2>
   {totals.length>0&&<div className="mb-4 space-y-2"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Support milestones &amp; totals</h3><div className="grid gap-2 sm:grid-cols-2">{totals.map(row=><div key={row.currency} className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{row.currency} · Total received</p><p className="text-lg font-bold">{formatMoney(Number(row.total_amount_major),row.currency)}</p><p className="text-xs text-muted-foreground">{row.supporter_count} supporters · {row.contribution_count} contributions · {row.gift_count} gifts</p></div>)}</div></div>}
   {leaderboard.length>0&&<div className="mb-4 space-y-2"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top supporters by currency</h3><div className="grid gap-2 sm:grid-cols-2">{leaderboard.map(row=><div key={row.currency+":"+row.rank_position+":"+row.contributor_name} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium"><Badge variant="secondary" className="mr-2">#{row.rank_position}</Badge>{row.contributor_name}</p><p className="text-xs text-muted-foreground">{row.contribution_count} contributions · {row.currency}</p></div><p className="shrink-0 text-sm font-semibold">{formatMoney(Number(row.total_amount_major),row.currency)}</p></div>)}</div></div>}
   {items.length>0&&<div className="space-y-2">{items.map((item,index)=><div key={item.id} className={"flex items-start gap-3 rounded-lg bg-muted/40 p-3 "+(index===0?"animate-in fade-in slide-in-from-bottom-2 duration-500":"")}>
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background">{item.gift_asset_url?<img src={item.gift_asset_url} alt="" className="h-full w-full object-contain"/>:<span className="text-xl">{item.gift_emoji||(item.contribution_type==="gift"?"🎁":"💛")}</span>}</div>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{item.contributor_name}</p><Badge variant="outline">{item.contribution_type==="gift"?(item.gift_name||"Gift"):"Tip"}</Badge><span className="text-xs text-muted-foreground">{formatMoney(Number(item.amount_major||0),item.currency)}</span></div>{item.message&&<p className="mt-1 text-sm text-muted-foreground">{item.message}</p>}<p className="mt-1 text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p></div>
    <div className="flex shrink-0 items-center gap-1 text-muted-foreground">{item.contribution_type==="gift"?<Gift className="h-4 w-4"/>:<Sparkles className="h-4 w-4"/>}<MessageCircle className="h-4 w-4"/></div>
   </div>)}</div>}
  </section>}
 </>;
}
