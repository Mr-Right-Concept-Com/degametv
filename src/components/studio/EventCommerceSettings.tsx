import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarClock, Loader2, Save } from "lucide-react";

type Settings={
 screening_date:string|null;event_timezone:string;sales_open_at:string|null;sales_close_at:string|null;
 early_bird_price:number|null;early_bird_currency:string|null;early_bird_ends_at:string|null;
 early_bird_capacity:number|null;event_visibility:"public"|"unlisted"|"private";invite_only:boolean;
 presale_enabled:boolean;settlement_hold_hours:number;
};
const localValue=(v:string|null)=>{if(!v)return "";const d=new Date(v);const pad=(n:number)=>String(n).padStart(2,"0");return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());};
const isoValue=(v:string)=>v?new Date(v).toISOString():null;
const defaults:Settings={screening_date:null,event_timezone:"UTC",sales_open_at:null,sales_close_at:null,early_bird_price:null,early_bird_currency:"NGN",early_bird_ends_at:null,early_bird_capacity:null,event_visibility:"public",invite_only:false,presale_enabled:true,settlement_hold_hours:48};

export function EventCommerceSettings({screeningId}:{screeningId:string}){
 const [value,setValue]=useState<Settings>(defaults);
 const [date,setDate]=useState("");const [open,setOpen]=useState("");const [close,setClose]=useState("");const [earlyEnd,setEarlyEnd]=useState("");
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);
 useEffect(()=>{let active=true;(async()=>{
  const {data,error}=await supabase.from("screenings").select("screening_date,event_timezone,sales_open_at,sales_close_at,early_bird_price,early_bird_currency,early_bird_ends_at,early_bird_capacity,event_visibility,invite_only,presale_enabled,settlement_hold_hours").eq("id",screeningId).maybeSingle();
  if(!active)return;
  if(error||!data){toast.error("Event commerce settings could not be loaded.");setLoading(false);return;}
  const next={...defaults,...data} as Settings;setValue(next);setDate(localValue(next.screening_date));setOpen(localValue(next.sales_open_at));setClose(localValue(next.sales_close_at));setEarlyEnd(localValue(next.early_bird_ends_at));setLoading(false);
 })();return()=>{active=false;};},[screeningId]);
 const update=<K extends keyof Settings>(key:K,v:Settings[K])=>setValue(current=>({...current,[key]:v}));
 const save=async()=>{
  setSaving(true);
  const body={screeningId,screeningDate:isoValue(date),eventTimezone:value.event_timezone,salesOpenAt:isoValue(open),salesCloseAt:isoValue(close),earlyBirdPrice:value.early_bird_price,earlyBirdCurrency:value.early_bird_price===null?null:value.early_bird_currency,earlyBirdEndsAt:isoValue(earlyEnd),earlyBirdCapacity:value.early_bird_price===null?null:value.early_bird_capacity,eventVisibility:value.event_visibility,inviteOnly:value.invite_only,presaleEnabled:value.presale_enabled,settlementHoldHours:value.settlement_hold_hours};
  const {data,error}=await supabase.functions.invoke("manage-event-settings",{body});
  setSaving(false);
  if(error||!data?.success){toast.error(data?.error||"Event settings could not be saved.");return;}
  toast.success("Event schedule and ticket settings saved.");
 };
 return <details className="mt-4 rounded-lg border border-border/70 p-3">
  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium"><CalendarClock className="h-4 w-4"/> Schedule, presales and access <Badge variant="secondary">{value.presale_enabled?"Presales enabled":"Presales off"}</Badge></summary>
  {loading?<div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin"/></div>:<div className="mt-4 grid gap-4 sm:grid-cols-2">
   <div className="space-y-1"><Label>Event date and time</Label><Input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></div>
   <div className="space-y-1"><Label>Event timezone (IANA)</Label><Input value={value.event_timezone} onChange={e=>update("event_timezone",e.target.value)} placeholder="Africa/Lagos"/></div>
   <div className="space-y-1"><Label>Ticket sales open</Label><Input type="datetime-local" value={open} onChange={e=>setOpen(e.target.value)}/></div>
   <div className="space-y-1"><Label>Ticket sales close</Label><Input type="datetime-local" value={close} onChange={e=>setClose(e.target.value)}/></div>
   <div className="space-y-1"><Label>Early-bird price</Label><Input type="number" min="0" step="0.01" value={value.early_bird_price??""} onChange={e=>update("early_bird_price",e.target.value===""?null:Number(e.target.value))} placeholder="Leave empty to disable"/></div>
   <div className="space-y-1"><Label>Early-bird currency</Label><Input maxLength={3} value={value.early_bird_currency||""} onChange={e=>update("early_bird_currency",e.target.value.toUpperCase())} placeholder="NGN"/></div>
   <div className="space-y-1"><Label>Early-bird ends</Label><Input type="datetime-local" value={earlyEnd} onChange={e=>setEarlyEnd(e.target.value)}/></div>
   <div className="space-y-1"><Label>Early-bird ticket capacity</Label><Input type="number" min="1" step="1" value={value.early_bird_capacity??""} onChange={e=>update("early_bird_capacity",e.target.value===""?null:Number(e.target.value))} placeholder="Maximum discounted tickets"/></div>
   <div className="space-y-1"><Label>Event discovery</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={value.event_visibility} onChange={e=>update("event_visibility",e.target.value as Settings["event_visibility"])}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></div>
   <div className="space-y-1"><Label>Creator settlement hold</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={value.settlement_hold_hours} onChange={e=>update("settlement_hold_hours",Number(e.target.value))}><option value={24}>24 hours</option><option value={48}>48 hours (default)</option><option value={72}>72 hours</option></select></div>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.presale_enabled} onChange={e=>update("presale_enabled",e.target.checked)}/> Enable advance ticket sales</label>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.invite_only} onChange={e=>update("invite_only",e.target.checked)}/> Invite-only access</label>
   <div className="sm:col-span-2"><Button onClick={save} disabled={saving} size="sm"><Save className="mr-2 h-4 w-4"/>{saving?"Saving…":"Save event settings"}</Button></div>
  </div>}
 </details>;
}