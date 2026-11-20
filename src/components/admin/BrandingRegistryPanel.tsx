import { useCallback,useEffect,useState } from "react";
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { invokeFn } from "@/lib/invokeFn";
import { toast } from "sonner";
import { Loader2,RefreshCw,Palette } from "lucide-react";

type BrandConfig={
 platformName:string;tagline:string;primaryColor:string;secondaryColor:string;accentColor:string;backgroundColor:string;
 fontFamily:string;customDomain:string;supportEmail:string;logoUrl:string;faviconUrl:string;
};
type BrandRecord={brand_key:string;brand_config:Partial<BrandConfig>;is_public:boolean;version:number;updated_at:string};
const defaults:BrandConfig={
 platformName:"DeGameTV",tagline:"Your cinema. Your premiere.",primaryColor:"#ed1c18",secondaryColor:"#171717",
 accentColor:"#ffffff",backgroundColor:"#080808",fontFamily:"Inter",customDomain:"",supportEmail:"",
 logoUrl:"/brand/degametv-lockup.svg",faviconUrl:"/brand/degametv-icon.svg",
};
const call=async<T,>(body:Record<string,unknown>)=>{
 const result=await invokeFn<{result:T}>("admin-godmode",body);
 if(!result.ok)throw new Error(result.error);
 return result.data?.result as T;
};

export function BrandingRegistryPanel(){
 const [brand,setBrand]=useState<BrandConfig>(defaults);
 const [version,setVersion]=useState(0);
 const [isPublic,setIsPublic]=useState(true);
 const [reason,setReason]=useState("Administrator updated canonical platform branding");
 const [loading,setLoading]=useState(false);
 const [saving,setSaving]=useState(false);
 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const record=await call<BrandRecord>({action:"branding_get"});
   setBrand({...defaults,...record.brand_config});
   setVersion(record.version);
   setIsPublic(record.is_public);
  }catch(e){toast.error(e instanceof Error ? e.message : 'Operation failed');}finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const update=(key:keyof BrandConfig,value:string)=>setBrand(current=>({...current,[key]:value}));
 const save=async()=>{
  if(version<1){toast.error("Load the current branding version before saving.");return;}
  setSaving(true);
  try{
   const record=await call<BrandRecord>({action:"branding_set",brandKey:"platform.default",brandConfig:brand,isPublic,expectedVersion:version,reason});
   setVersion(record.version);
   setBrand({...defaults,...record.brand_config});
   toast.success("Canonical branding updated. Connected web clients refresh through realtime.");
  }catch(e){toast.error(e instanceof Error ? e.message : 'Operation failed');}finally{setSaving(false);}
 };
 const colorField=(key:"primaryColor"|"secondaryColor"|"accentColor"|"backgroundColor",label:string)=><div className="space-y-2"><Label>{label}</Label><div className="flex items-center gap-2"><Input type="color" className="h-10 w-14 p-1" value={brand[key]} onChange={e=>update(key,e.target.value)}/><Input value={brand[key]} maxLength={7} onChange={e=>update(key,e.target.value)}/></div></div>;
 return <Card>
  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4"/>Central branding registry</CardTitle><CardDescription>One versioned source of truth for platform name, logos, palette, typography, support identity and canonical domain. Public changes propagate through the branding registry realtime channel without a client rebuild.</CardDescription></CardHeader>
  <CardContent className="space-y-4">
   <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">platform.default · v{version||"—"}</Badge><Badge variant={isPublic?"default":"secondary"}>{isPublic?"Public runtime brand":"Private draft"}</Badge><Button variant="ghost" size="sm" onClick={()=>void load()} disabled={loading||saving}><RefreshCw className="mr-2 h-4 w-4"/>Reload</Button></div>
   <div className="grid gap-3 sm:grid-cols-2">
    <div className="space-y-2"><Label>Platform name</Label><Input value={brand.platformName} maxLength={80} onChange={e=>update("platformName",e.target.value)}/></div>
    <div className="space-y-2"><Label>Tagline</Label><Input value={brand.tagline} maxLength={180} onChange={e=>update("tagline",e.target.value)}/></div>
    {colorField("primaryColor","Primary colour")}
    {colorField("secondaryColor","Secondary colour")}
    {colorField("accentColor","Accent colour")}
    {colorField("backgroundColor","Background colour")}
    <div className="space-y-2"><Label>Font family</Label><Input value={brand.fontFamily} maxLength={100} onChange={e=>update("fontFamily",e.target.value)}/></div>
    <div className="space-y-2"><Label>Brand display domain (DNS provisioning is separate)</Label><Input value={brand.customDomain} maxLength={253} onChange={e=>update("customDomain",e.target.value.toLowerCase())} placeholder="degametv.com"/></div>
    <div className="space-y-2"><Label>Support email</Label><Input type="email" value={brand.supportEmail} maxLength={254} onChange={e=>update("supportEmail",e.target.value)}/></div>
    <div className="space-y-2"><Label>Logo URL or same-origin path</Label><Input value={brand.logoUrl} maxLength={2048} onChange={e=>update("logoUrl",e.target.value)}/></div>
    <div className="space-y-2"><Label>Favicon URL or same-origin path</Label><Input value={brand.faviconUrl} maxLength={2048} onChange={e=>update("faviconUrl",e.target.value)}/></div>
   </div>
   <div className="space-y-2"><Label>Change reason</Label><Input value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/></div>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPublic} onChange={e=>setIsPublic(e.target.checked)}/> Publish to public runtime clients</label>
   <Button onClick={()=>void save()} disabled={loading||saving||version<1||reason.trim().length<3}>
    {(loading||saving)&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save branding version
   </Button>
  </CardContent>
 </Card>;
}