import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, RefreshCw, UserPlus, X } from "lucide-react";

type Invite = {
  id: string;
  invited_email: string;
  invite_role: "guest" | "press" | "reviewer" | "vip" | "crew";
  status: "pending" | "sent" | "accepted" | "revoked" | "expired";
  expires_at: string | null;
  accepted_at: string | null;
};

export function EventInvitations({ screeningId }: { screeningId: string }) {
  const [items, setItems] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Invite["invite_role"]>("guest");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("manage-event-invites", {
      body: { action: "list", screeningId },
    });
    if (error || !data) {
      toast.error("Could not load event invitations.");
      return;
    }
    setItems((data.invitations || []) as Invite[]);
  }, [screeningId]);

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [refresh]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-event-invites", {
      body: { action: "create", screeningId, email: email.trim(), role },
    });
    setBusy(false);
    if (error || !data?.success) {
      toast.error(data?.error || "Invitation could not be sent.");
      return;
    }
    toast.success(data.delivery === "sent" ? "Invitation sent." : "Invitation saved for delivery retry.");
    setEmail("");
    await refresh();
  };

  const revoke = async (inviteId: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-event-invites", {
      body: { action: "revoke", screeningId, inviteId },
    });
    setBusy(false);
    if (error || !data?.success) {
      toast.error(data?.error || "Invitation could not be revoked.");
      return;
    }
    toast.success("Invitation revoked.");
    await refresh();
  };

  return (
    <details className="mt-4 rounded-lg border border-border/70 p-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
        <Mail className="h-4 w-4" /> Private screening invitations
        <Badge variant="secondary">{items.length}</Badge>
      </summary>
      <form onSubmit={create} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="Invite by email address" aria-label="Invitee email" />
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={e => setRole(e.target.value as Invite["invite_role"])} aria-label="Invitation category">
          <option value="guest">Guest</option><option value="press">Press</option><option value="reviewer">Reviewer</option><option value="vip">VIP</option><option value="crew">Crew</option>
        </select>
        <Button type="submit" disabled={busy || !email.trim()} size="sm"><UserPlus className="mr-2 h-4 w-4" /> Invite</Button>
      </form>
      <div className="mt-3 space-y-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : items.length === 0 ? <p className="text-xs text-muted-foreground">No invitations have been issued.</p> : items.map(invite => (
          <div key={invite.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
            <div className="min-w-0"><p className="truncate font-medium">{invite.invited_email}</p><p className="text-muted-foreground">{invite.invite_role} · {invite.expires_at ? "Expires " + new Date(invite.expires_at).toLocaleDateString() : "No expiry"}</p></div>
            <div className="flex items-center gap-2"><Badge variant={invite.status === "accepted" ? "default" : invite.status === "revoked" || invite.status === "expired" ? "destructive" : "secondary"}>{invite.status}</Badge>{["pending","sent","accepted"].includes(invite.status) && <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={busy} onClick={() => revoke(invite.id)} aria-label={"Revoke invitation for " + invite.invited_email}><X className="h-4 w-4" /></Button>}</div>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => void refresh()}><RefreshCw className="mr-2 h-3 w-3" /> Refresh</Button>
    </details>
  );
}