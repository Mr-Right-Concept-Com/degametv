import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Loader2, MailPlus, RefreshCw, UserRoundX } from "lucide-react";

type InviteRow = { id: string; invited_email: string; invite_role: string; status: string; expires_at: string | null; accepted_at: string | null; created_at: string };

export function EventInvitationsDialog({ screeningId, title }: { screeningId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("guest");
  const [expiresAt, setExpiresAt] = useState("");
  const [invitations, setInvitations] = useState<InviteRow[]>([]);
  const [latestUrl, setLatestUrl] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-event-invitations", { body: { action: "list", screeningId } });
    if (error || !data?.success) toast.error(data?.error || "Invitations could not be loaded.");
    else setInvitations(Array.isArray(data.invitations) ? data.invitations : []);
    setLoading(false);
  };

  const create = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { toast.error("Enter a valid guest email."); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-event-invitations", {
      body: { action: "create", screeningId, email: email.trim(), role, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null },
    });
    if (error || !data?.success) toast.error(data?.error || "Invitation could not be created.");
    else {
      setLatestUrl(typeof data.inviteUrl === "string" ? data.inviteUrl : "");
      setEmail("");
      toast.success(data.emailSent ? "Invitation created and email sent." : "Invitation created. Email delivery is pending; copy the private link.");
      await load();
    }
    setBusy(false);
  };

  const revoke = async (inviteId: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-event-invitations", { body: { action: "revoke", screeningId, inviteId } });
    if (error || !data?.success) toast.error(data?.error || "Invitation could not be revoked.");
    else { toast.success("Invitation revoked."); await load(); }
    setBusy(false);
  };

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); toast.success("Private invitation link copied."); }
    catch { toast.error("Clipboard is unavailable. Copy the link manually."); }
  };

  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) void load(); }}>
    <DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-full h-8 text-xs"><MailPlus className="mr-1 h-3 w-3"/>Invitations</Button></DialogTrigger>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Private screening invitations</DialogTitle><DialogDescription>Invite press, reviewers, VIP guests, crew and selected viewers to {title}. Invitation links are private and email-bound.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <div className="space-y-1"><Label htmlFor={"invite-email-"+screeningId}>Guest email</Label><Input id={"invite-email-"+screeningId} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="guest@example.com"/></div>
          <div className="space-y-1"><Label>Guest category</Label><Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="guest">Guest</SelectItem><SelectItem value="press">Press</SelectItem><SelectItem value="reviewer">Reviewer</SelectItem><SelectItem value="vip">VIP</SelectItem><SelectItem value="crew">Crew</SelectItem></SelectContent></Select></div>
        </div>
        <div className="space-y-1"><Label>Invitation expiry (optional)</Label><Input type="datetime-local" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)}/></div>
        <Button onClick={create} disabled={busy || !email.trim()} className="w-full">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MailPlus className="mr-2 h-4 w-4"/>}Create invitation</Button>
        {latestUrl && <div className="flex items-center gap-2 rounded-xl border p-3"><p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{latestUrl}</p><Button size="sm" variant="outline" onClick={()=>void copy(latestUrl)}><Copy className="mr-1 h-3 w-3"/>Copy</Button></div>}
        <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Guest list ({invitations.length})</h3><Button size="sm" variant="ghost" onClick={()=>void load()} disabled={loading}><RefreshCw className={"h-4 w-4 "+(loading?"animate-spin":"")}/></Button></div>
        {loading ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin"/></div> : invitations.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">No invitations created yet.</p> :
          <div className="space-y-2">{invitations.map(invite=><div key={invite.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{invite.invited_email}</p><div className="mt-1 flex flex-wrap items-center gap-2"><Badge variant="outline" className="capitalize">{invite.invite_role}</Badge><Badge variant={invite.status==="accepted"?"default":"secondary"} className="capitalize">{invite.status}</Badge>{invite.expires_at && <span className="text-[11px] text-muted-foreground">Expires {new Date(invite.expires_at).toLocaleString()}</span>}</div></div>
            {invite.status!=="revoked" && <Button size="icon" variant="ghost" aria-label={"Revoke invitation for "+invite.invited_email} disabled={busy} onClick={()=>void revoke(invite.id)}><UserRoundX className="h-4 w-4"/></Button>}
          </div>)}</div>}
      </div>
    </DialogContent>
  </Dialog>;
}
