import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { BookOpen, Loader2, Plus, Save } from 'lucide-react';
import { z } from 'zod';

type Category={id:string;slug:string;title:string;description:string|null;sort_order:number;is_published:boolean};
type Article={id:string;category_id:string|null;slug:string;title:string;summary:string|null;body_markdown:string;audience:string;is_published:boolean;published_at:string|null};
const articleSchema=z.object({slug:z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),title:z.string().trim().min(3).max(180),summary:z.string().max(500),body_markdown:z.string().trim().min(20).max(50000),audience:z.enum(['all','viewer','creator','studio','technical'])});
const categorySchema=z.object({slug:z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),title:z.string().trim().min(2).max(100),description:z.string().max(500),sort_order:z.number().int().min(0)});

export default function SupportKnowledgebaseAdmin(){
 const {user}=useAuth();usePageTitle('Knowledgebase Management');
 const [categories,setCategories]=useState<Category[]>([]),[articles,setArticles]=useState<Article[]>([]);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[editing,setEditing]=useState<string|null>(null);
 const [categoryForm,setCategoryForm]=useState({slug:'',title:'',description:'',sort_order:'0'});
 const [form,setForm]=useState({category_id:'none',slug:'',title:'',summary:'',body_markdown:'',audience:'all' as Article['audience'],is_published:false});
 const load=async()=>{setLoading(true);const [c,a]=await Promise.all([(supabase as any).from('knowledgebase_categories').select('*').order('sort_order'),(supabase as any).from('knowledgebase_articles').select('*').order('updated_at',{ascending:false})]);if(c.error)toast.error(c.error.message);else setCategories(c.data||[]);if(a.error)toast.error(a.error.message);else setArticles(a.data||[]);setLoading(false);};
 useEffect(()=>{void load();},[]);
 const reset=()=>{setEditing(null);setForm({category_id:'none',slug:'',title:'',summary:'',body_markdown:'',audience:'all',is_published:false});};
 const saveCategory=async()=>{const parsed=categorySchema.safeParse({...categoryForm,sort_order:Number(categoryForm.sort_order)});if(!parsed.success){toast.error(parsed.error.issues[0]?.message||'Check category details.');return;}setSaving(true);const {error}=await (supabase as any).from('knowledgebase_categories').insert({...parsed.data,description:parsed.data.description||null,is_published:true});setSaving(false);if(error)toast.error(error.message);else{toast.success('Knowledgebase category created.');setCategoryForm({slug:'',title:'',description:'',sort_order:'0'});await load();}};
 const edit=(a:Article)=>{setEditing(a.id);setForm({category_id:a.category_id||'none',slug:a.slug,title:a.title,summary:a.summary||'',body_markdown:a.body_markdown,audience:a.audience as Article['audience'],is_published:a.is_published});};
 const saveArticle=async()=>{if(!user)return;const parsed=articleSchema.safeParse(form);if(!parsed.success){toast.error(parsed.error.issues[0]?.message||'Check article details.');return;}setSaving(true);const now=new Date().toISOString();const payload={...parsed.data,summary:parsed.data.summary||null,category_id:form.category_id==='none'?null:form.category_id,is_published:form.is_published,published_at:form.is_published?(articles.find(a=>a.id===editing)?.published_at||now):null,updated_by:user.id,...(!editing?{created_by:user.id}:{})};const q=editing?(supabase as any).from('knowledgebase_articles').update(payload).eq('id',editing):(supabase as any).from('knowledgebase_articles').insert(payload);const {error}=await q;setSaving(false);if(error)toast.error(error.message);else{toast.success(form.is_published?'Article saved and published.':'Article saved as draft.');reset();await load();}};
 const togglePublish=async(a:Article,published:boolean)=>{const {error}=await (supabase as any).from('knowledgebase_articles').update({is_published:published,published_at:published?(a.published_at||new Date().toISOString()):null,updated_by:user?.id}).eq('id',a.id);if(error)toast.error(error.message);else{toast.success(published?'Article published.':'Article unpublished.');await load();}};
 return <AdminLayout><div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
  <div><p className="text-xs font-semibold tracking-widest text-primary">CUSTOMER EXPERIENCE</p><h1 className="text-2xl font-bold">Help Centre Knowledgebase</h1><p className="mt-1 text-sm text-muted-foreground">Create, edit, publish and retire help articles without a code deployment.</p></div>
  <Card><CardHeader><CardTitle className="text-base">Create category</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><Label>Slug</Label><Input value={categoryForm.slug} onChange={e=>setCategoryForm({...categoryForm,slug:e.target.value.toLowerCase().replace(/\s+/g,'-')})} placeholder="viewer-wallet"/></div><div><Label>Title</Label><Input value={categoryForm.title} onChange={e=>setCategoryForm({...categoryForm,title:e.target.value})}/></div><div><Label>Description</Label><Input value={categoryForm.description} onChange={e=>setCategoryForm({...categoryForm,description:e.target.value})}/></div><div><Label>Sort order</Label><Input type="number" min="0" value={categoryForm.sort_order} onChange={e=>setCategoryForm({...categoryForm,sort_order:e.target.value})}/></div><div className="sm:col-span-2 lg:col-span-4"><Button onClick={()=>void saveCategory()} disabled={saving}><Plus className="mr-2 h-4 w-4"/>Add category</Button></div></CardContent></Card>
  <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4"/>{editing?'Edit article':'New article'}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
   <div><Label>Title</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div><div><Label>Slug</Label><Input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase().replace(/\s+/g,'-')})}/></div>
   <div><Label>Category</Label><Select value={form.category_id} onValueChange={v=>setForm({...form,category_id:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Uncategorized</SelectItem>{categories.map(c=><SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
   <div><Label>Audience</Label><Select value={form.audience} onValueChange={v=>setForm({...form,audience:v as Article['audience']})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['all','viewer','creator','studio','technical'].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
   <div className="sm:col-span-2"><Label>Summary</Label><Input value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/></div>
   <div className="sm:col-span-2"><Label>Article content (Markdown)</Label><textarea value={form.body_markdown} onChange={e=>setForm({...form,body_markdown:e.target.value})} className="mt-1 min-h-64 w-full rounded-md border bg-background p-3 text-sm" maxLength={50000}/></div>
   <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_published} onCheckedChange={v=>setForm({...form,is_published:v})}/> Publish immediately</label>
   <div className="flex gap-2"><Button onClick={()=>void saveArticle()} disabled={saving}>{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-2 h-4 w-4"/>}{editing?'Save article':'Create article'}</Button>{editing&&<Button variant="outline" onClick={reset}>Cancel</Button>}</div>
  </CardContent></Card>
  <Card><CardHeader><CardTitle className="text-base">Articles</CardTitle></CardHeader><CardContent>{loading?<div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></div>:articles.length===0?<p className="py-8 text-center text-sm text-muted-foreground">No knowledgebase articles yet.</p>:<div className="space-y-2">{articles.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">/{a.slug} · {a.audience}</p></div><div className="flex items-center gap-3"><Badge variant={a.is_published?'default':'secondary'}>{a.is_published?'Published':'Draft'}</Badge><Switch checked={a.is_published} onCheckedChange={v=>void togglePublish(a,v)}/><Button size="sm" variant="outline" onClick={()=>edit(a)}>Edit</Button></div></div>)}</div>}</CardContent></Card>
 </div></AdminLayout>;
}
