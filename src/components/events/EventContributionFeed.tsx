import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Gift, Heart, MessageCircle, Sparkles } from "lucide-react";

type Item={
 id:string;contribution_type:"tip"|"gift";gift_catalog_key?:string|null;gift_name?:string|null;
 gift_emoji?:string|null;gift_asset_url?:string|null;gift_animation_url?:string|null;
 animation_duration_ms?:number|null;amount_major:number;currency:string;
 contributor_name:string;message:string|null;created_at:string
};
const formatMoney=(amount:number,currency:string)=>{try{return new Intl.NumberFormat(undefined,{style:"currency",currency,maximumFractionDigits:2}).format(Number(amount||0));}catch{return Number(amount||0).toFixed(2)+" "+currency;}};

export function EventContributionFeed({screeningId,liveStreamId,contentId}:{screeningId?:string;liveStreamId?:string;contentId?:string}){
 const [items,setItems]=useState<Item[]>([]);
 const [celebration,setCelebration]=useState<Item|null>(null);
 const latestSeen=useRef<string|null>(null);
 useEffect(()=>{
  if(!screeningId&&!liveStreamId&&!contentId)return;
  let active=true;
  const load=async()=>{
   let data:any[]|null=null;
   if(contentId){
    const result=await (supabase as any).rpc("get_content_support_feed",{p_content_id:contentId});
    data=result.data;
   }else{
    const result=await (supabase as any).rpc("get_event_contribution_feed",{p_screening_id:screeningId??null,p_live_stream_id:liveStreamId??null});
    data=result.data;
   }
   if(!active||!data)return;
   const rows=data as Item[];
   const newest=rows[0];
   if(latestSeen.current===null){latestSeen.current=newest?.id??null;}
   else if(newest&&newest.id!==latestSeen.current){
    latestSeen.current=newest.id;
    if(newest.contribution_type==="gift"){
     setCelebration(newest);
     const duration=Math.min(10000,Math.max(1200,Number(newest.animation_duration_ms)||2600));
     window.setTimeout(()=>setCelebration(current=>current?.id===newest.id?null:current),duration);
    }
   }
   setItems(rows);
  };
  void load();
  const timer=window.setInterval(()=>void load(),liveStreamId?2500:10000);
  return()=>{active=false;window.clearInterval(timer);};
 },[screeningId,liveStreamId,contentId]);
 if(items.length===0&&!celebration)return null;
 return <>
  {celebration&&<div key={celebration.id} className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex justify-center px-4">
   <div className="flex max-w-sm items-center gap-4 rounded-2xl border border-primary/40 bg-background/95 p-4 shadow-2xl backdrop-blur animate-in zoom-in-75 fade-in duration-300">
    <div className="flex h-16 w-16 shrink-0 items-center justify-center">
     {celebration.gift_animation_url?<img src={celebration.gift_animation_url} alt="" className="max-h-16 max-w-16 object-contain"/>:celebration.gift_asset_url?<img src={celebration.gift_asset_url} alt="" className="max-h-16 max-w-16 object-contain animate-bounce"/>:<span className="text-5xl animate-bounce">{celebration.gift_emoji||"🎁"}</span>}
    </div>
    <div className="min-w-0"><p className="text-sm font-bold">{celebration.contributor_name} sent {celebration.gift_name||"a gift"}!</p><p className="text-xs text-muted-foreground">{formatMoney(Number(celebration.amount_major||0),celebration.currency)} · Thank you for supporting the creator</p>{celebration.message&&<p className="mt-1 truncate text-xs">{celebration.message}</p>}</div>
   </div>
  </div>}
  {items.length>0&&<section className="rounded-xl border border-border/70 p-4">
   <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Heart className="h-4 w-4 text-primary"/> Creator support <Badge variant="secondary">{items.length}</Badge></h2>
   <div className="space-y-2">{items.map((item,index)=><div key={item.id} className={`flex items-start gap-3 rounded-lg bg-muted/40 p-3 ${index===0?"animate-in fade-in slide-in-from-bottom-2 duration-500":""}`}>
    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">{item.contribution_type==="gift"?(item.gift_emoji?<span>{item.gift_emoji}</span>:<Gift className="h-4 w-4 text-primary"/>):<Sparkles className="h-4 w-4 text-primary"/>}</div>
    <div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.contributor_name} {item.contribution_type==="gift"?"sent "+(item.gift_name||"a gift"):"sent a tip"}</p>{item.message&&<p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground"><MessageCircle className="mt-0.5 h-3 w-3 shrink-0"/>{item.message}</p>}</div>
    <Badge variant="outline">{formatMoney(Number(item.amount_major||0),item.currency)}</Badge>
   </div>)}</div>
  </section>}
 </>;
}
