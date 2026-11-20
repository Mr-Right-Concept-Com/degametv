import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Ban, Check, Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Tenant = {
 id:string;name:string;slug:string;custom_domain:string|null;tenant_type:string;
 is_active:boolean;created_at:string;user_count:number;content_count:number;published_content_count:number;
};

export default function TenantsPage() {
 const [searchQuery,setSearchQuery]=useState('');
 const [tenants,setTenants]=useState<Tenant[]>([]);
 const [loading,setLoading]=useState(true);
 const [busyId,setBusyId]=useState<string|null>(null);

 const load=useCallback(async()=>{
  setLoading(true);
  const {data,error}=await (supabase as any).rpc('admin_list_tenants');
  if(error){toast.error('Tenant inventory could not be loaded.');setTenants([]);}
  else setTenants((data||[]) as Tenant[]);
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);

 const filtered=useMemo(()=>{
  const q=searchQuery.trim().toLowerCase();
  if(!q)return tenants;
  return tenants.filter(t=>[t.name,t.slug,t.custom_domain||'',t.tenant_type].some(v=>v.toLowerCase().includes(q)));
 },[tenants,searchQuery]);

 const setStatus=async(tenant:Tenant,active:boolean)=>{
  setBusyId(tenant.id);
  const {error}=await (supabase as any).rpc('admin_set_tenant_status',{p_tenant_id:tenant.id,p_is_active:active});
  if(error)toast.error('Tenant status could not be changed.');
  else{toast.success(active?'Tenant activated.':'Tenant suspended.');await load();}
  setBusyId(null);
 };

 return <AdminLayout title="Tenants" description="Manage real platform tenants. New tenants are provisioned through approved creator and business onboarding.">
  <div className="mb-6 flex items-center gap-4">
   <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input placeholder="Search tenants…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="pl-9"/></div>
   <Badge variant="outline">{tenants.length} tenants</Badge>
  </div>
  <div className="rounded-xl border bg-card">
   <Table>
    <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Tenant</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Users</TableHead><TableHead className="text-right">Content</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
    <TableBody>
     {loading?<TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin"/>Loading tenant inventory…</TableCell></TableRow>
      :filtered.length===0?<TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground"><Building2 className="mx-auto mb-2 h-6 w-6"/>{tenants.length===0?'No tenant records have been provisioned yet.':'No tenants match this search.'}</TableCell></TableRow>
      :filtered.map(t=><TableRow key={t.id}>
       <TableCell><p className="font-medium">{t.name}</p><p className="text-xs text-muted-foreground">{t.custom_domain||t.slug+'.degametv.com'}</p></TableCell>
       <TableCell><Badge variant="outline">{t.tenant_type.replaceAll('_',' ')}</Badge></TableCell>
       <TableCell><Badge variant={t.is_active?'default':'destructive'}>{t.is_active?'Active':'Suspended'}</Badge></TableCell>
       <TableCell className="text-right">{Number(t.user_count||0).toLocaleString()}</TableCell>
       <TableCell className="text-right"><span>{Number(t.published_content_count||0).toLocaleString()} published</span><span className="block text-xs text-muted-foreground">{Number(t.content_count||0).toLocaleString()} total</span></TableCell>
       <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
       <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={busyId===t.id}>{busyId===t.id?<Loader2 className="h-4 w-4 animate-spin"/>:<MoreHorizontal className="h-4 w-4"/>}</Button></DropdownMenuTrigger><DropdownMenuContent align="end">{t.is_active?<DropdownMenuItem className="text-destructive" onClick={()=>void setStatus(t,false)}><Ban className="mr-2 h-4 w-4"/>Suspend tenant</DropdownMenuItem>:<DropdownMenuItem onClick={()=>void setStatus(t,true)}><Check className="mr-2 h-4 w-4"/>Activate tenant</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell>
      </TableRow>)}
    </TableBody>
   </Table>
  </div>
 </AdminLayout>;
}
