import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { invokeFn } from "@/lib/invokeFn";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

type CountryRule = {country_code:string;currency_code:string;currency_symbol:string|null;locale_code:string;timezone_name:string|null;enabled:boolean;source:string;updated_at:string};
type Feature = {feature_key:string;enabled:boolean;rollout_percentage:number;release_state:string;config:Record<string,unknown>;change_reason:string;updated_at:string;updated_by:string};
async function call<T>(body:Record<string,unknown>){const r=await invokeFn<{result:T}>("admin-godmode",body);if(!r.ok)throw new Error(r.error);return r.data?.result as T;}

export function RuntimeControlPanel(){
 const [countries,setCountries]=useState<CountryRule[]>([]);
 const [features,setFeatures]=useState<Feature[]>([]);
 const [adminId,setAdminId]=useState("");
 const [loading,setLoading]=useState(false);
 const [saving,setSaving]=useState(false);
 const [country,setCountry]=useState({countryCode:"US",currencyCode:"USD",currencySymbol:"$",localeCode:"en-US",timezoneName:"",enabled:true,reason:"Global localization policy update"});
 const [feature,setFeature]=useState({featureKey:"",enabled:false,rolloutPercentage:"0",releaseState:"draft",config:"{}",reason:"Feature rollout configuration"});
 const load=useCallback(async()=>{setLoading(true);try{const r=await call<{countries:CountryRule[];features:Feature[];administratorId:string}>({action:"runtime_controls"});setCountries(r.countries);setFeatures(r.features);setAdminId(r.administratorId);}catch(e){toast.error((e as Error).message);}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const saveCountry=async()=>{setSaving(true);try{await call({action:"country_currency_set",...country,timezoneName:country.timezoneName||null,currencySymbol:country.currencySymbol||null});toast.success("Country currency policy saved.");await load();}catch(e){toast.error((e as Error).message);}finally{setSaving(false);}};
 const saveFeature=async()=>{let config:Record<string,unknown>;try{config=JSON.parse(feature.config);if(!config||Array.isArray(config)||typeof config!=="object")throw new Error();}catch{toast.error("Feature configuration must be a JSON object.");return;}setSaving(true);try{await call({action:"feature_control_set",featureKey:feature.featureKey.trim(),enabled:feature.enabled,rolloutPercentage:Number(feature.rolloutPercentage),releaseState:feature.releaseState,config,reason:feature.reason});toast.success("Feature release policy saved.");await load();}catch(e){toast.error((e as Error).message);}finally{setSaving(false);}};
 const editCountry=(r:CountryRule)=>setCountry({countryCode:r.country_code,currencyCode:r.currency_code,currencySymbol:r.currency_symbol??"",localeCode:r.locale_code,timezoneName:r.timezone_name??"",enabled:r.enabled,reason:"Administrator updated country localization policy"});
 const editFeature=(r:Feature)=>setFeature({featureKey:r.feature_key,enabled:r.enabled,rolloutPercentage:String(r.rollout_percentage),releaseState:r.release_state,config:JSON.stringify(r.config??{},null,2),reason:"Administrator updated feature release policy"});
 return <div className="space-y-5">
  <Card><CardHeader><CardTitle className="text-base">Global administrator identity</CardTitle><CardDescription>Authenticated immutable Supabase Auth UUID. High-risk actions remain protected by server-side super-admin authorization and audit logging.</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center gap-3"><code className="text-xs break-all">{adminId||"Loading administrator identity…"}</code><Badge variant="outline">Super-admin session</Badge><Button size="sm" variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></CardContent></Card>
  <Card><CardHeader><CardTitle className="text-base">Country, locale and currency policies</CardTitle><CardDescription>Geo detection supplies a suggested country; users can override display currency. Currency rules never determine KYC, tax or legal eligibility.</CardDescription></CardHeader><CardContent className="space-y-4">
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <div><Label>ISO country code</Label><Input maxLength={2} value={country.countryCode} onChange={e=>setCountry(v=>({...v,countryCode:e.target.value.toUpperCase()}))}/></div>
    <div><Label>ISO currency code</Label><Input maxLength={3} value={country.currencyCode} onChange={e=>setCountry(v=>({...v,currencyCode:e.target.value.toUpperCase()}))}/></div>
    <div><Label>Currency symbol</Label><Input value={country.currencySymbol} onChange={e=>setCountry(v=>({...v,currencySymbol:e.target.value}))}/></div>
    <div><Label>Locale</Label><Input value={country.localeCode} onChange={e=>setCountry(v=>({...v,localeCode:e.target.value}))}/></div>
    <div><Label>IANA timezone</Label><Input placeholder="Europe/London" value={country.timezoneName} onChange={e=>setCountry(v=>({...v,timezoneName:e.target.value}))}/></div>
    <div><Label>Change reason</Label><Input value={country.reason} onChange={e=>setCountry(v=>({...v,reason:e.target.value}))}/></div>
   </div>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={country.enabled} onChange={e=>setCountry(v=>({...v,enabled:e.target.checked}))}/> Country policy enabled</label>
   <Button onClick={()=>void saveCountry()} disabled={saving||country.countryCode.length!==2||country.currencyCode.length!==3||country.reason.trim().length<3}>{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save country policy</Button>
   <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{countries.map(r=><button key={r.country_code} type="button" onClick={()=>editCountry(r)} className="rounded-lg border p-3 text-left hover:bg-muted/50"><div className="flex items-center justify-between"><span className="font-medium">{r.country_code} · {r.currency_code}</span><Badge variant={r.enabled?"default":"secondary"}>{r.enabled?"Enabled":"Disabled"}</Badge></div><p className="text-sm text-muted-foreground">{r.currency_symbol||""} · {r.locale_code} · {r.timezone_name||"Timezone not set"}</p></button>)}</div>
  </CardContent></Card>
  <Card><CardHeader><CardTitle className="text-base">Feature controls and safe release</CardTitle><CardDescription>Draft, canary, release, pause or roll back runtime features without shipping a new client build. Runtime consumers must enforce these controls before a feature is considered live.</CardDescription></CardHeader><CardContent className="space-y-4">
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <div><Label>Feature key</Label><Input placeholder="creator.live.replay" value={feature.featureKey} onChange={e=>setFeature(v=>({...v,featureKey:e.target.value.toLowerCase()}))}/></div>
    <div><Label>Rollout %</Label><Input type="number" min="0" max="100" value={feature.rolloutPercentage} onChange={e=>setFeature(v=>({...v,rolloutPercentage:e.target.value}))}/></div>
    <div><Label>Release state</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={feature.releaseState} onChange={e=>setFeature(v=>({...v,releaseState:e.target.value}))}>{["draft","canary","released","paused","rolled_back"].map(x=><option key={x}>{x}</option>)}</select></div>
    <div><Label>Change reason</Label><Input value={feature.reason} onChange={e=>setFeature(v=>({...v,reason:e.target.value}))}/></div>
    <div className="sm:col-span-2"><Label>Runtime configuration JSON</Label><textarea className="min-h-24 w-full rounded-md border bg-background p-3 font-mono text-xs" value={feature.config} onChange={e=>setFeature(v=>({...v,config:e.target.value}))}/></div>
   </div>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={feature.enabled} onChange={e=>setFeature(v=>({...v,enabled:e.target.checked}))}/> Feature enabled</label>
   <Button onClick={()=>void saveFeature()} disabled={saving||!feature.featureKey.trim()||feature.reason.trim().length<3||Number(feature.rolloutPercentage)<0||Number(feature.rolloutPercentage)>100}>{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save release policy</Button>
   <div className="space-y-2">{features.map(r=><button key={r.feature_key} type="button" onClick={()=>editFeature(r)} className="w-full rounded-lg border p-3 text-left hover:bg-muted/50"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-sm">{r.feature_key}</span><div className="flex gap-2"><Badge variant={r.enabled?"default":"secondary"}>{r.enabled?"Enabled":"Disabled"}</Badge><Badge variant="outline">{r.release_state}</Badge><Badge variant="outline">{r.rollout_percentage}%</Badge></div></div><p className="mt-1 text-xs text-muted-foreground">{r.change_reason} · {r.updated_by.slice(0,8)}</p></button>)}</div>
  </CardContent></Card>
 </div>;
}
