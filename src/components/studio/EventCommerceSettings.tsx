import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarClock, Loader2, Save } from "lucide-react";

const settingsSchema = z.object({
  screening_date: z.string().nullable(),
  event_timezone: z.string().min(1),
  sales_open_at: z.string().nullable(),
  sales_close_at: z.string().nullable(),
  early_bird_price: z.number().finite().nonnegative().nullable(),
  early_bird_currency: z.string().nullable(),
  early_bird_ends_at: z.string().nullable(),
  early_bird_capacity: z.number().int().positive().nullable(),
  event_visibility: z.enum(["public", "unlisted", "private"]),
  invite_only: z.boolean(),
  presale_enabled: z.boolean(),
  settlement_hold_hours: z.union([z.literal(24), z.literal(48), z.literal(72)]),
});
type Settings = z.infer<typeof settingsSchema>;
const localValue = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
};
const isoValue = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const defaults: Settings = { screening_date: null, event_timezone: "UTC", sales_open_at: null, sales_close_at: null, early_bird_price: null, early_bird_currency: "NGN", early_bird_ends_at: null, early_bird_capacity: null, event_visibility: "public", invite_only: false, presale_enabled: true, settlement_hold_hours: 48 };

export function EventCommerceSettings({ screeningId }: { screeningId: string }) {
  const [value, setValue] = useState<Settings>(defaults);
  const [date, setDate] = useState("");
  const [open, setOpen] = useState("");
  const [close, setClose] = useState("");
  const [earlyEnd, setEarlyEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase.from("screenings").select("screening_date,event_timezone,sales_open_at,sales_close_at,early_bird_price,early_bird_currency,early_bird_ends_at,early_bird_capacity,event_visibility,invite_only,presale_enabled,settlement_hold_hours").eq("id", screeningId).maybeSingle();
        if (!active) return;
        if (error || !data) {
          toast.error("Event commerce settings could not be loaded.");
          setLoading(false);
          return;
        }
        const parsed = settingsSchema.safeParse(data);
        if (!parsed.success) {
          toast.error("Event commerce settings returned an invalid response.");
          setLoading(false);
          return;
        }
        const next = parsed.data;
        setValue(next);
        setDate(localValue(next.screening_date));
        setOpen(localValue(next.sales_open_at));
        setClose(localValue(next.sales_close_at));
        setEarlyEnd(localValue(next.early_bird_ends_at));
        setLoading(false);
      } catch {
        if (active) {
          toast.error("Event commerce settings could not be loaded.");
          setLoading(false);
        }
      }
    })();
    return () => { active = false; };
  }, [screeningId]);

  const update = <K extends keyof Settings>(key: K, nextValue: Settings[K]) => setValue(current => ({ ...current, [key]: nextValue }));
  const save = async () => {
    if (saving) return;
    if ((date && !isoValue(date)) || (open && !isoValue(open)) || (close && !isoValue(close)) || (earlyEnd && !isoValue(earlyEnd))) {
      toast.error("Enter valid event and sales dates.");
      return;
    }
    if (open && close && new Date(open).getTime() >= new Date(close).getTime()) {
      toast.error("Ticket sales must close after they open.");
      return;
    }
    if (value.early_bird_price !== null && (!value.early_bird_currency || !/^[A-Z]{3}$/.test(value.early_bird_currency) || !value.early_bird_capacity || !earlyEnd)) {
      toast.error("Early-bird pricing requires a currency, end date and ticket capacity.");
      return;
    }
    setSaving(true);
    try {
      const body = { screeningId, screeningDate: isoValue(date), eventTimezone: value.event_timezone, salesOpenAt: isoValue(open), salesCloseAt: isoValue(close), earlyBirdPrice: value.early_bird_price, earlyBirdCurrency: value.early_bird_price === null ? null : value.early_bird_currency, earlyBirdEndsAt: isoValue(earlyEnd), earlyBirdCapacity: value.early_bird_price === null ? null : value.early_bird_capacity, eventVisibility: value.event_visibility, inviteOnly: value.invite_only, presaleEnabled: value.presale_enabled, settlementHoldHours: value.settlement_hold_hours };
      const { data, error } = await supabase.functions.invoke("manage-event-settings", { body });
      const response = z.object({ success: z.boolean(), error: z.string().optional() }).safeParse(data);
      if (error || !response.success || !response.data.success) {
        toast.error(response.success ? response.data.error || "Event settings could not be saved." : "Event settings returned an invalid response.");
        return;
      }
      toast.success("Event schedule and ticket settings saved.");
    } catch {
      toast.error("Event settings could not be saved.");
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  return <details className="mt-4 rounded-lg border border-border/70 p-3">
    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium"><CalendarClock className="h-4 w-4" /> Schedule, presales and access <Badge variant="secondary">{value.presale_enabled ? "Presales enabled" : "Presales off"}</Badge></summary>
    {loading ? <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div> : <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="space-y-1"><Label>Event date and time</Label><Input type="datetime-local" value={date} onChange={event => setDate(event.target.value)} /></div>
      <div className="space-y-1"><Label>Event timezone (IANA)</Label><Input value={value.event_timezone} onChange={event => update("event_timezone", event.target.value)} placeholder="Africa/Lagos" /></div>
      <div className="space-y-1"><Label>Ticket sales open</Label><Input type="datetime-local" value={open} onChange={event => setOpen(event.target.value)} /></div>
      <div className="space-y-1"><Label>Ticket sales close</Label><Input type="datetime-local" value={close} onChange={event => setClose(event.target.value)} /></div>
      <div className="space-y-1"><Label>Early-bird price</Label><Input type="number" min="0" step="0.01" value={value.early_bird_price ?? ""} onChange={event => update("early_bird_price", event.target.value === "" ? null : Number(event.target.value))} placeholder="Leave empty to disable" /></div>
      <div className="space-y-1"><Label>Early-bird currency</Label><Input maxLength={3} value={value.early_bird_currency || ""} onChange={event => update("early_bird_currency", event.target.value.toUpperCase())} placeholder="NGN" /></div>
      <div className="space-y-1"><Label>Early-bird ends</Label><Input type="datetime-local" value={earlyEnd} onChange={event => setEarlyEnd(event.target.value)} /></div>
      <div className="space-y-1"><Label>Early-bird ticket capacity</Label><Input type="number" min="1" step="1" value={value.early_bird_capacity ?? ""} onChange={event => update("early_bird_capacity", event.target.value === "" ? null : Number(event.target.value))} placeholder="Maximum discounted tickets" /></div>
      <div className="space-y-1"><Label>Event discovery</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={value.event_visibility} onChange={event => { const parsed = z.enum(["public", "unlisted", "private"]).safeParse(event.target.value); if (parsed.success) update("event_visibility", parsed.data); }}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></div>
      <div className="space-y-1"><Label>Creator settlement hold</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={value.settlement_hold_hours} onChange={event => { const parsed = z.union([z.literal("24"), z.literal("48"), z.literal("72")]).safeParse(event.target.value); if (parsed.success) { const hours = { "24": 24, "48": 48, "72": 72 } as const; update("settlement_hold_hours", hours[parsed.data]); } }}><option value="24">24 hours</option><option value="48">48 hours (default)</option><option value="72">72 hours</option></select></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.presale_enabled} onChange={event => update("presale_enabled", event.target.checked)} /> Enable advance ticket sales</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.invite_only} onChange={event => update("invite_only", event.target.checked)} /> Invite-only access</label>
      <div className="sm:col-span-2"><Button onClick={save} disabled={saving} size="sm"><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save event settings"}</Button></div>
    </div>}
  </details>;
}