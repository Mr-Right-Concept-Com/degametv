import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings2, Loader2 } from "lucide-react";

interface Props { screeningId: string; lifecycle: string; onDone: () => void }
const lifecycleResponseSchema = z.object({ success: z.boolean().optional(), error: z.string().optional(), refunded: z.number().int().nonnegative().optional() });

export function EventLifecycleControls({ screeningId, lifecycle, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState(lifecycle === "cancelled" ? "archived" : lifecycle);
  const [ngn, setNgn] = useState("2500");
  const [usd, setUsd] = useState("5");
  const [hours, setHours] = useState("48");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    if (action === "cancel" && !confirm("Cancel this event and refund every ticket buyer? This cannot be undone.")) return;
    if (action === "replay") {
      const valid = z.object({ ngn: z.coerce.number().finite().nonnegative(), usd: z.coerce.number().finite().nonnegative(), hours: z.coerce.number().int().min(1).max(720) }).safeParse({ ngn, usd, hours });
      if (!valid.success) { toast.error("Enter valid replay prices and access duration."); return; }
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { screeningId, action };
      if (action === "replay") Object.assign(body, { replayPriceNgn: Number(ngn), replayPriceUsd: Number(usd), replayAccessHours: Number(hours) });
      if (action === "cancel") body.reason = reason.trim() || undefined;
      const { data, error } = await supabase.functions.invoke("manage-event", { body });
      const parsed = lifecycleResponseSchema.safeParse(data);
      if (error || !parsed.success || parsed.data.success === false || parsed.data.error) {
        toast.error(parsed.success ? parsed.data.error || "Event lifecycle update failed." : "Event lifecycle service returned an invalid response.");
        return;
      }
      if (action === "cancel" && parsed.data.refunded === undefined) {
        toast.error("Cancellation response did not include a verified refund count. Check the event before retrying.");
        return;
      }
      toast.success(action === "cancel" ? `Event cancelled · ${parsed.data.refunded} ticket(s) refunded` : `Event is now ${action}`);
      setOpen(false);
      onDone();
    } catch {
      toast.error("Event lifecycle update could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-full h-8 text-xs" disabled={lifecycle === "cancelled"}><Settings2 className="w-3 h-3 mr-1" /> Lifecycle</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Event lifecycle</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Stage</Label><Select value={action} onValueChange={setAction}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="upcoming">Upcoming (countdown + waitlist)</SelectItem><SelectItem value="live">Live / Premiering</SelectItem><SelectItem value="replay">Replay (on-demand)</SelectItem><SelectItem value="archived">Archived / Ended</SelectItem><SelectItem value="cancel">Cancel event & refund all</SelectItem>
          </SelectContent></Select></div>
          {action === "replay" && <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1"><Label htmlFor="rn">Price ₦</Label><Input id="rn" type="number" min={0} value={ngn} onChange={event => setNgn(event.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="ru">Price $</Label><Input id="ru" type="number" min={0} value={usd} onChange={event => setUsd(event.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="rh">Access hrs</Label><Input id="rh" type="number" min={1} max={720} value={hours} onChange={event => setHours(event.target.value)} /></div>
          </div>}
          {action === "cancel" && <div className="space-y-1"><Label htmlFor="rr">Reason (sent to buyers)</Label><Input id="rr" maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></div>}
        </div>
        <DialogFooter><Button onClick={() => void run()} disabled={busy} variant={action === "cancel" ? "destructive" : "default"} className="rounded-full">{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Apply</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}