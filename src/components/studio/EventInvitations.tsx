import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, RefreshCw, UserPlus, X } from "lucide-react";

const inviteSchema = z.object({
  id: z.string().uuid(),
  invited_email: z.string().email(),
  invite_role: z.enum(["guest", "press", "reviewer", "vip", "crew"]),
  status: z.enum(["pending", "sent", "accepted", "revoked", "expired"]),
  expires_at: z.string().nullable(),
  accepted_at: z.string().nullable(),
});
type Invite = z.infer<typeof inviteSchema>;
const listResponseSchema = z.object({ invitations: z.array(inviteSchema) });
const actionResponseSchema = z.object({ success: z.boolean(), error: z.string().optional(), delivery: z.enum(["sent", "queued"]).optional() });

export function EventInvitations({ screeningId }: { screeningId: string }) {
  const [items, setItems] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Invite["invite_role"]>("guest");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const requestGeneration = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++requestGeneration.current;
    try {
      const { data, error } = await supabase.functions.invoke("manage-event-invites", { body: { action: "list", screeningId } });
      if (!mounted.current || generation !== requestGeneration.current) return;
      const parsed = listResponseSchema.safeParse(data);
      if (error || !parsed.success) {
        toast.error("Could not load event invitations.");
        return;
      }
      setItems(parsed.data.invitations);
    } catch {
      if (mounted.current && generation === requestGeneration.current) toast.error("Could not load event invitations.");
    } finally {
      if (mounted.current && generation === requestGeneration.current) setLoading(false);
    }
  }, [screeningId]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    void refresh();
    return () => {
      mounted.current = false;
      requestGeneration.current += 1;
    };
  }, [refresh]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-event-invites", { body: { action: "create", screeningId, email: email.trim(), role } });
      const parsed = actionResponseSchema.safeParse(data);
      if (error || !parsed.success || !parsed.data.success) {
        toast.error(parsed.success ? parsed.data.error || "Invitation could not be sent." : "Invitation service returned an invalid response.");
        return;
      }
      toast.success(parsed.data.delivery === "sent" ? "Invitation sent." : "Invitation saved for delivery retry.");
      if (mounted.current) setEmail("");
      await refresh();
    } catch {
      toast.error("Invitation could not be sent.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const revoke = async (inviteId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-event-invites", { body: { action: "revoke", screeningId, inviteId } });
      const parsed = actionResponseSchema.safeParse(data);
      if (error || !parsed.success || !parsed.data.success) {
        toast.error(parsed.success ? parsed.data.error || "Invitation could not be revoked." : "Invitation service returned an invalid response.");
        return;
      }
      toast.success("Invitation revoked.");
      await refresh();
    } catch {
      toast.error("Invitation could not be revoked.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <details className="mt-4 rounded-lg border border-border/70 p-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium"><Mail className="h-4 w-4" /> Private screening invitations <Badge variant="secondary">{items.length}</Badge></summary>
      <form onSubmit={create} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="Invite by email address" aria-label="Invitee email" />
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={event => { const parsed = inviteSchema.shape.invite_role.safeParse(event.target.value); if (parsed.success) setRole(parsed.data); }} aria-label="Invitation category">
          <option value="guest">Guest</option><option value="press">Press</option><option value="reviewer">Reviewer</option><option value="vip">VIP</option><option value="crew">Crew</option>
        </select>
        <Button type="submit" disabled={busy || !email.trim()} size="sm"><UserPlus className="mr-2 h-4 w-4" /> Invite</Button>
      </form>
      <div className="mt-3 space-y-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : items.length === 0 ? <p className="text-xs text-muted-foreground">No invitations have been issued.</p> : items.map(invite => (
          <div key={invite.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
            <div className="min-w-0"><p className="truncate font-medium">{invite.invited_email}</p><p className="text-muted-foreground">{invite.invite_role} · {invite.expires_at ? "Expires " + new Date(invite.expires_at).toLocaleDateString() : "No expiry"}</p></div>
            <div className="flex items-center gap-2"><Badge variant={invite.status === "accepted" ? "default" : invite.status === "revoked" || invite.status === "expired" ? "destructive" : "secondary"}>{invite.status}</Badge>{["pending", "sent", "accepted"].includes(invite.status) && <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={busy} onClick={() => void revoke(invite.id)} aria-label={"Revoke invitation for " + invite.invited_email}><X className="h-4 w-4" /></Button>}</div>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => void refresh()}><RefreshCw className="mr-2 h-3 w-3" /> Refresh</Button>
    </details>
  );
}