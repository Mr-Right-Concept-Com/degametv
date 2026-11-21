import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { Gift, Loader2, Plus, Save, X } from 'lucide-react';
import { z } from 'zod';

type GiftRow={id:string;gift_key:string;name:string;description:string|null;category:string;asset_url:string|null;animation_url:string|null;emoji:string|null;currency:string;amount_minor:number;animation_duration_ms:number;sort_order:number;is_enabled:boolean};
const giftRowSchema=z.object({id:z.string().uuid(),gift_key:z.string(),name:z.string(),description:z.string().nullable(),category:z.string(),asset_url:z.string().nullable(),animation_url:z.string().nullable(),emoji:z.string().nullable(),currency:z.string(),amount_minor:z.number(),animation_duration_ms:z.number(),sort_order:z.number(),is_enabled:z.boolean()});
const currencyRowSchema=z.object({currency_code:z.string().regex(/^[A-Z]{3}$/)});
const schema=z.object({gift_key:z.string().regex(/^[a-z0-9][a-z0-9_-]{1,79}$/),name:z.string().trim().min(2).max(80),description:z.string().max(500),category:z.string().trim().min(2).max(40),asset_url:z.string().url().or(z.literal('')),animation_url:z.string().url().or(z.literal('')),emoji:z.string().max(16),currency:z.string().regex(/^[A-Z]{3}$/),amount:z.number().positive().max(10000000),animation_duration_ms:z.number().int().min(300).max(10000),sort_order:z.number().int().min(0),is_enabled:z.boolean()});
const scales=(c:string)=>['BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF'].includes(c)?1:['BHD','IQD','JOD','KWD','LYD','OMR','TND'].includes(c)?1000:100;
const blank={gift_key:'',name:'',description:'',category:'general',asset_url:'',animation_url:'',emoji:'🎁',currency:'NGN',amount:'',animation_duration_ms:'1800',sort_order:'0',is_enabled:false};
export default function GiftCatalogAdmin(){
 usePageTitle('Gift Catalogue — Admin');
 const [rows,setRows]=useState<GiftRow[]>([]),[currencies,setCurrencies]=useState<string[]>(['NGN']),[form,setForm]=useState(blank),[editing,setEditing]=useState<string|null>(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const load=async(isActive:()=>boolean=()=>true)=>{setLoading(true);try{const [g,c]=await Promise.all([supabase.from('creator_gift_catalog').select('*').order('currency').order('sort_order'),supabase.from('country_currency_rules').select('currency_code').eq('enabled',true)]);if(g.error)throw new Error(g.error.message);if(c.error)throw new Error(c.error.message);const parsedG=giftRowSchema.array().safeParse(g.data);const parsedC=currencyRowSchema.array().safeParse(c.data);if(!parsedG.success||!parsedC.success)throw new Error('Gift catalogue returned invalid data.');if(isActive()){setRows(parsedG.data);setCurrencies([...new Set(parsedC.data.map(row=>row.currency_code))]);}}catch(error:unknown){if(isActive())toast.error(error instanceof Error?error.message:'Gift catalogue could not be loaded.');}finally{if(isActive())setLoading(false);}};
 useEffect(()=>{let active=true;void load(()=>active);return()=>{active=false;};},[]);
 const edit=(g:GiftRow)=>{setEditing(g.id);setForm({gift_key:g.gift_key,name:g.name,description:g.description||'',category:g.category,asset_url:g.asset_url||'',animation_url:g.animation_url||'',emoji:g.emoji||'',currency:g.currency,amount:String(Number(g.amount_minor)/scales(g.currency)),animation_duration_ms:String(g.animation_duration_ms),sort_order:String(g.sort_order),is_enabled:g.is_enabled});};
 const reset=()=>{setEditing(null);setForm({...blank,currency:currencies.includes('NGN')?'NGN':currencies[0]||'NGN'});};
 const save=async()=>{const parsed=schema.safeParse({...form,amount:Number(form.amount),animation_duration_ms:Number(form.animation_duration_ms),sort_order:Number(form.sort_order)});if(!parsed.success){toast.error(parsed.error.issues[0]?.message||'Check gift details.');return;}const v=parsed.data;const payload={gift_key:v.gift_key,name:v.name,description:v.description||null,category:v.category,asset_url:v.asset_url||null,animation_url:v.animation_url||null,emoji:v.emoji||null,currency:v.currency,amount_minor:Math.round(v.amount*scales(v.currency)),animation_duration_ms:v.animation_duration_ms,sort_order:v.sort_order,is_enabled:v.is_enabled};setSaving(true);const q=editing?giftAdmin.from('creator_gift_catalog').update(payload).eq('id',editing):giftAdmin.from('creator_gift_catalog').insert(payload);const {error}=await q;if(error)toast.error(error.message);else{toast.success(editing?'Gift updated.':'Gift created.');reset();await load();}setSaving(false);};
 const toggle=async(g:GiftRow,enabled:boolean)=>{const {error}=await giftAdmin.from('creator_gift_catalog').update({is_enabled:enabled}).eq('id',g.id);if(error)toast.error(error.message);else setRows(old=>old.map(x=>x.id===g.id?{...x,is_enabled:enabled}:x));};
 return <AdminLayout><div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
  <div><p className="text-xs font-semibold tracking-widest text-primary">MONETIZATION</p><h1 className="text-2xl font-bold">Virtual Gift Catalogue</h1><p className="mt-1 text-sm text-muted-foreground">Manage gift pricing, media, animation timing and availability by currency. Gifts are separate from content access.</p></div>
  <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gift className="h-4 w-4"/> {editing?'Edit gift':'Create gift'}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
   <div><Label>Gift key</Label><Input value={form.gift_key} onChange={e=>setForm({...form,gift_key:e.target.value.toLowerCase().replace(/\s+/g,'_')})} placeholder="rose"/></div>
   <div><Label>Name</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Rose"/></div>
   <div><Label>Category</Label><Input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></div>
   <div><Label>Currency</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}>{currencies.map(c=><option key={c}>{c}</option>)}</select></div>
   <div><Label>Price (major units)</Label><Input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
   <div><Label>Emoji fallback</Label><Input value={form.emoji} onChange={e=>setForm({...form,emoji:e.target.value})} maxLength={16}/></div>
   <div><Label>Asset image URL</Label><Input value={form.asset_url} onChange={e=>setForm({...form,asset_url:e.target.value})} placeholder="https://…"/></div>
   <div><Label>Animation URL</Label><Input value={form.animation_url} onChange={e=>setForm({...form,animation_url:e.target.value})} placeholder="https://…"/></div>
   <div><Label>Animation duration (ms)</Label><Input type="number" min="300" max="10000" value={form.animation_duration_ms} onChange={e=>setForm({...form,animation_duration_ms:e.target.value})}/></div>
   <div><Label>Sort order</Label><Input type="number" min="0" value={form.sort_order} onChange={e=>setForm({...form,sort_order:e.target.value})}/></div>
   <div className="sm:col-span-2"><Label>Description</Label><Input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
   <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_enabled} onCheckedChange={v=>setForm({...form,is_enabled:v})}/> Available to users</label>
   <div className="flex items-center gap-2 sm:col-span-2"><Button onClick={()=>void save()} disabled={saving}>{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-2 h-4 w-4"/>}{editing?'Save changes':'Add gift'}</Button>{editing&&<Button variant="outline" onClick={reset}><X className="mr-2 h-4 w-4"/>Cancel</Button>}</div>
  </CardContent></Card>
  <Card><CardHeader><CardTitle className="text-base">Configured gifts</CardTitle></CardHeader><CardContent>{loading?<div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></div>:rows.length===0?<p className="py-8 text-center text-sm text-muted-foreground">No gifts configured yet. Add the first catalogue item above.</p>:<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Gift</TableHead><TableHead>Key</TableHead><TableHead>Price</TableHead><TableHead>Animation</TableHead><TableHead>Enabled</TableHead><TableHead/></TableRow></TableHeader><TableBody>{rows.map(g=><TableRow key={g.id}><TableCell><span className="mr-2 text-xl">{g.emoji||'🎁'}</span><span className="font-medium">{g.name}</span></TableCell><TableCell className="font-mono text-xs">{g.gift_key}</TableCell><TableCell>{(Number(g.amount_minor)/scales(g.currency)).toLocaleString()} {g.currency}</TableCell><TableCell>{g.animation_duration_ms} ms</TableCell><TableCell><Badge variant={g.is_enabled?'default':'secondary'}>{g.is_enabled?'Live':'Disabled'}</Badge></TableCell><TableCell><div className="flex items-center gap-2"><Switch checked={g.is_enabled} onCheckedChange={v=>void toggle(g,v)}/><Button size="sm" variant="outline" onClick={()=>edit(g)}>Edit</Button></div></TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
 </div></AdminLayout>;
}
