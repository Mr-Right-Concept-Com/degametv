import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { getSupportAgent, listSupportTickets, listSupportMessages, listSupportArticles, createSupportTicket, createSupportChat, reopenSupportTicket, rateSupportTicket, insertSupportMessage, type SupportTicket, type SupportMessage, type SupportArticle } from '@/integrations/supabase/support';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BookOpen, LifeBuoy, MessageCircle, Plus, Search, Send, TicketCheck, Paperclip, Star, RotateCcw } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

type DisplayMessage = SupportMessage & { attachmentUrls: string[] };
const categories = [
  ['account','Account'],['payments','Payments'],['wallet','Wallet'],['tickets','Tickets'],
  ['playback','Playback'],['live_streaming','Live streaming'],['creator_studio','Creator Studio'],
  ['verification','Verification'],['copyright','Copyright'],['technical','Technical'],['other','Other'],
];
export default function SupportCenter() {
  const { user } = useAuth();
  usePageTitle('Help & Support');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [articles, setArticles] = useState<SupportArticle[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [reply, setReply] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');
  const [isSupportAgent, setIsSupportAgent] = useState(false);
  const mounted = useRef(false);
  const ticketRequest = useRef(0);
  const messageRequest = useRef(0);
  const articleRequest = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      ticketRequest.current += 1;
      messageRequest.current += 1;
      articleRequest.current += 1;
    };
  }, []);

  const loadTickets = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const requestId = ++ticketRequest.current;
    try {
      const rows = await listSupportTickets({ ownerId: user.id, limit: 50 });
      if (mounted.current && requestId === ticketRequest.current) setTickets(rows);
    } catch (error: unknown) {
      if (mounted.current && requestId === ticketRequest.current) toast.error(error instanceof Error ? error.message : 'Unable to load support requests.');
    } finally {
      if (mounted.current && requestId === ticketRequest.current) setLoading(false);
    }
  }, [user]);

  const loadArticles = useCallback(async () => {
    const requestId = ++articleRequest.current;
    try {
      const rows = await listSupportArticles();
      if (mounted.current && requestId === articleRequest.current) setArticles(rows);
    } catch (error: unknown) {
      if (mounted.current && requestId === articleRequest.current) toast.error(error instanceof Error ? error.message : 'Unable to load help articles.');
    }
  }, []);

  useEffect(() => {
    void loadTickets();
    void loadArticles();
    if (!user) { setIsSupportAgent(false); return; }
    let cancelled = false;
    void getSupportAgent(user.id).then(agent => {
      if (!cancelled && mounted.current) setIsSupportAgent(Boolean(agent?.is_active));
    }).catch((error: unknown) => {
      if (!cancelled && mounted.current) toast.error(error instanceof Error ? error.message : 'Unable to verify support access.');
    });
    return () => { cancelled = true; };
  }, [loadTickets, loadArticles, user]);

  const loadMessages = useCallback(async (ticket: SupportTicket) => {
    const requestId = ++messageRequest.current;
    setSelected(ticket);
    setMessages([]);
    try {
      const rows = await listSupportMessages(ticket.id);
      const withUrls = await Promise.all(rows.map(async (message) => {
        const signed = await Promise.all(message.attachment_paths.map(async path => {
          const { data, error } = await supabase.storage.from('support-attachments').createSignedUrl(path, 600);
          if (error) { toast.error('A conversation attachment could not be opened.'); return null; }
          return data.signedUrl;
        }));
        return { ...message, attachmentUrls: signed.filter((url): url is string => Boolean(url)) };
      }));
      if (mounted.current && requestId === messageRequest.current) setMessages(withUrls);
    } catch (error: unknown) {
      if (mounted.current && requestId === messageRequest.current) toast.error(error instanceof Error ? error.message : 'Unable to load this conversation.');
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    const ticketId = selected.id;
    const channel = supabase.channel('support-ticket-' + ticketId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: 'ticket_id=eq.' + ticketId }, () => {
        const current = selected;
        if (current?.id === ticketId) void loadMessages(current);
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') toast.error('Conversation live updates disconnected. Refresh the request to reload messages.');
      });
    return () => { void supabase.removeChannel(channel); };
  }, [selected?.id, loadMessages]);

  const createTicket = async () => {
    if (!user || subject.trim().length < 5 || description.trim().length < 10) {
      toast.error('Enter a subject (at least 5 characters) and details (at least 10 characters).');
      return;
    }
    setCreating(true);
    try {
      const ticket = await createSupportTicket({ userId: user.id, subject: subject.trim(), category, description: description.trim() });
      setSubject(''); setDescription('');
      toast.success('Support request created.');
      await loadTickets();
      await loadMessages(ticket);
      setActiveTab('requests');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Unable to create support request.');
    } finally { if (mounted.current) setCreating(false); }
  };

  const startLiveChat = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const ticket = await createSupportChat();
      await loadTickets();
      await loadMessages(ticket);
      setActiveTab('requests');
      toast.success('Your live support conversation is ready. An agent can join shortly.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Live support is temporarily unavailable. Please create a support request.');
    } finally { if (mounted.current) setCreating(false); }
  };

  const sendReply = async () => {
    if (!user || !selected || (!reply.trim() && !attachment)) return;
    let uploadedPath: string | null = null;
    try {
      if (attachment) {
        if (attachment.size > 15 * 1024 * 1024 || !['image/jpeg','image/png','image/webp','application/pdf','text/plain'].includes(attachment.type)) throw new Error('Attach a JPG, PNG, WebP, PDF or text file up to 15 MB.');
        const safeName = attachment.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-150);
        uploadedPath = selected.id + '/' + user.id + '/' + crypto.randomUUID() + '-' + safeName;
        const { error } = await supabase.storage.from('support-attachments').upload(uploadedPath, attachment, { contentType: attachment.type, upsert: false });
        if (error) throw error;
      }
      await insertSupportMessage({ ticketId: selected.id, senderId: user.id, body: reply.trim() || 'Attachment sent.', internal: false, attachmentPaths: uploadedPath ? [uploadedPath] : [] });
      setReply(''); setAttachment(null);
      await loadMessages(selected);
      await loadTickets();
    } catch (error: unknown) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from('support-attachments').remove([uploadedPath]);
        if (cleanupError) toast.error('Message failed and its uploaded attachment could not be cleaned up.');
      }
      toast.error(error instanceof Error ? error.message : 'Could not send your reply.');
    }
  };

  const reopenTicket = async () => {
    if (!selected) return;
    try {
      await reopenSupportTicket(selected.id);
      const reopened = { ...selected, status: 'open' };
      setSelected(reopened);
      await loadTickets();
      toast.success('Support request reopened.');
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'This request cannot be reopened.'); }
  };

  const rateTicket = async (rating: number) => {
    if (!selected || !Number.isInteger(rating) || rating < 1 || rating > 5) return;
    try {
      await rateSupportTicket(selected.id, rating);
      setSelected({ ...selected, satisfaction_rating: rating });
      await loadTickets();
      toast.success('Thank you for rating your support experience.');
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Your rating could not be saved.'); }
  };

  const filteredArticles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return articles;
    return articles.filter(article => [article.title, article.summary, article.body_markdown].some(value => (value ?? '').toLowerCase().includes(query)));
  }, [articles, search]);

  return <MainLayout>
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-primary font-semibold">DEGAMETV HELP CENTRE</p><h1 className="text-3xl font-bold">How can we help?</h1><p className="text-muted-foreground mt-1">Find answers or contact the support team.</p></div><div className="flex gap-2">{isSupportAgent && <Button asChild variant="outline"><Link to="/support/agent">Agent inbox</Link></Button>}<Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button></div></div>
      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-5 flex items-center gap-3"><LifeBuoy className="h-8 w-8 text-primary"/><div><p className="font-semibold">Support requests</p><p className="text-xs text-muted-foreground">Create and track a request.</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><MessageCircle className="h-8 w-8 text-primary"/><div><p className="font-semibold">Live support chat</p><p className="text-xs text-muted-foreground">Start a realtime conversation with an agent.</p></div></div><Button size="sm" onClick={() => void startLiveChat()} disabled={creating}>{creating ? 'Starting…' : 'Chat now'}</Button></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><BookOpen className="h-8 w-8 text-primary"/><div><p className="font-semibold">Knowledgebase</p><p className="text-xs text-muted-foreground">Search help articles and guides.</p></div></CardContent></Card>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList><TabsTrigger value="requests"><TicketCheck className="h-4 w-4 mr-2"/>My requests</TabsTrigger><TabsTrigger value="new"><Plus className="h-4 w-4 mr-2"/>New request</TabsTrigger><TabsTrigger value="knowledge"><BookOpen className="h-4 w-4 mr-2"/>Knowledgebase</TabsTrigger></TabsList>
        <TabsContent value="requests" className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card><CardHeader><CardTitle className="text-base">Your support requests</CardTitle></CardHeader><CardContent className="space-y-2">{loading ? <p className="text-sm text-muted-foreground">Loading requests…</p> : tickets.length === 0 ? <p className="text-sm text-muted-foreground py-6">You have not opened a support request yet.</p> : tickets.map(ticket => <button key={ticket.id} onClick={() => void loadMessages(ticket)} className={`w-full rounded-xl border p-3 text-left hover:bg-muted/50 ${selected?.id === ticket.id ? 'border-primary bg-primary/5' : 'border-border'}`}><div className="flex items-center justify-between gap-2"><span className="font-medium text-sm">#{ticket.ticket_number} · {ticket.subject}</span><Badge variant="secondary">{ticket.status.replaceAll('_',' ')}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{ticket.category.replaceAll('_',' ')} · {new Date(ticket.created_at).toLocaleDateString()}</p></button>)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">{selected ? `Request #${selected.ticket_number}` : 'Conversation'}</CardTitle></CardHeader><CardContent className="space-y-3">{!selected ? <p className="text-sm text-muted-foreground py-8">Select a request to view its conversation.</p> : <>
            <div className="rounded-xl bg-muted/50 p-3 text-sm">{selected.description}</div>
            {(selected.status === 'resolved' || selected.status === 'closed') && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div><p className="text-sm font-medium">How did we do?</p><p className="text-xs text-muted-foreground">{selected.satisfaction_rating ? 'Thank you for your feedback.' : 'Rate your support experience.'}</p></div>{selected.satisfaction_rating ? <Badge variant="secondary">{selected.satisfaction_rating}/5 <Star className="ml-1 h-3 w-3 fill-current"/></Badge> : <div className="flex items-center gap-1">{[1,2,3,4,5].map(value => <Button key={value} size="icon" variant="ghost" aria-label={`Rate ${value} out of 5`} onClick={() => void rateTicket(value)}><Star className="h-4 w-4"/></Button>)}</div>}<Button size="sm" variant="outline" onClick={() => void reopenTicket()}><RotateCcw className="mr-2 h-4 w-4"/>Reopen request</Button></div>}
            <div className="max-h-80 space-y-3 overflow-y-auto">{messages.map(message => <div key={message.id} className={`max-w-[85%] rounded-xl p-3 text-sm ${message.sender_id === user?.id ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}><p>{message.body}</p>{message.attachmentUrls.map((url,index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block underline text-xs">Attachment {index+1}</a>)}<p className="mt-1 text-[10px] opacity-70">{new Date(message.created_at).toLocaleString()}</p></div>)}</div>
            <div className="flex flex-wrap items-center gap-2"><Input value={reply} onChange={event => setReply(event.target.value)} placeholder="Write a reply…" maxLength={12000} className="min-w-0 flex-1"/><label className="flex h-10 cursor-pointer items-center gap-1 rounded-md border px-3 text-xs"><Paperclip className="h-4 w-4"/>{attachment ? attachment.name.slice(0,18) : 'Attach'}<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={event => setAttachment(event.target.files?.[0] ?? null)}/></label><Button onClick={() => void sendReply()} disabled={!reply.trim() && !attachment}><Send className="h-4 w-4"/></Button></div>
          </>}</CardContent></Card>
        </TabsContent>
        <TabsContent value="new"><Card><CardHeader><CardTitle className="text-base">Create a support request</CardTitle></CardHeader><CardContent className="max-w-2xl space-y-4"><div><label className="text-sm font-medium">Subject</label><Input value={subject} onChange={event => setSubject(event.target.value)} placeholder="Briefly describe the issue" maxLength={180}/></div><div><label className="text-sm font-medium">Category</label><select value={category} onChange={event => setCategory(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">{categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label className="text-sm font-medium">Details</label><textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Tell us what happened and what you expected…" maxLength={10000} className="mt-1 min-h-36 w-full rounded-md border bg-background p-3 text-sm"/></div><Button onClick={() => void createTicket()} disabled={creating}>{creating ? 'Submitting…' : 'Submit request'}</Button></CardContent></Card></TabsContent>
        <TabsContent value="knowledge" className="space-y-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search wallet, tickets, playback, creator tools…"/></div>{filteredArticles.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No published articles match your search yet. You can open a support request instead.</CardContent></Card> : filteredArticles.map(article => <Card key={article.id}><CardHeader><CardTitle className="text-base">{article.title}</CardTitle>{article.summary && <p className="text-sm text-muted-foreground">{article.summary}</p>}</CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-6">{article.body_markdown}</p></CardContent></Card>)}</TabsContent>
      </Tabs>
    </div>
  </MainLayout>;
}
