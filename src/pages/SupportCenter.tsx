import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BookOpen, LifeBuoy, MessageCircle, Plus, Search, Send, TicketCheck, Paperclip } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

type SupportTicket = {
  id: string; ticket_number: number; subject: string; category: string;
  priority: string; status: string; description: string; created_at: string; channel?: string;
};
type SupportMessage = { id: string; sender_id: string; body: string; created_at: string; attachment_paths?: string[]; attachmentUrls?: string[] };
type Article = { id: string; slug: string; title: string; summary: string | null; body_markdown: string };

const categories = [
  ['account','Account'],['payments','Payments'],['wallet','Wallet'],['tickets','Tickets'],
  ['playback','Playback'],['live_streaming','Live streaming'],['creator_studio','Creator Studio'],
  ['verification','Verification'],['copyright','Copyright'],['technical','Technical'],['other','Other'],
];

export default function SupportCenter() {
  const { user } = useAuth();
  usePageTitle('Help & Support');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
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

  const loadTickets = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase as any).from('support_tickets')
      .select('id,ticket_number,subject,category,priority,status,description,created_at,channel')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    if (error) toast.error('Unable to load support requests.');
    else setTickets(data || []);
    setLoading(false);
  }, [user]);

  const loadArticles = useCallback(async () => {
    const { data } = await (supabase as any).from('knowledgebase_articles')
      .select('id,slug,title,summary,body_markdown')
      .eq('is_published', true).not('published_at','is',null)
      .order('published_at', { ascending: false }).limit(100);
    setArticles(data || []);
  }, []);

  useEffect(() => { void loadTickets(); void loadArticles(); if (user) (supabase as any).from('support_agents').select('is_active').eq('user_id', user.id).maybeSingle().then(({data}:any) => setIsSupportAgent(Boolean(data?.is_active))); }, [loadTickets, loadArticles, user?.id]);

  useEffect(() => {
    if (!selected) return;
    const channel = supabase.channel(`support-ticket-${selected.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${selected.id}` }, async () => {
        const { data } = await (supabase as any).from('support_messages')
          .select('id,sender_id,body,created_at,attachment_paths').eq('ticket_id', selected.id)
          .eq('is_internal', false).order('created_at', { ascending: true });
        const rows = await Promise.all((data || []).map(async (m: any) => {
          const urls = await Promise.all((m.attachment_paths || []).map(async (path: string) => {
            const { data: signed } = await supabase.storage.from('support-attachments').createSignedUrl(path, 600);
            return signed?.signedUrl || null;
          }));
          return { ...m, attachmentUrls: urls.filter(Boolean) as string[] };
        }));
        setMessages(rows);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [selected?.id]);

  const loadMessages = useCallback(async (ticket: SupportTicket) => {
    setSelected(ticket);
    const { data, error } = await (supabase as any).from('support_messages')
      .select('id,sender_id,body,created_at,attachment_paths').eq('ticket_id', ticket.id)
      .eq('is_internal', false).order('created_at', { ascending: true });
    if (error) toast.error('Unable to load this conversation.');
    else {
      const rows = await Promise.all((data || []).map(async (m: any) => {
        const urls = await Promise.all((m.attachment_paths || []).map(async (path: string) => {
          const { data: signed } = await supabase.storage.from('support-attachments').createSignedUrl(path, 600);
          return signed?.signedUrl || null;
        }));
        return { ...m, attachmentUrls: urls.filter(Boolean) as string[] };
      }));
      setMessages(rows);
    }
  }, []);

  const createTicket = async () => {
    if (!user || subject.trim().length < 5 || description.trim().length < 10) {
      toast.error('Enter a subject (at least 5 characters) and details (at least 10 characters).'); return;
    }
    setCreating(true);
    const { data, error } = await (supabase as any).from('support_tickets').insert({
      user_id: user.id, subject: subject.trim(), category, description: description.trim(),
    }).select('id,ticket_number,subject,category,priority,status,description,created_at,channel').single();
    if (error) toast.error(error.message);
    else {
      setSubject(''); setDescription('');
      toast.success('Support request created.');
      await loadTickets();
      if (data) await loadMessages(data);
    }
    setCreating(false);
  };

  const startLiveChat = async () => {
    if (!user) return;
    setCreating(true);
    const { data, error } = await (supabase as any).rpc('create_support_chat');
    if (error || !data?.id) {
      toast.error('Live support is temporarily unavailable. Please create a support request.');
      setCreating(false);
      return;
    }
    const ticket = data as SupportTicket;
    await loadTickets();
    await loadMessages(ticket);
    setActiveTab('requests');
    toast.success('Your live support conversation is ready. An agent can join shortly.');
    setCreating(false);
  };

  const sendReply = async () => {
    if (!user || !selected || !reply.trim()) return;
    const body = reply.trim();
    let attachmentPaths: string[] = [];
    if (attachment) {
      if (attachment.size > 15 * 1024 * 1024 || !['image/jpeg','image/png','image/webp','application/pdf','text/plain'].includes(attachment.type)) {
        toast.error('Attach a JPG, PNG, WebP, PDF or text file up to 15 MB.');
        return;
      }
      const safeName = attachment.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-150);
      const path = `${selected.id}/${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('support-attachments').upload(path, attachment, { contentType: attachment.type, upsert: false });
      if (uploadError) { toast.error('Attachment upload failed.'); return; }
      attachmentPaths = [path];
    }
    const { error } = await (supabase as any).from('support_messages').insert({
      ticket_id: selected.id, sender_id: user.id, body, is_internal: false, attachment_paths: attachmentPaths,
    });
    if (error) toast.error('Could not send your reply.');
    else {
      setReply(''); setAttachment(null);
      await loadMessages(selected);
      await loadTickets();
    }
  };

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(a => [a.title, a.summary, a.body_markdown].some(v => (v || '').toLowerCase().includes(q)));
  }, [articles, search]);

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm text-primary font-semibold">DEGAMETV HELP CENTRE</p><h1 className="text-3xl font-bold">How can we help?</h1><p className="text-muted-foreground mt-1">Find answers or contact the support team.</p></div>
          <div className="flex gap-2">{isSupportAgent && <Button asChild variant="outline"><Link to="/support/agent">Agent inbox</Link></Button>}<Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button></div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-5 flex items-center gap-3"><LifeBuoy className="h-8 w-8 text-primary"/><div><p className="font-semibold">Support requests</p><p className="text-xs text-muted-foreground">Create and track a request.</p></div></CardContent></Card>
          <Card><CardContent className="p-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><MessageCircle className="h-8 w-8 text-primary"/><div><p className="font-semibold">Live support chat</p><p className="text-xs text-muted-foreground">Start a realtime conversation with an agent.</p></div></div><Button size="sm" onClick={()=>void startLiveChat()} disabled={creating}>{creating ? "Starting…" : "Chat now"}</Button></CardContent></Card>
          <Card><CardContent className="p-5 flex items-center gap-3"><BookOpen className="h-8 w-8 text-primary"/><div><p className="font-semibold">Knowledgebase</p><p className="text-xs text-muted-foreground">Search help articles and guides.</p></div></CardContent></Card>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList><TabsTrigger value="requests"><TicketCheck className="h-4 w-4 mr-2"/>My requests</TabsTrigger><TabsTrigger value="new"><Plus className="h-4 w-4 mr-2"/>New request</TabsTrigger><TabsTrigger value="knowledge"><BookOpen className="h-4 w-4 mr-2"/>Knowledgebase</TabsTrigger></TabsList>
          <TabsContent value="requests" className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <Card><CardHeader><CardTitle className="text-base">Your support requests</CardTitle></CardHeader><CardContent className="space-y-2">
              {loading ? <p className="text-sm text-muted-foreground">Loading requests…</p> : tickets.length === 0 ? <p className="text-sm text-muted-foreground py-6">You have not opened a support request yet.</p> : tickets.map(t => <button key={t.id} onClick={() => void loadMessages(t)} className={`w-full rounded-xl border p-3 text-left hover:bg-muted/50 ${selected?.id === t.id ? 'border-primary bg-primary/5' : 'border-border'}`}><div className="flex items-center justify-between gap-2"><span className="font-medium text-sm">#{t.ticket_number} · {t.subject}</span><Badge variant="secondary">{t.status.replaceAll('_',' ')}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{t.category.replaceAll('_',' ')} · {new Date(t.created_at).toLocaleDateString()}</p></button>)}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">{selected ? `Request #${selected.ticket_number}` : 'Conversation'}</CardTitle></CardHeader><CardContent className="space-y-3">
              {!selected ? <p className="text-sm text-muted-foreground py-8">Select a request to view its conversation.</p> : <>
                <div className="rounded-xl bg-muted/50 p-3 text-sm">{selected.description}</div>
                <div className="max-h-80 space-y-3 overflow-y-auto">
                  {messages.map(m => <div key={m.id} className={`max-w-[85%] rounded-xl p-3 text-sm ${m.sender_id === user?.id ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}><p>{m.body}</p>{m.attachmentUrls?.map((url,i)=><a key={url} href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block underline text-xs">Attachment {i+1}</a>)}<p className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleString()}</p></div>)}
                </div>
                {selected.status !== 'closed' && {(selected.status === 'closed' || selected.status === 'resolved') && <Button variant="outline" size="sm" onClick={async()=>{const {error}=await (supabase as any).rpc('reopen_support_ticket',{p_ticket_id:selected.id});if(error)toast.error('This request cannot be reopened.');else{toast.success('Support request reopened.');const next={...selected,status:'open'};setSelected(next);await loadTickets();}}}>Reopen request</Button>}
                <div className="flex flex-wrap items-center gap-2"><Input value={reply} onChange={e=>setReply(e.target.value)} placeholder="Write a reply…" maxLength={12000} className="min-w-0 flex-1"/><label className="flex h-10 cursor-pointer items-center gap-1 rounded-md border px-3 text-xs"><Paperclip className="h-4 w-4"/>{attachment?attachment.name.slice(0,18):'Attach'}<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={e=>setAttachment(e.target.files?.[0]||null)}/></label><Button onClick={()=>void sendReply()} disabled={!reply.trim()&&!attachment}><Send className="h-4 w-4"/></Button></div>}
              </>}
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="new"><Card><CardHeader><CardTitle className="text-base">Create a support request</CardTitle></CardHeader><CardContent className="max-w-2xl space-y-4">
            <div><label className="text-sm font-medium">Subject</label><Input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Briefly describe the issue" maxLength={180}/></div>
            <div><label className="text-sm font-medium">Category</label><select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">{categories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="text-sm font-medium">Details</label><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Tell us what happened and what you expected…" maxLength={10000} className="mt-1 min-h-36 w-full rounded-md border bg-background p-3 text-sm"/></div>
            <Button onClick={()=>void createTicket()} disabled={creating}>{creating ? 'Submitting…' : 'Submit request'}</Button>
          </CardContent></Card></TabsContent>
          <TabsContent value="knowledge" className="space-y-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search wallet, tickets, playback, creator tools…"/></div>
            {filteredArticles.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No published articles match your search yet. You can open a support request instead.</CardContent></Card> : filteredArticles.map(a=><Card key={a.id}><CardHeader><CardTitle className="text-base">{a.title}</CardTitle>{a.summary && <p className="text-sm text-muted-foreground">{a.summary}</p>}</CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-6">{a.body_markdown}</p></CardContent></Card>)}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
