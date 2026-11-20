import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Gift, Heart, MessageCircle } from "lucide-react";

type Item={id:string;contribution_type:"tip"|"gift";amount_major:number;currency:string;contributor_name:string;message:string|null;created_at:string};
const formatMoney=(amount:number,currency:string)=>{try{return new Intl.NumberFormat(undefined,{style:"currency",currency,maximumFractionDigits:2}).format(Number(amount||0));}catch{return Number(amount||0).toFixed(2)+" "+currency;}};
export function EventContributionFeed({screeningId,liveStreamId}:{screeningId?:string;liveStreamId?:string}){
 const [items,setItems]=useState<Item[]>([]);
 useEffect(()=>{
  if(!screeningId&&!liveStreamId)return;
  let active=true;
  const load=async()=>{
   const {data}=await supabase.rpc("get_event_contribution_feed" as never,{p_screening_id:screeningId??null,p_live_stream_id:liveStreamId??null} as never);
   if(active&&data)setItems(data as unknown as Item[]);
  };
  void load();
  const timer=setInterval(()=>void load(),10000);
  return()=>{active=false;clearInterval(timer);};
 },[screeningId,liveStreamId]);
 if(items.length===0)return null;
 return <section className="rounded-xl border border-border/70 p-4">
  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Heart className="h-4 w-4 text-primary"/> Creator support <Badge variant="secondary">{items.length}</Badge></h2>
  <div className="space-y-2">{items.map(item=><div key={item.id} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
   <div className="mt-0.5 rounded-full bg-primary/10 p-2">{item.contribution_type==="gift"?<Gift className="h-4 w-4 text-primary"/>:<Heart className="h-4 w-4 text-primary"/>}</div>
   <div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.contributor_name} sent a {item.contribution_type}</p>{item.message&&<p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground"><MessageCircle className="mt-0.5 h-3 w-3 shrink-0"/>{item.message}</p>}</div>
   <Badge variant="outline">{formatMoney(Number(item.amount_major||0),item.currency)}</Badge>
  </div>)}</div>
 </section>;
}