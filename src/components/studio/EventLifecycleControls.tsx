import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Settings2, Loader2 } from 'lucide-react';

interface Props { screeningId: string; lifecycle: string; onDone: () => void }

export function EventLifecycleControls({ screeningId, lifecycle, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState(lifecycle === 'cancelled' ? 'archived' : lifecycle);
  const [ngn, setNgn] = useState('2500');
  const [usd, setUsd] = useState('5');
  const [hours, setHours] = useState('48');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (action === 'cancel' && !confirm('Cancel this event and refund every ticket buyer? This cannot be undone.')) return;
    setBusy(true);
    const body: Record<string, unknown> = { screeningId, action };
    if (action === 'replay') Object.assign(body, { replayPriceNgn: +ngn, replayPriceUsd: +usd, replayAccessHours: parseInt(hours) });
    if (action === 'cancel') body.reason = reason || undefined;
    const { data, error } = await supabase.functions.invoke('manage-event', { body });
    setBusy(false);
    if (error || data?.error) return toast.error(typeof data?.error === 'string' ? data.error : 'Update failed');
    toast.success(action === 'cancel' ? `Event cancelled · ${data.refunded} ticket(s) refunded` : `Event is now ${action}`);
    setOpen(false); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full h-8 text-xs" disabled={lifecycle === 'cancelled'}>
          <Settings2 className="w-3 h-3 mr-1" /> Lifecycle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Event lifecycle</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Stage</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming (countdown + waitlist)</SelectItem>
                <SelectItem value="live">Live / Premiering</SelectItem>
                <SelectItem value="replay">Replay (on-demand)</SelectItem>
                <SelectItem value="archived">Archived / Ended</SelectItem>
                <SelectItem value="cancel">Cancel event & refund all</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {action === 'replay' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1"><Label htmlFor="rn">Price ₦</Label><Input id="rn" type="number" min={0} value={ngn} onChange={e => setNgn(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="ru">Price $</Label><Input id="ru" type="number" min={0} value={usd} onChange={e => setUsd(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="rh">Access hrs</Label><Input id="rh" type="number" min={1} max={720} value={hours} onChange={e => setHours(e.target.value)} /></div>
            </div>
          )}
          {action === 'cancel' && (
            <div className="space-y-1"><Label htmlFor="rr">Reason (sent to buyers)</Label><Input id="rr" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={run} disabled={busy} variant={action === 'cancel' ? 'destructive' : 'default'} className="rounded-full">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
