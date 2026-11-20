import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { invokeFn } from "@/lib/invokeFn";
import { useAuth } from "@/hooks/useAuth";

type RuntimeCountry = {country_code:string;currency_code:string;currency_symbol:string|null;locale_code:string;timezone_name:string|null;metadata?:Record<string,unknown>};
type RuntimeConfig = {
 webAppUrl?:string|null;
 geo:{countryCode:string|null;source:string};
 locale:string;
 language:string;
 timezone:string;
 currency:string;
 baseCurrency:string;
 currencySymbol:string|null;
 countryCurrency:RuntimeCountry|null;
 countries:RuntimeCountry[];
 features:Array<{key:string;enabled:boolean}>;
 releases:Array<{key:string;version:string;rolloutId:string}>;
 generatedAt:string;
 cohortId:string;
};
type RuntimeState = {config:RuntimeConfig|null;loading:boolean;refresh:()=>Promise<void>};
const RuntimeContext=createContext<RuntimeState>({config:null,loading:true,refresh:async()=>undefined});
function visitorId(){
 if(typeof window==="undefined")return "00000000-0000-4000-8000-000000000000";
 let id=window.localStorage.getItem("degame_runtime_visitor");
 if(!id||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)){
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&0x0f)|0x40;bytes[8]=(bytes[8]&0x3f)|0x80;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
  id=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  window.localStorage.setItem("degame_runtime_visitor",id);
 }
 return id;
}
export function RuntimeConfigProvider({children}:{children:ReactNode}){
 const {user}=useAuth();
 const [config,setConfig]=useState<RuntimeConfig|null>(null);
 const [loading,setLoading]=useState(true);
 const mountedRef = useRef(false);
 const requestIdRef = useRef(0);
 const refresh=useCallback(async()=>{
  const requestId = ++requestIdRef.current;
  if (mountedRef.current) setLoading(true);
  try {
   const r = await invokeFn<RuntimeConfig>("runtime-config",{visitorId:user?.id??visitorId()});
   if (mountedRef.current && requestId === requestIdRef.current && r.ok && r.data) setConfig(r.data);
  } catch {
   // Preserve the last known configuration when local storage or browser APIs fail.
  } finally {
   if (mountedRef.current && requestId === requestIdRef.current) setLoading(false);
  }
 },[user?.id]);
 useEffect(()=>{
  mountedRef.current = true;
  void refresh();
  const timer=window.setInterval(()=>void refresh(),30000);
  const onFocus=()=>void refresh();
  window.addEventListener("focus",onFocus);
  return()=>{
   mountedRef.current = false;
   requestIdRef.current += 1;
   window.clearInterval(timer);
   window.removeEventListener("focus",onFocus);
  };
 },[refresh]);
 const value=useMemo(()=>({config,loading,refresh}),[config,loading,refresh]);
 return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}
export function useRuntimeConfig(){return useContext(RuntimeContext);}