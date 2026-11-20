import { useCallback,useEffect,useState } from "react";
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { invokeFn } from "@/lib/invokeFn";
import { toast } from "sonner";
import { AlertTriangle,RefreshCw,ShieldCheck } from "lucide-react";

type AlertRow={
 id:string;severity:"high"|"critical";event_key:string;actor_id:string|null;entity_type:string|null;entity_id:string|null;
 summary:string;created_at:string;resolved_at:string|null;resolved_by:string|null;resolution_note:string|null;
};
async function control<T>(body:Record<string,unknown>):Promise<T>{
 const result=await invokeFn<T>("admin-platform-control",body);
 if(!result.ok)throw new Error(result.error);
 return result.data as T;
}
export function SecurityAlertsPanel(){
 const [alerts,setAlerts]=useState<AlertRow[]>([]);
 const [unresolvedOnly,setUnresolvedOnly]=useState(true);
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  setBusy(true);
  try{const result=await control<{alerts:AlertRow[]}>({action:"security_alert_list",unresolvedOnly});setAlerts(result.alerts??[]);}
  catch(e){toast.error(e instanceof Error ? e.message : 'Operation failed');}finally{setBusy(false);}
 },[unresolvedOnly]);
 useEffect(()=>{void load();},[load]);
 const resolve=async(alertId:string)=>{
  const note=window.prompt("Record the investigation and resolution (minimum 5 characters):");
  if(!note||note.trim().length<5)return;
  setBusy(true);
  try{await control({action:"security_alert_resolve",alertId,resolutionNote:note.trim()});toast.success("Security alert resolved and audited.");await load();}
  catch(e){toast.error(e instanceof Error ? e.message : 'Operation failed');}finally{setBusy(false);}
 };
 return <Card>
  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4"/>Platform security alerts</CardTitle>
   <CardDescription>High-risk administrative and platform actions are captured from the immutable audit trail. Resolution requires a written investigation note and is itself audited.</CardDescription></CardHeader>
  <CardContent className="space-y-3">
   <div className="flex flex-wrap items-center gap-2">
    <Button size="sm" variant={unresolvedOnly?"default":"outline"} onClick={()=>setUnresolvedOnly(true)}>Unresolved</Button>
    <Button size="sm" variant={!unresolvedOnly?"default":"outline"} onClick={()=>setUnresolvedOnly(false)}>Recent history</Button>
    <Button size="sm" variant="ghost" onClick={()=>void load()} disabled={busy}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>
    <span className="text-xs text-muted-foreground">{alerts.length} alert records</span>
   </div>
   {alerts.length===0?<p className="text-sm text-muted-foreground">No matching security alerts.</p>:alerts.map(alert=><div key={alert.id} className="rounded-xl border p-3 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <div className="flex items-center gap-2"><Badge variant={alert.severity==="critical"?"destructive":"outline"}>{alert.severity}</Badge><span className="text-sm font-semibold">{alert.event_key}</span></div>
     <Badge variant={alert.resolved_at?"secondary":"destructive"}>{alert.resolved_at?"Resolved":"Open"}</Badge>
    </div>
    <p className="text-sm">{alert.summary}</p>
    <p className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()} · actor {alert.actor_id??"system"} · {alert.entity_type??"platform"} {alert.entity_id??""}</p>
    {alert.resolved_at&&<p className="text-xs text-muted-foreground">Resolved {new Date(alert.resolved_at).toLocaleString()} · {alert.resolution_note}</p>}
    {!alert.resolved_at&&<div className="flex justify-end"><Button size="sm" variant="outline" disabled={busy} onClick={()=>void resolve(alert.id)}><ShieldCheck className="mr-2 h-4 w-4"/>Resolve with investigation note</Button></div>}
   </div>)}
  </CardContent>
 </Card>;
}