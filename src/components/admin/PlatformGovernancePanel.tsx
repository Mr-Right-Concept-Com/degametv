import { useCallback,useEffect,useState } from "react";
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { invokeFn } from "@/lib/invokeFn";
import { toast } from "sonner";
import { Loader2,RefreshCw,ShieldCheck,Activity,BrainCircuit } from "lucide-react";

type Rollout={id:string;release_key:string;release_version:string;state:string;traffic_percentage:number;config:Record<string,unknown>;health_window_seconds:number;minimum_samples:number;error_rate_threshold:number;latency_p95_threshold_ms:number};
type Policy={workflow_key:string;enabled:boolean;capability:string;provider_allowlist:string[];model_key:string|null;max_input_chars:number;max_output_tokens:number;allowed_data_classes:string[];requires_human_review:boolean;system_policy:string};
type Provider={provider_key:string;capability:string;enabled:boolean;health_status:string;removed_at:string|null;priority:number};
async function control<T>(body:Record<string,unknown>):Promise<T>{const r=await invokeFn<T>("admin-platform-control",body);if(!r.ok)throw new Error(r.error);return r.data as T;}

export function PlatformGovernancePanel(){
 const [rollouts,setRollouts]=useState<Rollout[]>([]);
 const [policies,setPolicies]=useState<Policy[]>([]);
 const [providers,setProviders]=useState<Provider[]>([]);
 const [release,setRelease]=useState({releaseKey:"",releaseVersion:"",artifactDigest:"",healthUrl:""});
 const [traffic,setTraffic]=useState("5");
 const [busy,setBusy]=useState(false);
 const [policyDraft,setPolicyDraft]=useState<Record<string,Policy>>({});
 const load=useCallback(async()=>{
  setBusy(true);
  try{
   const [r,a]=await Promise.all([control<{rollouts:Rollout[]}>({action:"release_list"}),control<{policies:Policy[]}>({action:"ai_policy_list"})]);
   setRollouts(r.rollouts);setPolicies(a.policies);setPolicyDraft(Object.fromEntries(a.policies.map(p=>[p.workflow_key,p])));
   const p=await invokeFn<{providers:Provider[]}>("admin-provider-control",{action:"list"});
   if(p.ok)setProviders((p.data?.providers??[]) as Provider[]);
  }catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const saveRelease=async()=>{
  if(!release.releaseKey.trim()||!release.releaseVersion.trim()||!/^sha256:[a-f0-9]{64}$/.test(release.artifactDigest)||!/^https:\/\//i.test(release.healthUrl)){toast.error("Enter a release key, version, SHA-256 artifact digest and HTTPS health endpoint.");return;}
  setBusy(true);try{await control({action:"release_save",releaseKey:release.releaseKey.trim(),releaseVersion:release.releaseVersion.trim(),config:{artifact_digest:release.artifactDigest,health_check_url:release.healthUrl}});toast.success("Draft release saved.");await load();}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
 };
 const transition=async(key:string,transitionName:string,reason:string,trafficPercentage?:number)=>{
  setBusy(true);try{await control({action:"release_transition",releaseKey:key,transition:transitionName,reason,trafficPercentage});toast.success("Release state updated.");await load();}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
 };
 const probe=async(key:string,samples:number)=>{
  setBusy(true);try{const r=await control<{success:boolean;samples:number;successfulSamples:number;errorRate:number;p95LatencyMs:number}>({action:"release_probe_batch",releaseKey:key,samples});toast[r.success?"success":"error"]("Canary probe window: "+r.successfulSamples+"/"+r.samples+" healthy; error rate "+(r.errorRate*100).toFixed(1)+"%; p95 "+r.p95LatencyMs+" ms.");await load();}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
 };
 const updatePolicy=(key:string,patch:Partial<Policy>)=>setPolicyDraft(current=>({...current,[key]:{...current[key],...patch}}));
 const savePolicy=async(key:string)=>{
  const p=policyDraft[key];if(!p)return;
  setBusy(true);try{await control({action:"ai_policy_update",workflowKey:key,enabled:p.enabled,providerAllowlist:p.provider_allowlist,modelKey:p.model_key,maxInputChars:p.max_input_chars,maxOutputTokens:p.max_output_tokens,allowedDataClasses:p.allowed_data_classes,requiresHumanReview:p.requires_human_review,systemPolicy:p.system_policy});toast.success("AI workflow policy saved.");await load();}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
 };
 const providersFor=(policy:Policy)=>providers.filter(p=>p.capability===policy.capability&&p.enabled&&!p.removed_at);
 return <div className="space-y-5">
  <Card>
   <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4"/>Deterministic release canaries</CardTitle><CardDescription>Release traffic is assigned by a stable subject hash. A release cannot be promoted until it has a SHA-256 artifact, HTTPS health endpoint, enough server-side probe samples, and passing error-rate and p95 latency thresholds.</CardDescription></CardHeader>
   <CardContent className="space-y-4">
    <div className="grid gap-3 md:grid-cols-2">
     <div><Label>Release key</Label><Input value={release.releaseKey} onChange={e=>setRelease(v=>({...v,releaseKey:e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g,"")}))} placeholder="web.release.2026.11"/></div>
     <div><Label>Release version</Label><Input value={release.releaseVersion} onChange={e=>setRelease(v=>({...v,releaseVersion:e.target.value}))} placeholder="2026.11.20+sha"/></div>
     <div className="md:col-span-2"><Label>Artifact SHA-256 digest</Label><Input value={release.artifactDigest} onChange={e=>setRelease(v=>({...v,artifactDigest:e.target.value.toLowerCase()}))} placeholder="sha256:64-character-hex-digest"/></div>
     <div className="md:col-span-2"><Label>HTTPS health-check URL</Label><Input type="url" value={release.healthUrl} onChange={e=>setRelease(v=>({...v,healthUrl:e.target.value}))} placeholder="https://release-host.example/healthz"/></div>
    </div>
    <Button onClick={()=>void saveRelease()} disabled={busy||!release.releaseKey||!release.releaseVersion}>Save draft release</Button>
    <div className="space-y-3">{rollouts.length===0?<p className="text-sm text-muted-foreground">No release rollouts have been configured.</p>:rollouts.map(row=><div key={row.id} className="rounded-xl border p-4 space-y-3">
     <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{row.release_key} · {row.release_version}</p><p className="text-xs text-muted-foreground">Traffic {row.traffic_percentage}% · {row.minimum_samples} required samples · p95 limit {row.latency_p95_threshold_ms} ms</p></div><Badge variant={row.state==="approved"?"default":row.state==="canary"?"outline":"secondary"}>{row.state}</Badge></div>
     <div className="flex flex-wrap gap-2">
      {row.state==="draft"&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void transition(row.release_key,"validate","Artifact and endpoint validation")}>Validate</Button>}
      {row.state==="validated"&&<><Input aria-label="Canary traffic percentage" className="w-24" type="number" min="1" max="99" value={traffic} onChange={e=>setTraffic(e.target.value)}/><Button size="sm" disabled={busy||Number(traffic)<1||Number(traffic)>99} onClick={()=>void transition(row.release_key,"start_canary","Begin deterministic canary",Number(traffic))}>Start canary</Button></>}
      {row.state==="canary"&&<><Button size="sm" variant="outline" disabled={busy} onClick={()=>void probe(row.release_key,row.minimum_samples)}>Run health sample window</Button><Button size="sm" variant="outline" disabled={busy} onClick={()=>void transition(row.release_key,"set_traffic","Adjust canary traffic",Math.max(1,Math.min(99,Number(traffic)||1)))}>Set traffic</Button><Button size="sm" disabled={busy} onClick={()=>void transition(row.release_key,"approve","Approve after verified health thresholds")}>Approve 100%</Button></>}
      {["validated","canary"].includes(row.state)&&<Button size="sm" variant="destructive" disabled={busy} onClick={()=>void transition(row.release_key,"rollback","Operator rollback")}>Rollback</Button>}
      {["validated","canary"].includes(row.state)&&<Button size="sm" variant="ghost" disabled={busy} onClick={()=>void transition(row.release_key,"pause","Operator pause")}>Pause</Button>}
     </div>
    </div>)}</div>
    <Button variant="ghost" size="sm" onClick={()=>void load()} disabled={busy}><RefreshCw className="mr-2 h-4 w-4"/>Refresh release state</Button>
   </CardContent>
  </Card>
  <Card>
   <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BrainCircuit className="h-4 w-4"/>Platform-native AI policy</CardTitle><CardDescription>AI remains disabled until an approved provider passes health checks and is explicitly allowlisted. The policy engine prohibits financial and identity decisions regardless of model output.</CardDescription></CardHeader>
   <CardContent className="space-y-4">
    {policies.map(policy=>{
     const draft=policyDraft[policy.workflow_key]??policy;const eligible=providersFor(policy);
     return <div key={policy.workflow_key} className="rounded-xl border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{policy.workflow_key}</p><p className="text-xs text-muted-foreground">{policy.capability} · human review {draft.requires_human_review?"required":"not required"}</p></div><Badge variant={draft.enabled?"default":"secondary"}>{draft.enabled?"Enabled":"Disabled"}</Badge></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} onChange={e=>updatePolicy(policy.workflow_key,{enabled:e.target.checked})}/>Enable workflow after provider validation</label>
      <div className="grid gap-3 sm:grid-cols-2">
       <div><Label>Model identifier</Label><Input value={draft.model_key??""} onChange={e=>updatePolicy(policy.workflow_key,{model_key:e.target.value||null})} placeholder="Provider model key"/></div>
       <div className="space-y-2"><Label>Approved providers (failover follows registry priority)</Label>{eligible.length===0?<p className="text-xs text-muted-foreground">No enabled, healthy provider is available for {policy.capability}.</p>:eligible.map(provider=><label key={provider.provider_key} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"><span>{provider.provider_key} · priority {provider.priority}</span><input type="checkbox" checked={draft.provider_allowlist.includes(provider.provider_key)} onChange={e=>updatePolicy(policy.workflow_key,{provider_allowlist:e.target.checked?[...draft.provider_allowlist,provider.provider_key]:draft.provider_allowlist.filter(key=>key!==provider.provider_key)})}/></label>)}</div>
       <div><Label>Maximum input characters</Label><Input type="number" min="1" max="200000" value={draft.max_input_chars} onChange={e=>updatePolicy(policy.workflow_key,{max_input_chars:Number(e.target.value)})}/></div>
       <div><Label>Maximum output tokens</Label><Input type="number" min="1" max="16000" value={draft.max_output_tokens} onChange={e=>updatePolicy(policy.workflow_key,{max_output_tokens:Number(e.target.value)})}/></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.requires_human_review} onChange={e=>updatePolicy(policy.workflow_key,{requires_human_review:e.target.checked})}/>Require human review before workflow action</label>
      <div><Label>System policy and guardrails</Label><Textarea rows={3} value={draft.system_policy} onChange={e=>updatePolicy(policy.workflow_key,{system_policy:e.target.value})}/></div>
      <p className="text-xs text-muted-foreground">Allowed data classes: {draft.allowed_data_classes.join(", ")}. Financial decisions: prohibited. Identity decisions: prohibited.</p>
      <Button size="sm" disabled={busy||draft.enabled&&(!draft.provider_allowlist.length||!eligible.some(p=>draft.provider_allowlist.includes(p.provider_key)&&p.health_status==="healthy"))} onClick={()=>void savePolicy(policy.workflow_key)}><ShieldCheck className="mr-2 h-4 w-4"/>Save AI policy</Button>
     </div>;
    })}
   </CardContent>
  </Card>
  {busy&&<div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Applying platform control changes…</div>}
 </div>;
}
