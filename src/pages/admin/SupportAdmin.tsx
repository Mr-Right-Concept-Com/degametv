import {useEffect,useState} from 'react';
import {AdminLayout} from '@/components/admin/AdminLayout';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {Switch} from '@/components/ui/switch';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {supabase} from '@/integrations/supabase/client';
import {usePageTitle} from '@/hooks/usePageTitle';
import {toast} from 'sonner';
import {Loader2,Plus,Save} from 'lucide-react';
import {
 listKnowledgebaseAdminArticles,listKnowledgebaseCategories,listSupportAdminAgents,listSupportSlaPolicies,
 upsertSupportAdminAgent,setSupportAdminAgentActive,saveKnowledgebaseAdminArticle,
 setKnowledgebaseArticlePublished,createKnowledgebaseCategory,updateSupportSlaPolicy,
 type KnowledgebaseAdminArticle,type KnowledgebaseCategory,type SupportAdminAgent,type SupportSlaPolicy,
} from '@/integrations/supabase/support';
type A=KnowledgebaseAdminArticle;
type Profile={user_id:string;email:string|null;full_name:string|null;display_name:string|null};
export default function SupportAdmin(){usePageTitle('Support Administration');
 const [articles,setArticles]=useState<A[]>([]),[cats,setCats]=useState<KnowledgebaseCategory[]>([]),[agents,setAgents]=useState<SupportAdminAgent[]>([]),[profiles,setProfiles]=useState<Profile[]>([]),[sla,setSla]=useState<SupportSlaPolicy[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[edit,setEdit]=useState<string|null>(null);
 const [form,setForm]=useState({title:'',slug:'',summary:'',body_markdown:'',audience:'all',category_id:'none'});
 const [cat,setCat]=useState({slug:'',title:''}),[email,setEmail]=useState(''),[department,setDepartment]=useState('general');
 const load=async(isActive:()=>boolean=()=>true)=>{setLoading(true);try{const [a,c,g,p,s]=await Promise.all([listKnowledgebaseAdminArticles(),listKnowledgebaseCategories(),listSupportAdminAgents(),supabase.from('profiles').select('user_id,email,full_name,display_name').limit(1000),listSupportSlaPolicies()]);if(!isActive())return;if(p.error)throw p.error;setArticles(a);setCats(c);setAgents(g);setProfiles(p.data??[]);setSla(s);}catch(error:unknown){if(isActive())toast.error(error instanceof Error?error.message:'Support administration data could not be loaded.');}finally{if(isActive())setLoading(false);}};
 useEffect(()=>{let active=true;void load(()=>active);return()=>{active=false;};},[]);
 const save=async()=>{if(form.title.trim().length<3||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)||form.body_markdown.trim().length<20){toast.error('Check the article title, slug and body.');return;}setBusy(true);const wasPublished=articles.find(a=>a.id===edit)?.is_published||false;const payload={...form,category_id:form.category_id==='none'?null:form.category_id,summary:form.summary||null,is_published:wasPublished,published_at:wasPublished?(articles.find(a=>a.id===edit)?.published_at||new Date().toISOString()):null,updated_at:new Date().toISOString()};await saveKnowledgebaseAdminArticle({...payload,audience:payload.audience as A['audience'],...(edit?{id:edit}:{})});toast.success(edit?'Article saved.':'Draft saved.');setEdit(null);setForm({title:'',slug:'',summary:'',body_markdown:'',audience:'all',category_id:'none'});await load();setBusy(false);};
 const publish=async(a:A,on:boolean)=>{await setKnowledgebaseArticlePublished({id:a.id,published:on,published_at:on?new Date().toISOString():null,updated_by:undefined});await load();};
 const addCategory=async()=>{if(!cat.title.trim()||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cat.slug)){toast.error('Enter category title and a valid slug.');return;}await createKnowledgebaseCategory({slug:cat.slug,title:cat.title.trim(),description:null,sort_order:cats.length});setCat({slug:'',title:''});await load();};
 const addAgent=async()=>{const p=profiles.find(x=>x.email?.toLowerCase()===email.trim().toLowerCase());if(!p){toast.error('That email must belong to an existing DeGameTV user.');return;}await upsertSupportAdminAgent({user_id:p.user_id,display_name:p.display_name||p.full_name||email,department,is_active:true});setEmail('');await load();toast.success('Support agent activated.');};
 return <AdminLayout><div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6"><div><p className="text-xs font-semibold tracking-widest text-primary">CUSTOMER OPERATIONS</p><h1 className="text-2xl font-bold">Support administration</h1><p className="text-sm text-muted-foreground">Manage help articles, categories and support agents.</p></div>
 <Tabs defaultValue="articles" className="space-y-4">
 <TabsList><TabsTrigger value="articles">Knowledgebase</TabsTrigger><TabsTrigger value="categories">Categories</TabsTrigger><TabsTrigger value="agents">Support agents</TabsTrigger><TabsTrigger value="sla">SLA policies</TabsTrigger></TabsList>
 <TabsContent value="articles" className="space-y-4">
  <Card><CardHeader><CardTitle className="text-base">{edit?'Edit knowledgebase article':'Create knowledgebase article'}</CardTitle></CardHeader><CardContent className="space-y-3">
   <div><Label>Title</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
   <div><Label>Slug</Label><Input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase().replace(/\s+/g,'-')})}/></div>
   <div><Label>Summary</Label><Input value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/></div>
   <div><Label>Audience</Label><Select value={form.audience} onValueChange={v=>setForm({...form,audience:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['all','viewer','creator','studio','technical'].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
   <div><Label>Category</Label><Select value={form.category_id} onValueChange={v=>setForm({...form,category_id:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Uncategorised</SelectItem>{cats.map(x=><SelectItem key={x.id} value={x.id}>{x.title}</SelectItem>)}</SelectContent></Select></div>
   <div><Label>Body (Markdown)</Label><Textarea className="min-h-56" value={form.body_markdown} onChange={e=>setForm({...form,body_markdown:e.target.value})}/></div>
   <div className="flex gap-2"><Button onClick={()=>void save()} disabled={busy}>{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-2 h-4 w-4"/>}{edit?'Save article':'Save draft'}</Button>{edit&&<Button variant="outline" onClick={()=>{setEdit(null);setForm({title:'',slug:'',summary:'',body_markdown:'',audience:'all',category_id:'none'});}}>Cancel</Button>}</div>
  </CardContent></Card>
  <Card><CardHeader><CardTitle className="text-base">Articles</CardTitle></CardHeader><CardContent>{loading?<Loader2 className="mx-auto my-6 h-6 w-6 animate-spin"/>:<div className="space-y-2">{articles.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.slug} · {a.audience}</p></div><div className="flex items-center gap-2"><Badge variant={a.is_published?'default':'secondary'}>{a.is_published?'Published':'Draft'}</Badge><Switch checked={a.is_published} onCheckedChange={v=>void publish(a,v)}/><Button size="sm" variant="outline" onClick={()=>{setEdit(a.id);setForm({title:a.title,slug:a.slug,summary:a.summary||'',body_markdown:a.body_markdown,audience:a.audience,category_id:a.category_id||'none'});}}>Edit</Button></div></div>)}</div>}</CardContent></Card>
 </TabsContent>
 <TabsContent value="categories" className="space-y-4">
  <Card><CardHeader><CardTitle className="text-base">Create help category</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div><Label>Title</Label><Input value={cat.title} onChange={e=>setCat({...cat,title:e.target.value})}/></div><div><Label>Slug</Label><Input value={cat.slug} onChange={e=>setCat({...cat,slug:e.target.value.toLowerCase().replace(/\s+/g,'-')})}/></div><div className="flex items-end"><Button onClick={()=>void addCategory()}><Plus className="mr-2 h-4 w-4"/>Add category</Button></div></CardContent></Card>
  <Card><CardContent className="space-y-2 p-4">{cats.map(x=><div key={x.id} className="rounded-lg border p-3"><p className="font-medium">{x.title}</p><p className="text-xs text-muted-foreground">/{x.slug}</p></div>)}</CardContent></Card>
 </TabsContent>
 <TabsContent value="agents" className="space-y-4">
  <Card><CardHeader><CardTitle className="text-base">Activate support agent</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-[1fr_200px_auto]"><div><Label>Existing DeGameTV user email</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="agent@example.com"/></div><div><Label>Department</Label><Select value={department} onValueChange={setDepartment}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['general','payments','creator_success','technical','trust_safety'].map(v=><SelectItem key={v} value={v}>{v.replaceAll('_',' ')}</SelectItem>)}</SelectContent></Select></div><div className="flex items-end"><Button onClick={()=>void addAgent()}><Plus className="mr-2 h-4 w-4"/>Activate agent</Button></div></CardContent></Card>
  <Card><CardHeader><CardTitle className="text-base">Support agents</CardTitle></CardHeader><CardContent className="space-y-2">{agents.map(a=><div key={a.user_id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{a.display_name||a.user_id}</p><p className="text-xs text-muted-foreground">{a.department}</p></div><div className="flex items-center gap-2"><Badge variant={a.is_active?'default':'secondary'}>{a.is_active?'Active':'Inactive'}</Badge><Switch checked={a.is_active} onCheckedChange={async v=>{await setSupportAdminAgentActive(a.user_id,v);await load();}}/></div></div>)}</CardContent></Card>
 </TabsContent>
 <TabsContent value="sla" className="space-y-4">
  <Card><CardHeader><CardTitle className="text-base">Support response and resolution targets</CardTitle></CardHeader><CardContent className="space-y-3">{sla.map(x=><div key={x.priority} className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><div><p className="font-medium capitalize">{x.priority}</p><p className="text-xs text-muted-foreground">Priority level</p></div><div><Label>First response (minutes)</Label><Input type="number" min="5" max="10080" defaultValue={x.first_response_minutes} onBlur={async e=>{const v=Number(e.target.value);if(v<5||v>10080)return toast.error('First response must be 5–10080 minutes.');await updateSupportSlaPolicy({...x,first_response_minutes:v});await load();}}/></div><div><Label>Resolution (minutes)</Label><Input type="number" min="15" max="43200" defaultValue={x.resolution_minutes} onBlur={async e=>{const v=Number(e.target.value);if(v<15||v>43200)return toast.error('Resolution must be 15–43200 minutes.');await updateSupportSlaPolicy({...x,resolution_minutes:v});await load();}}/></div><div className="flex items-center gap-2"><Switch checked={x.is_active} onCheckedChange={async v=>{await updateSupportSlaPolicy({...x,is_active:v});await load();}}/><span className="text-xs">Active</span></div></div>)}</CardContent></Card>
 </TabsContent>
 </Tabs>
 </div></AdminLayout>;
}
