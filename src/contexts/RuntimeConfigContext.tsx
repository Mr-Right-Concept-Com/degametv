import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { invokeFn } from "@/lib/invokeFn";
import { useAuth } from "@/hooks/useAuth";

type RuntimeCountry = {country_code:string;currency_code:string;currency_symbol:string|null;locale_code:string;timezone_name:string|null;metadata?:Record<string,unknown>};
type RuntimeConfig = {
 webAppUrl?:string|null;
 geo:{countryCode:string|null;source:string};
 locale:string;
 currency:string;
 currencySymbol:string|null;
 countryCurrency:RuntimeCountry|null;
 countries:RuntimeCountry[];
 features:Array<{key:string;enabled:boolean}>;
 generatedAt:string;
 cohortId:string;
};
type RuntimeState = {config:RuntimeConfig|null;loading:boolean;refresh:()=>Promise<void>};
const RuntimeContext=createContext<RuntimeState>({config:null,loading:true,refresh:async()=>undefined});
function visitorId(){
 if(typeof window==="undefined")return "server-render";
 let id=window.localStorage.getItem("degame_runtime_visitor");
 if(!id){id=typeof crypto.randomUUID==="function"?crypto.randomUUID():`visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;window.localStorage.setItem("degame_runtime_visitor",id);}
 return id;
}
export function RuntimeConfigProvider({children}:{children:ReactNode}){
 const {user}=useAuth();
 const [config,setConfig]=useState<RuntimeConfig|null>(null);
 const [loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
  setLoading(true);
  try{const r=await invokeFn<RuntimeConfig>("runtime-config",{visitorId:user?.id??visitorId()});if(r.ok&&r.data)setConfig(r.data);}
  finally{setLoading(false);}
 },[user?.id]);
 useEffect(()=>{void refresh();const timer=window.setInterval(()=>void refresh(),30000);const onFocus=()=>void refresh();window.addEventListener("focus",onFocus);return()=>{window.clearInterval(timer);window.removeEventListener("focus",onFocus);};},[refresh]);
 const value=useMemo(()=>({config,loading,refresh}),[config,loading,refresh]);
 return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}
export function useRuntimeConfig(){return useContext(RuntimeContext);}
