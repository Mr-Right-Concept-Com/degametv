import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Gift, Heart, Loader2 } from "lucide-react";

export function EventContribution({screeningId,liveStreamId,currency="NGN"}:{screeningId?:string;liveStreamId?:string;currency?:string}){
 const [type,setType]=useState<"tip"|"gift">("tip");
 const [amount,setAmount]=useState("500");
 const [giftKey,setGiftKey]=useState("standard");
 const [message,setMessage]=useState("");
 const [anonymous,setAnonymous]=useState(false);
 const [busy,setBusy]=useState(false);
 const send=async()=>{
  const value=Number(amount);
  if(!Number.isFinite(value)||value<=0){toast.error("Enter a valid contribution amount.");return;}
  setBusy(true);
  const {data,error}=await supabase.functions.invoke("process-event-contribution",{body:{
   ...(screeningId?{screeningId}:{}),...(liveStreamId?{liveStreamId}:{}),
   contributionType:type,amount:value,currency,countryCode:undefined,
   ...(type==="gift"?{giftCatalogKey:giftKey}:{}),message:message.trim()||undefined,isAnonymous:anonymous
  }});
  setBusy(false);
  if(error||!data?.success||!data?.checkoutUrl){toast.error(data?.error||"Contribution checkout could not be started.");return;}
  window.location.assign(data.checkoutUrl);
 };
 if(!screeningId&&!liveStreamId)return null;
 return <details className="rounded-xl border border-border/70 p-4">
  <summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><Heart className="h-4 w-4 text-primary"/> Support this creator <Badge variant="secondary">Optional</Badge></summary>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">
   <div className="space-y-1"><Label>Contribution type</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={e=>setType(e.target.value as "tip"|"gift")}><option value="tip">Tip</option><option value="gift">Digital gift</option></select></div>
   <div className="space-y-1"><Label>Amount ({currency})</Label><Input type="number" min="1" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></div>
   {type==="gift"&&<div className="space-y-1 sm:col-span-2"><Label>Gift catalogue key</Label><Input value={giftKey} onChange={e=>setGiftKey(e.target.value)} maxLength={80} placeholder="Gift key"/></div>}
   <div className="space-y-1 sm:col-span-2"><Label>Optional message</Label><Input value={message} onChange={e=>setMessage(e.target.value)} maxLength={500} placeholder="Add a message for the creator"/></div>
   <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)}/> Display my contribution anonymously</label>
   <div className="sm:col-span-2"><Button type="button" onClick={send} disabled={busy} size="sm">{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Gift className="mr-2 h-4 w-4"/>}{type==="tip"?"Send tip":"Send gift"} · {amount||"0"} {currency}</Button><p className="mt-2 text-xs text-muted-foreground">Contributions are optional and never grant ticket, screening or playback access.</p></div>
  </div>
 </details>;
}