import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TicketCheck } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function EventInviteAccept() {
  usePageTitle("Accept event invitation");
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { user, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const requestInFlight = useRef(false);

  useEffect(() => {
    if (!user || !token || accepted || requestInFlight.current) return;
    let active = true;
    requestInFlight.current = true;
    setBusy(true);
    supabase.functions.invoke("manage-event-invites", { body: { action: "accept", token } })
      .then(({ data, error: invokeError }) => {
        if (!active) return;
        if (invokeError || !data?.success) setError(data?.error || invokeError?.message || "This invitation could not be accepted.");
        else setAccepted(true);
      })
      .finally(() => { requestInFlight.current = false; if (active) setBusy(false); });
    return () => { active = false; };
  }, [user?.id, token, accepted, attempt]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    setError("");
  };

  if (!token) return <main className="grid min-h-screen place-items-center p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Invitation link is invalid</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">This invitation link is missing its secure token.</p><Button asChild className="mt-4"><Link to="/">Return home</Link></Button></CardContent></Card></main>;

  return <main className="grid min-h-screen place-items-center bg-background p-4">
    <Card className="w-full max-w-md">
      <CardHeader><div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><TicketCheck className="h-6 w-6 text-primary" /></div><CardTitle>{accepted ? "Invitation accepted" : "You are invited to a private DeGameTV event"}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {authLoading || busy ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {accepted ? "Invitation accepted." : "Checking your invitation…"}</div> : accepted ? <><p className="text-sm text-muted-foreground">Your invitation is now linked to your DeGameTV account. You can find the private event in your invitations.</p><Button asChild className="w-full"><Link to="/dashboard?tab=invitations">View my invitations</Link></Button></> : user ? <><p className="text-sm text-destructive">{error || "We could not accept this invitation."}</p><Button onClick={() => { setError(""); setAccepted(false); setAttempt(value => value + 1); }} className="w-full">Try again</Button></> : <><p className="text-sm text-muted-foreground">Sign in using the email address that received this invitation.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<form onSubmit={login} className="space-y-3"><Input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Invitation email" /><Input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" /><Button type="submit" disabled={busy} className="w-full">Sign in and accept invitation</Button></form><p className="text-center text-xs text-muted-foreground">Need an account? <Link className="underline" to={"/auth?redirectTo="+encodeURIComponent(window.location.pathname+window.location.search)}>Create one, then reopen this invitation.</Link></p></>}
      </CardContent>
    </Card>
  </main>;
}