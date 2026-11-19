import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, Ticket, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";

type Invitation = {
  invitation: { role: string; status: string; expiresAt: string | null };
  event: { title: string; slug: string; description: string | null; startsAt: string | null; eventType: string; accessModel: string; basePrice: number | null; baseCurrency: string | null; salesOpenAt: string | null; salesCloseAt: string | null };
  emailMatch: boolean;
  signInRequired: boolean;
};

export default function InviteLanding() {
  const { token = "" } = useParams<{ token: string }>();
  const { user } = useAuth();
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  usePageTitle(invite?.event.title ? "Private invitation — " + invite.event.title : "Private screening invitation");

  useEffect(() => {
    let active = true;
    void supabase.functions.invoke("manage-event-invitations", { body: { action: "inspect", token } })
      .then(({ data, error: invokeError }) => {
        if (!active) return;
        if (invokeError || !data?.success) setError(data?.error || invokeError?.message || "This invitation is unavailable.");
        else setInvite(data as Invitation);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const emailMatches = Boolean(user?.email && invite?.emailMatch);
  const ticketUrl = invite ? "/buy/" + encodeURIComponent(invite.event.slug) + "?inviteToken=" + encodeURIComponent(token) : "#";

  return <MainLayout>
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-12">
      <Card className="w-full rounded-[1.75rem] border-border/70 shadow-xl">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><Lock className="h-6 w-6 text-primary"/></div>
          <CardTitle className="text-2xl">Private screening invitation</CardTitle>
          <CardDescription>This invitation is private and linked to the email address selected by the event creator.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin"/></div>
          : error ? <div className="space-y-4"><p className="text-sm text-destructive">{error}</p><Button asChild variant="outline"><Link to="/cinema">Browse DeGameTV</Link></Button></div>
          : invite ? <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="capitalize">{invite.invitation.role}</Badge><Badge variant="outline">Invitation {invite.invitation.status}</Badge></div>
            <div><h2 className="text-xl font-semibold">{invite.event.title}</h2>{invite.event.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{invite.event.description}</p>}</div>
            {invite.event.startsAt && <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4"/>{new Date(invite.event.startsAt).toLocaleString()}</p>}
            {!user ? <div className="rounded-xl bg-secondary/70 p-4 text-sm">Continue using the email address the creator invited. You can sign in or purchase as a guest with that exact email.</div>
            : !emailMatches ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">The signed-in account email does not match this invitation. Sign in with the invited email address to continue.</div>
            : <div className="rounded-xl bg-secondary/70 p-4 text-sm">Your account email matches this invitation. Ticket purchase and access will remain bound to this invited address.</div>}
            {invite.event.accessModel === "FREE"
              ? <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">This is a complimentary invitation. The event access pass must be issued through the creator's screening workflow; this page will not pretend an invitation alone is a playback ticket.</div>
              : <Button className="w-full" disabled={Boolean(user && !emailMatches)} asChild><Link to={ticketUrl}><Ticket className="mr-2 h-4 w-4"/>Continue to invited ticket checkout</Link></Button>}
          </div> : null}
        </CardContent>
      </Card>
    </main>
  </MainLayout>;
}
