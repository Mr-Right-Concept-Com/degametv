import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Gift, Heart, Loader2, Sparkles } from "lucide-react";

type GiftItem={id:string;gift_key:string;name:string;description:string|null;emoji:string|null;asset_url:string|null;animation_url:string|null;currency:string;amount_minor:number;animation_duration_ms:number};
export function EventContribution({screeningId,liveStreamId,contentId,currency="NGN",overlay=false}:{screeningId?:string;liveStreamId?:string;contentId?:string;currency?:string;overlay?:boolean}){
 const {user}=useAuth();
 const [type,setType]=useState<"tip"|"gift">("tip");
 const [amount,setAmount]=useState("500");
 const [giftItems,setGiftItems]=useState<GiftItem[]>([]);
 const [selectedGift,setSelectedGift]=useState("");
 const [message,setMessage]=useState("");
 const [anonymous,setAnonymous]=useState(false);
 const [busy,setBusy]=useState(false);\n const idempotencyKey=useRef(crypto.randomUUID());
 const [loadingGifts,setLoadingGifts]=useState(false);
 const targetCount=[screeningId,liveStreamId,contentId].filter(Boolean).length;
 const selected=useMemo(()=>giftItems.find(g=>g.gift_key===selectedGift),[giftItems,selectedGift]);
 useEffect(()=>{
  if(type!=="gift")return;
  let active=true;setLoadingGifts(true);
  (supabase as any).from("creator_gift_catalog").select("id,gift_key,name,description,emoji,asset_url,animation_url,currency,amount_minor,animation_duration_ms")
   .eq("is_enabled",true).eq("currency",currency.toUpperCase()).order("sort_order",{ascending:true})
   .then(({data,error}:any)=>{if(!active)return;if(error)toast.error("Gift catalogue could not be loaded.");const rows=(data||[]) as GiftItem[];setGiftItems(rows);setSelectedGift(rows[0]?.gift_key||"");})
   .finally(()=>{if(active)setLoadingGifts(false);});
  return()=>{active=false;};
 },[type,currency]);
 const send=async()=>{
  if(targetCount!==1){toast.error("This support target is not configured correctly.");return;}
  if(type==="tip"&&(!Number.isFinite(Number(amount))||Number(amount)<=0)){toast.error("Enter a valid tip amount.");return;}
  if(type==="gift"&&!selected){toast.error("Choose an available gift.");return;}
  setBusy(true);
  const {data,error}=await supabase.functions.invoke("process-event-contribution",{body:{
   ...(screeningId?{screeningId}:{}),...(liveStreamId?{liveStreamId}:{}),...(contentId?{contentId}:{}),
   contributionType:type,idempotencyKey:idempotencyKey.current,...(type==="tip"?{amount:Number(amount)}:{giftCatalogKey:selected!.gift_key}),
   currency:currency.toUpperCase(),message:message.trim()||undefined,isAnonymous:anonymous
  }});
  setBusy(false);
  if(error||!data?.success||!data?.checkoutUrl){if(data?.retryable)idempotencyKey.current=crypto.randomUUID();toast.error(data?.error||"Contribution checkout could not be started.");return;}
  window.location.assign(data.checkoutUrl);
 };
 if(targetCount!==1)return null;
 if(!user)return <div className="rounded-xl border border-border/70 p-4"><p className="text-sm font-medium">Support this creator</p><p className="mt-1 text-xs text-muted-foreground">Sign in to send a tip or digital gift.</p><Button asChild size="sm" className="mt-3"><Link to={"/auth?redirectTo="+encodeURIComponent(window.location.pathname)}>Sign in to support</Link></Button></div>;
 return <details className={overlay ? "absolute bottom-3 left-3 z-40 w-[min(24rem,90%)] rounded-xl border border-white/20 bg-background/95 p-3 shadow-2xl backdrop-blur-md" : "rounded-xl border border-border/70 p-4"}>
  <summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><Heart className="h-4 w-4 text-primary"/> Support this creator <Badge variant="secondary">Optional</Badge></summary>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">
   <div className="space-y-1"><Label>Support type</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={e=>setType(e.target.value as "tip"|"gift")}><option value="tip">Send a tip</option><option value="gift">Send a virtual gift</option></select></div>
   {type==="tip"?<div className="space-y-1"><Label>Tip amount ({currency})</Label><Input type="number" min="1" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></div>:
    <div className="space-y-1"><Label>Gift catalogue · {currency}</Label>{loadingGifts?<div className="flex h-10 items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Loading gifts…</div>:giftItems.length===0?<p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">No gifts are configured for {currency} yet.</p>:<div className="grid grid-cols-2 gap-2">{giftItems.map(g=><button key={g.id} type="button" onClick={()=>setSelectedGift(g.gift_key)} className={`rounded-lg border p-3 text-left transition-colors ${selectedGift===g.gift_key?"border-primary bg-primary/5":"border-border hover:bg-muted/50"}`}><span className="text-2xl">{g.emoji||"🎁"}</span><span className="mt-1 block text-sm font-medium">{g.name}</span><span className="text-xs text-muted-foreground">{(Number(g.amount_minor)/(["BIF","CLP","DJF","GNF","ISK","JPY","KMF","KRW","PYG","RWF","UGX","VND","VUV","XAF","XOF","XPF"].includes(currency)?1:["BHD","IQD","JOD","KWD","LYD","OMR","TND"].includes(currency)?1000:100)).toLocaleString()} {currency}</span></button>)}</div>}</div>}
   <div className="space-y-1 sm:col-span-2"><Label>Optional message</Label><Input value={message} onChange={e=>setMessage(e.target.value)} maxLength={500} placeholder="Add a message for the creator"/></div>
   <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)}/> Display my support anonymously</label>
   <div className="sm:col-span-2"><Button type="button" onClick={send} disabled={busy||(type==="gift"&&(!selected||loadingGifts))} size="sm">{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:type==="gift"?<Gift className="mr-2 h-4 w-4"/>:<Sparkles className="mr-2 h-4 w-4"/>}{type==="tip"?"Continue to tip":"Continue to gift"}{type==="tip"?` · ${amount||"0"} ${currency}`:selected?` · ${selected.name}`:""}</Button><p className="mt-2 text-xs text-muted-foreground">Support is separate from ticket purchases and never grants content access. Creator earnings are subject to the platform settlement hold.</p></div>
  </div>
 </details>;
}
