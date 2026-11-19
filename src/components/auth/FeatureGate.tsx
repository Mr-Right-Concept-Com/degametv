import type { ReactNode } from "react";
import { useRuntimeConfig } from "@/contexts/RuntimeConfigContext";

export function FeatureGate({featureKey,children,fallback=null}:{featureKey:string;children:ReactNode;fallback?:ReactNode}){
 const {config}=useRuntimeConfig();
 const state=config?.features.find(feature=>feature.key===featureKey);
 if(state && !state.enabled)return <>{fallback}</>;
 return <>{children}</>;
}
