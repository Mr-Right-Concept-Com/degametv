import type { ReactNode } from "react";
import { useRuntimeConfig } from "@/contexts/RuntimeConfigContext";

export function FeatureGate({ featureKey, children, fallback }: { featureKey: string; children: ReactNode; fallback?: ReactNode }) {
  const { config, loading } = useRuntimeConfig();
  const unavailable = <div role="status" className="mx-auto flex min-h-[28vh] max-w-xl items-center justify-center px-6 text-center text-sm text-muted-foreground">This DeGameTV feature is temporarily unavailable. Please try again shortly.</div>;
  if (loading) return <>{fallback ?? <div aria-busy="true" className="flex min-h-[28vh] items-center justify-center text-sm text-muted-foreground">Loading platform configuration…</div>}</>;
  if (!config) return <>{fallback ?? unavailable}</>;
  const state = config.features.find((feature) => feature.key === featureKey);
  if (!state?.enabled) return <>{fallback ?? unavailable}</>;
  return <>{children}</>;
}
