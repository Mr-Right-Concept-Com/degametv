import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Loader2, Lock, Ticket } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { EventContribution } from "@/components/events/EventContribution";
import { EventContributionFeed } from "@/components/events/EventContributionFeed";

type EventData={id:string;title:string;description:string|null;slug:string;poster_url:string|null;banner_url:string|null;trailer_url:string|null;screening_date:string|null;event_timezone:string;live_price_ngn:number|null;live_price_usd:number|null;base_price:number|null;base_currency:string|null;access_model:string;status:string;lifecycle:string;event_visibility:string;invite_only:boolean};
export default function InvitedEvent(){
 const {screeningId=""}=useParams();const {user,loading:authLoading}=useAuth();const navigate=useNavigate();usePageTitle("Private event");
 const [event,setEvent]=useState<EventData|null>(null);const [currency,setCurrency]=useState("NGN");const [loading,setLoading]=useState(true);const [buying,setBuying]=useState(false);const [error,setError]=useState("");
 useEffect(()=>{if(!user||!screeningId)return;let active=true;(async()=>{
  const [{data,error:inviteError},{data:profile}]=await Promise.all([
   supabase.functions.invoke("manage-event-invites",{body:{action:"get_invited_event",screeningId}}),
   supabase.from("profiles").select("preferred_currency").eq("user_id",user.id).maybeSingle()
  ]);
  if(!active)return;
  if(inviteError||!data?.event)setError(data?.error||"You do not have access to this private event.");
  else setEvent(data.event as EventData);
  if(profile?.preferred_currency)setCurrency(profile.preferred_currency);
  setLoading(false);
 })();return()=>{active=false;};},[user?.id,screeningId]);
 const buy=async()=>{
  if(!event||!user)return;setBuying(true);
  if(event.access_model==="FREE"){
   const {data:claim,error:claimError}=await supabase.rpc("claim_free_live_ticket" as never,{p_screening_id:event.id} as never);
   setBuying(false);
   if(claimError){toast.error(claimError.message||"Free admission could not be claimed.");return;}
   const result=claim as {stream_id?:string}|null;
   toast.success("Your free event pass is ready.");
   if(result?.stream_id)navigate("/live/watch/"+result.stream_id);else navigate("/dashboard?tab=tickets");
   return;
  }
  const {data,error:checkoutError}=await supabase.functions.invoke("process-live-payment",{body:{screeningId:event.id,ticketType:"live",currency,email:user.email}});
  setBuying(false);
  if(checkoutError||!data?.success||!data?.checkoutUrl){toast.error(data?.error||"Checkout could not be started.");return;}
  window.location.assign(data.checkoutUrl);
 };
 if(authLoading||loading)return <MainLayout><div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin"/></div></MainLayout>;
 if(!user)return <MainLayout><div className="mx-auto max-w-md px-4 py-16"><Card><CardContent className="p-8 text-center"><Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground"/><h1 className="text-xl font-semibold">Private event invitation</h1><p className="mt-2 text-sm text-muted-foreground">Sign in with the invited email address to access this event.</p><Button asChild className="mt-5 w-full"><Link to={"/auth?redirectTo="+encodeURIComponent(window.location.pathname)}>Sign in</Link></Button></CardContent></Card></div></MainLayout>;
 if(error||!event)return <MainLayout><div className="mx-auto max-w-md px-4 py-16"><Card><CardContent className="p-8 text-center"><Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground"/><h1 className="text-xl font-semibold">Private event unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error||"This invitation is not active."}</p><Button asChild variant="outline" className="mt-5"><Link to="/dashboard?tab=invitations">Back to invitations</Link></Button></CardContent></Card></div></MainLayout>;
 const amount=event.base_price??(currency==="NGN"?event.live_price_ngn:event.live_price_usd);
 const priceCurrency=event.base_price!==null?event.base_currency:currency;
 return <MainLayout><main className="mx-auto max-w-4xl px-4 py-8"><Card className="overflow-hidden"><div className="aspect-[16/7] bg-muted">{(event.banner_url||event.poster_url)&&<img src={event.banner_url||event.poster_url||""} alt="" className="h-full w-full object-cover"/>}</div><CardContent className="space-y-4 p-6"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary"><Lock className="mr-1 h-3 w-3"/>Private invitation</Badge><Badge>{event.lifecycle}</Badge></div><h1 className="text-3xl font-bold">{event.title}</h1>{event.description&&<p className="whitespace-pre-wrap text-muted-foreground">{event.description}</p>}<EventContribution screeningId={event.id} currency={priceCurrency||currency}/><EventContributionFeed screeningId={event.id}/><p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarClock className="h-4 w-4"/>{event.screening_date?new Date(event.screening_date).toLocaleString(undefined,{timeZone:event.event_timezone}):"Date to be announced"} · {event.event_timezone}</p>{event.access_model==="FREE"?<div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-sm text-muted-foreground">Claim your invitation pass to enter this private event.</p><Button onClick={buy} disabled={buying}>{buying?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Ticket className="mr-2 h-4 w-4"/>}Claim free pass</Button></div>:<div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4"><div><p className="text-xs text-muted-foreground">Admission price</p><p className="text-2xl font-bold">{amount??"Price unavailable"} {priceCurrency}</p></div><Button onClick={buy} disabled={buying||!amount} size="lg">{buying?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Ticket className="mr-2 h-4 w-4"/>}Continue to secure checkout</Button></div>}</CardContent></Card></main></MainLayout>;
}