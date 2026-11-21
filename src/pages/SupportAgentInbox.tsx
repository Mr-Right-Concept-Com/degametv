import { useCallback, useEffect, useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { getSupportAgent, listSupportMessages, listSupportTickets, claimSupportTicket, updateSupportTicket, insertSupportMessage, listSupportSlaEscalationEvents, type SupportSlaEscalationEvent, type SupportTicket, type SupportMessage, type SupportStatus } from '@/integrations/supabase/support';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { CheckCheck, Loader2, MessageSquare, Send, ShieldAlert, UserRoundCheck, Paperclip } from 'lucide-react';

type DisplayMessage = SupportMessage & { attachmentUrls: string[] };
const statuses: SupportStatus[] = ['open','awaiting_support','awaiting_user','in_progress','escalated','resolved','closed'];
export default function SupportAgentInbox() {
  const { user } = useAuth();
  usePageTitle('Support Inbox');
  const [active, setActive] = useState<boolean | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [escalations,setEscalations]=useState<SupportSlaEscalationEvent[]>([]);
  const [filter, setFilter] = useState('open');
  const [reply, setReply] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [internal, setInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const ticketRequest = useRef(0);
  const messageRequest = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; ticketRequest.current += 1; messageRequest.current += 1; };
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const requestId = ++ticketRequest.current;
    try {
      const agent = await getSupportAgent(user.id);
      if (!mounted.current || requestId !== ticketRequest.current) return;
      setActive(Boolean(agent?.is_active));
      if (!agent?.is_active) return;
      const options = filter === 'mine' ? { assignedTo: user.id } :
        filter === 'chat' ? { channel: 'live_chat', statuses: ['open','awaiting_support','in_progress','escalated'] } :
        filter === 'open' ? { statuses: ['open','awaiting_support','in_progress','escalated'] } :
        filter === 'all' ? {} : { status: filter };
      const rows = await listSupportTickets(options);
      if (mounted.current && requestId === ticketRequest.current) setTickets(rows);
    } catch (error: unknown) {
      if (mounted.current && requestId === ticketRequest.current) toast.error(error instanceof Error ? error.message : 'Unable to load support queue.');
    } finally {
      if (mounted.current && requestId === ticketRequest.current) setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!user || active !== true) return;
    const channel = supabase.channel('support-agent-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => { void load(); })
      .subscribe((status) => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') toast.error('Live queue updates disconnected. Refresh to see new requests.'); });
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, active, load]);

  const loadMessages = useCallback(async (ticket: SupportTicket) => {
    const requestId = ++messageRequest.current;
    setSelected(ticket);
    setMessages([]);
    void listSupportSlaEscalationEvents(ticket.id,50).then(setEscalations).catch((error:unknown)=>toast.error(error instanceof Error?error.message:'SLA audit history could not be loaded.'));
    try {
      const rows = await listSupportMessages(ticket.id, true);
      const withUrls = await Promise.all(rows.map(async (message) => {
        const signed = await Promise.all(message.attachment_paths.map(async (path) => {
          const { data, error } = await supabase.storage.from('support-attachments').createSignedUrl(path, 600);
          if (error) { toast.error('A support attachment could not be opened.'); return null; }
          return data.signedUrl;
        }));
        return { ...message, attachmentUrls: signed.filter((url): url is string => Boolean(url)) };
      }));
      if (mounted.current && requestId === messageRequest.current) setMessages(withUrls);
    } catch (error: unknown) {
      if (mounted.current && requestId === messageRequest.current) toast.error(error instanceof Error ? error.message : 'Unable to load conversation.');
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    const ticketId = selected.id;
    const channel = supabase.channel('support-agent-ticket-' + ticketId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: 'ticket_id=eq.' + ticketId }, () => {
        const current = selected;
        if (current?.id === ticketId) void loadMessages(current);
      }).subscribe((status) => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') toast.error('Conversation live updates disconnected.'); });
    return () => { void supabase.removeChannel(channel); };
  }, [selected?.id, loadMessages]);

  const claim = async (ticket: SupportTicket) => {
    if (!user) return;
    try {
      await claimSupportTicket(ticket.id, user.id);
      toast.success('Request assigned to you.');
      await load();
      await loadMessages({ ...ticket, assigned_agent_id: user.id, status: 'in_progress' });
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'This request may already be assigned.'); }
  };
  const changeStatus = async (status: string) => {
    if (!selected || !user || !statuses.includes(status as SupportStatus)) return;
    try {
      await updateSupportTicket(selected.id, user.id, status as SupportStatus);
      const updated = { ...selected, status };
      setSelected(updated);
      await load();
      toast.success('Ticket status updated.');
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Unable to update ticket.'); }
  };
  const send = async () => {
    if (!user || !selected || (!reply.trim() && !attachment)) return;
    if (selected.assigned_agent_id !== user.id) { toast.error('Claim this ticket before replying.'); return; }
    setSending(true);
    let uploadedPath: string | null = null;
    try {
      if (attachment) {
        if (attachment.size > 15 * 1024 * 1024 || !['image/jpeg','image/png','image/webp','application/pdf','text/plain'].includes(attachment.type)) throw new Error('Attach a JPG, PNG, WebP, PDF or text file up to 15 MB.');
        const safeName = attachment.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-150);
        uploadedPath = selected.id + '/' + user.id + '/' + crypto.randomUUID() + '-' + safeName;
        const { error } = await supabase.storage.from('support-attachments').upload(uploadedPath, attachment, { contentType: attachment.type, upsert: false });
        if (error) throw error;
      }
      await insertSupportMessage({ ticketId: selected.id, senderId: user.id, body: reply.trim() || 'Attachment sent.', internal, attachmentPaths: uploadedPath ? [uploadedPath] : [] });
      setReply(''); setAttachment(null);
      toast.success(internal ? 'Internal note added.' : 'Reply sent.');
      await loadMessages(selected); await load();
    } catch (error: unknown) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from('support-attachments').remove([uploadedPath]);
        if (cleanupError) toast.error('Message failed and its uploaded attachment could not be cleaned up.');
      }
      toast.error(error instanceof Error ? error.message : 'Message could not be sent.');
    } finally { if (mounted.current) setSending(false); }
  };

  if (active === false) return <MainLayout><div className="mx-auto max-w-xl px-4 py-20 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground"/><h1 className="mt-4 text-xl font-bold">Support agent access required</h1><p className="mt-2 text-sm text-muted-foreground">This area is available only to active support agents.</p></div></MainLayout>;
  return <MainLayout><div className="mx-auto max-w-7xl space-y-5 px-4 py-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold tracking-widest text-primary">DEGAMETV OPERATIONS</p><h1 className="text-2xl font-bold">Support inbox</h1><p className="text-sm text-muted-foreground">Claim requests, respond to users and manage resolutions.</p></div><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-48"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="open">Open queue</SelectItem><SelectItem value="chat">Live chat</SelectItem><SelectItem value="mine">Assigned to me</SelectItem><SelectItem value="all">All requests</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>
    <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <Card><CardHeader><CardTitle className="text-base">Queue <Badge variant="secondary">{tickets.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-2">{loading ? <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></div> : tickets.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No requests in this queue.</p> : tickets.map(ticket => <button key={ticket.id} onClick={() => void loadMessages(ticket)} className={`w-full rounded-xl border p-3 text-left ${selected?.id === ticket.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">#{ticket.ticket_number} · {ticket.subject}</span><Badge variant={ticket.priority === 'urgent' || ticket.priority === 'high' ? 'destructive' : 'secondary'}>{ticket.priority}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{ticket.channel} · {ticket.category.replaceAll('_',' ')} · {ticket.status.replaceAll('_',' ')}</p><p className="mt-1 text-[11px] text-muted-foreground">{ticket.assigned_agent_id === user?.id ? 'Assigned to you' : ticket.assigned_agent_id ? 'Assigned to another agent' : 'Unassigned'} · {new Date(ticket.last_message_at ?? ticket.created_at).toLocaleString()}</p></button>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4"/>{selected ? '#' + selected.ticket_number + ' · ' + selected.subject : 'Conversation'}</CardTitle></CardHeader><CardContent className="space-y-3">{!selected ? <p className="py-12 text-center text-sm text-muted-foreground">Select a support request to view its conversation.</p> : <>
        <div className="rounded-lg bg-muted/50 p-3 text-sm">{selected.description}</div>
        <div className="grid gap-2 sm:grid-cols-2"><div className="rounded-lg border p-3 text-xs"><p className="font-semibold">First response deadline</p><p>{selected.first_response_due_at?new Date(selected.first_response_due_at).toLocaleString():'Not set'}</p><Badge variant={selected.first_response_due_at&&new Date(selected.first_response_due_at).getTime()<Date.now()?'destructive':'secondary'}>{selected.first_response_due_at&&new Date(selected.first_response_due_at).getTime()<Date.now()?'Overdue':'Within target'}</Badge></div><div className="rounded-lg border p-3 text-xs"><p className="font-semibold">Resolution deadline</p><p>{selected.resolution_due_at?new Date(selected.resolution_due_at).toLocaleString():'Not set'}</p><Badge variant={selected.resolution_due_at&&new Date(selected.resolution_due_at).getTime()<Date.now()&&!['resolved','closed'].includes(selected.status)?'destructive':'secondary'}>{selected.resolution_due_at&&new Date(selected.resolution_due_at).getTime()<Date.now()&&!['resolved','closed'].includes(selected.status)?'Overdue':'Within target'}</Badge></div></div>
        <div className="rounded-lg border p-3"><p className="mb-2 text-sm font-semibold">SLA escalation history</p>{escalations.length?escalations.map(event=><p key={event.id} className="text-xs text-muted-foreground">{event.breach_type.replace('_',' ')} · {new Date(event.escalated_at).toLocaleString()} · previous status {event.previous_status}</p>):<p className="text-xs text-muted-foreground">No escalation events recorded for this ticket.</p>}</div>
        {selected.assigned_agent_id !== user?.id && <Button size="sm" onClick={() => void claim(selected)} disabled={Boolean(selected.assigned_agent_id)}><UserRoundCheck className="mr-2 h-4 w-4"/>Claim request</Button>}
        <div className="flex flex-wrap gap-2"><Select value={selected.status} onValueChange={changeStatus}><SelectTrigger className="w-44"><SelectValue/></SelectTrigger><SelectContent>{statuses.map(status => <SelectItem key={status} value={status}>{status.replaceAll('_',' ')}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" onClick={() => void changeStatus('resolved')}><CheckCheck className="mr-2 h-4 w-4"/>Resolve</Button></div>
        <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-lg border p-3">{messages.map(message => <div key={message.id} className={`max-w-[90%] rounded-xl p-3 text-sm ${message.is_internal ? 'mx-auto border border-amber-500/40 bg-amber-500/10' : message.sender_id === user?.id ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}><p>{message.is_internal ? 'Internal note · ' : ''}{message.body}</p>{message.attachmentUrls.map((url,index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block underline text-xs">Attachment {index+1}</a>)}<p className="mt-1 text-[10px] opacity-70">{new Date(message.created_at).toLocaleString()}</p></div>)}</div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={internal} onChange={event => setInternal(event.target.checked)}/>Internal note (not visible to the user)</label>
        <div className="flex flex-wrap gap-2"><Input value={reply} onChange={event => setReply(event.target.value)} maxLength={12000} placeholder={internal ? 'Add internal note…' : 'Reply to user…'} disabled={selected.assigned_agent_id !== user?.id} className="min-w-0 flex-1"/><label className="flex h-10 cursor-pointer items-center gap-1 rounded-md border px-3 text-xs"><Paperclip className="h-4 w-4"/>{attachment ? attachment.name.slice(0,16) : 'Attach'}<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={event => setAttachment(event.target.files?.[0] ?? null)} disabled={selected.assigned_agent_id !== user?.id}/></label><Button onClick={() => void send()} disabled={sending || (!reply.trim() && !attachment) || selected.assigned_agent_id !== user?.id}>{sending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}</Button></div>
      </>}</CardContent></Card>
    </div>
  </div></MainLayout>;
}