import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, TicketCheck, AlertCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function isClaimedResponse(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.claimed === true;
}

export default function LiveGuestClaim() {
  usePageTitle('Claim Event Ticket');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { user, loading: authLoading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    const claim = async () => {
      if (authLoading) return;
      if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
        setMessage('This ticket claim link is invalid.');
        return;
      }
      if (!user) {
        setMessage('Sign in or create an account using the same email address that received this ticket.');
        return;
      }

      setBusy(true);
      try {
        const tokenHash = await sha256(token);
        if (!active) return;
        const { data, error } = await supabase.rpc('claim_live_guest_ticket', { p_token_hash: tokenHash });
        if (!active) return;
        if (error || !isClaimedResponse(data)) {
          setMessage('This ticket could not be claimed. Sign in with the purchase email and try again, or contact support.');
          return;
        }
        setDone(true);
        setMessage('Your ticket is now attached to your account.');
      } catch (cause: unknown) {
        if (!active) return;
        const detail = cause instanceof Error ? cause.message : '';
        setMessage(detail.includes('crypto') || detail.includes('digest')
          ? 'Secure ticket verification is unavailable in this browser. Open this link in a secure browser and try again.'
          : 'This ticket could not be claimed. Please try again or contact support.');
      } finally {
        if (active) setBusy(false);
      }
    };
    void claim();
    return () => { active = false; };
  }, [token, user?.id, authLoading]);

  return <MainLayout><div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-10"><Card className="w-full"><CardContent className="space-y-4 p-8 text-center">{busy ? <Loader2 className="mx-auto h-9 w-9 animate-spin" /> : done ? <TicketCheck className="mx-auto h-10 w-10 text-green-600" /> : <AlertCircle className="mx-auto h-10 w-10 text-primary" />}<h1 className="text-xl font-bold">{done ? 'Ticket claimed' : 'Claim your event ticket'}</h1><p role="status" className="text-sm text-muted-foreground">{message}</p>{!user && !authLoading && <Button asChild className="w-full"><Link to={'/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search)}>Sign in / Create account</Link></Button>}{done && <Button asChild className="w-full"><Link to="/tickets">Open My Tickets</Link></Button>}<Button variant="outline" asChild className="w-full"><Link to="/">Return home</Link></Button></CardContent></Card></div></MainLayout>;
}
