import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Gift, Heart, Loader2, Sparkles, Wallet } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type GiftItem = Pick<Database["public"]["Tables"]["creator_gift_catalog"]["Row"],"id"|"gift_key"|"name"|"description"|"emoji"|"asset_url"|"animation_url"|"currency"|"amount_minor"|"animation_duration_ms">;
type PersonalBalance = Database["public"]["Functions"]["get_my_personal_wallet_balances"]["Returns"][number];
const responseSchema=z.union([
 z.object({success:z.literal(true),checkoutUrl:z.string().url(),reference:z.string()}),
 z.object({success:z.literal(true),paid:z.literal(true),reference:z.string().optional()}),
 z.object({success:z.literal(false),error:z.string().optional(),retryable:z.boolean().optional()})
]);
const minorScale=(value:string)=>["BIF","CLP","DJF","GNF","ISK","JPY","KMF","KRW","PYG","RWF","UGX","VND","VUV","XAF","XOF","XPF"].includes(value)?1:["BHD","IQD","JOD","KWD","LYD","OMR","TND"].includes(value)?1000:100;
export function EventContribution({screeningId,liveStreamId,contentId,currency="NGN",overlay=false}:{screeningId?:string;liveStreamId?:string;contentId?:string;currency?:string;overlay?:boolean}){
 const {user}=useAuth();
 const [type,setType]=useState<"tip"|"gift">("tip");
 const [amount,setAmount]=useState("500");
 const [giftItems,setGiftItems]=useState<GiftItem[]>([]);
 const [selectedGift,setSelectedGift]=useState("");
 const [message,setMessage]=useState("");
 const [anonymous,setAnonymous]=useState(false);
 const [busy,setBusy]=useState(false);
 const [paymentMethod,setPaymentMethod]=useState<"provider"|"personal_wallet">("provider");
 const [personalBalances,setPersonalBalances]=useState<PersonalBalance[]>([]);
 const [walletBalanceLoading,setWalletBalanceLoading]=useState(false);
 const idempotencyKey=useRef(crypto.randomUUID());
 const [loadingGifts,setLoadingGifts]=useState(false);
 const targetCount=[screeningId,liveStreamId,contentId].filter(Boolean).length;
 const selected=useMemo(()=>giftItems.find(g=>g.gift_key===selectedGift),[giftItems,selectedGift]);
 const contributionAmount=type==="gift"&&selected?Number(selected.amount_minor)/minorScale(currency.toUpperCase()):Number(amount);
 const selectedPersonalBalance=personalBalances.find(row=>row.currency===currency.toUpperCase());
 const canPayFromWallet=Boolean(selectedPersonalBalance&&Number(selectedPersonalBalance.balance_major)>=contributionAmount);
 useEffect(()=>{
  if(!user)return;
  let active=true;setWalletBalanceLoading(true);
  supabase.rpc("get_my_personal_wallet_balances").then(({data,error})=>{
   if(!active)return;
   if(error){toast.error("Personal Wallet balance could not be loaded.");setPersonalBalances([]);}
   else setPersonalBalances(data??[]);
  }).finally(()=>{if(active)setWalletBalanceLoading(false);});
  return()=>{active=false;};
 },[user?.id]);
 useEffect(()=>{
  if(type!=="gift")return;
  let active=true;setLoadingGifts(true);
  supabase.from("creator_gift_catalog").select("id,gift_key,name,description,emoji,asset_url,animation_url,currency,amount_minor,animation_duration_ms")
   .eq("is_enabled",true).eq("currency",currency.toUpperCase()).order("sort_order",{ascending:true})
   .then(({data,error})=>{if(!active)return;if(error){toast.error("Gift catalogue could not be loaded.");setGiftItems([]);return;}const gifts=data??[];setGiftItems(gifts);setSelectedGift(gifts[0]?.gift_key||"");})
   .catch(()=>{if(active)toast.error("Gift catalogue could not be loaded.");})
   .finally(()=>{if(active)setLoadingGifts(false);});
  return()=>{active=false;};
 },[type,currency]);
 const send=async()=>{
  if(targetCount!==1){toast.error("This support target is not configured correctly.");return;}
  if(type==="tip"&&(!Number.isFinite(Number(amount))||Number(amount)<=0)){toast.error("Enter a valid tip amount.");return;}
  if(type==="gift"&&!selected){toast.error("Choose an available gift.");return;}
  if(paymentMethod==="personal_wallet"&&!canPayFromWallet){toast.error("Your Personal Wallet balance is insufficient.");return;}
  if(busy)return;
  setBusy(true);
  try{
   const {data,error}=await supabase.functions.invoke("process-event-contribution",{body:{
    ...(screeningId?{screeningId}:{}),...(liveStreamId?{liveStreamId}:{}),...(contentId?{contentId}:{}),
    contributionType:type,paymentMethod,idempotencyKey:idempotencyKey.current,
    ...(type==="tip"?{amount:Number(amount)}:{giftCatalogKey:selected!.gift_key}),
    currency:currency.toUpperCase(),message:message.trim()||undefined,isAnonymous:anonymous
   }});
   const parsed=responseSchema.safeParse(data);
   if(error||!parsed.success||!parsed.data.success){
    if(parsed.success&&!parsed.data.success&&parsed.data.retryable)idempotencyKey.current=crypto.randomUUID();
    toast.error(parsed.success&&!parsed.data.success?parsed.data.error||"Contribution could not be completed.":error?.message||"Contribution service returned an invalid response.");
    return;
   }
   if("paid" in parsed.data&&parsed.data.paid){
    idempotencyKey.current=crypto.randomUUID();
    toast.success("Your tip or gift was paid from your Personal Wallet.");
    const {data:balances}=await supabase.rpc("get_my_personal_wallet_balances");
    setPersonalBalances(balances??[]);
    return;
   }
   if("checkoutUrl" in parsed.data)window.location.assign(parsed.data.checkoutUrl);
  }catch{toast.error("Contribution could not be completed. Please try again.");}
  finally{setBusy(false);}
 };
 if(targetCount!==1)return null;
 if(!user)return <div className="rounded-xl border border-border/70 p-4"><p className="text-sm font-medium">Support this creator</p><p className="mt-1 text-xs text-muted-foreground">Sign in to send a tip or digital gift.</p><Button asChild size="sm" className="mt-3"><Link to={"/auth?redirectTo="+encodeURIComponent(window.location.pathname)}>Sign in to support</Link></Button></div>;
 return <details className={overlay?"absolute bottom-3 left-3 z-40 w-[min(24rem,90%)] rounded-xl border border-white/20 bg-background/95 p-3 shadow-2xl backdrop-blur-md":"rounded-xl border border-border/70 p-4"}>
  <summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><Heart className="h-4 w-4 text-primary"/> Support this creator <Badge variant="secondary">Optional</Badge></summary>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">
   <div className="space-y-1"><Label>Support type</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={event=>{const result=z.enum(["tip","gift"]).safeParse(event.target.value);if(result.success)setType(result.data);}}><option value="tip">Send a tip</option><option value="gift">Send a virtual gift</option></select></div>
   {type==="tip"?<div className="space-y-1"><Label>Tip amount ({currency})</Label><Input type="number" min="1" step="0.01" value={amount} onChange={event=>setAmount(event.target.value)}/></div>:
    <div className="space-y-1"><Label>Gift catalogue · {currency}</Label>{loadingGifts?<div className="flex h-10 items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Loading gifts…</div>:giftItems.length===0?<p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">No gifts are configured for {currency} yet.</p>:<div className="grid grid-cols-2 gap-2">{giftItems.map(gift=><button key={gift.id} type="button" onClick={()=>setSelectedGift(gift.gift_key)} className={"rounded-lg border p-3 text-left transition-colors "+(selectedGift===gift.gift_key?"border-primary bg-primary/5":"border-border hover:bg-muted/50")}><span className="text-2xl">{gift.emoji||"🎁"}</span><span className="mt-1 block text-sm font-medium">{gift.name}</span><span className="text-xs text-muted-foreground">{(Number(gift.amount_minor)/minorScale(currency.toUpperCase())).toLocaleString()} {currency}</span></button>)}</div>}</div>}
   <div className="space-y-1 sm:col-span-2"><Label>Payment method</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={paymentMethod} onChange={event=>{const result=z.enum(["provider","personal_wallet"]).safeParse(event.target.value);if(result.success)setPaymentMethod(result.data);}}><option value="provider">External payment provider</option><option value="personal_wallet">{walletBalanceLoading?"Checking Personal Wallet…":"Personal Wallet · "+(selectedPersonalBalance?Number(selectedPersonalBalance.balance_major).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+" "+currency:"No balance available")}</option></select>{paymentMethod==="personal_wallet"&&!canPayFromWallet&&<p className="text-xs text-muted-foreground">Insufficient balance. <Link className="text-primary underline" to="/dashboard?tab=wallet">Top up your Personal Wallet</Link>.</p>}</div>
   <div className="space-y-1 sm:col-span-2"><Label>Optional message</Label><Input value={message} onChange={event=>setMessage(event.target.value)} maxLength={500} placeholder="Add a message for the creator"/></div>
   <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={anonymous} onChange={event=>setAnonymous(event.target.checked)}/> Display my support anonymously</label>
   <div className="sm:col-span-2"><Button type="button" onClick={send} disabled={busy||walletBalanceLoading||(type==="gift"&&(!selected||loadingGifts))||(paymentMethod==="personal_wallet"&&!canPayFromWallet)} size="sm">{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:paymentMethod==="personal_wallet"?<Wallet className="mr-2 h-4 w-4"/>:type==="gift"?<Gift className="mr-2 h-4 w-4"/>:<Sparkles className="mr-2 h-4 w-4"/>}{paymentMethod==="personal_wallet"?"Pay from Personal Wallet":type==="tip"?"Continue to tip":"Continue to gift"}{paymentMethod==="provider"&&type==="tip"?" · "+(amount||"0")+" "+currency:paymentMethod==="provider"&&selected?" · "+selected.name:""}</Button><p className="mt-2 text-xs text-muted-foreground">Support is separate from ticket purchases and never grants content access. Creator earnings remain subject to the platform settlement hold.</p></div>
  </div>
 </details>;
}
