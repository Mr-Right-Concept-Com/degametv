import { supabase } from "@/integrations/supabase/client";

export type ProductionHostResolution = {
  content_id: string;
  content_slug: string;
  content_title: string;
  content_type: string;
  screening_id: string | null;
  domain_branding: Record<string, unknown> | null;
};

const normalizeHost = (host: string) => host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");

export async function resolveProductionHostname(hostname = window.location.hostname): Promise<ProductionHostResolution | null> {
  const host = normalizeHost(hostname);
  if (!host || host === "localhost" || host.endsWith(".vercel.app")) return null;
  const { data, error } = await supabase.rpc("resolve_release_domain", { p_hostname: host });
  if (error) throw new Error("Production storefront hostname could not be resolved.");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.content_id || !row?.content_slug) return null;
  return row as ProductionHostResolution;
}

export function isProductionStorefrontHost(hostname = window.location.hostname): boolean {
  const host = normalizeHost(hostname);
  return host.endsWith(".degametv.com") && host !== "degametv.com" && !["www","api","admin","studio","watch","app","cdn","auth"].includes(host.split(".")[0]);
}
