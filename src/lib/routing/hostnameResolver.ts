import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ProductionHostResolution = {
  content_id: string;
  content_slug: string;
  content_title: string;
  content_type: string;
  screening_id: string | null;
  domain_branding: Record<string, unknown> | null;
};

const normalizeHost = (host: string) => host.trim().toLowerCase().replace(/:\\d+$/, "").replace(/\\.$/, "");

const isJsonObject = (value: Json): value is { [key: string]: Json | undefined } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function resolveProductionHostname(hostname = window.location.hostname): Promise<ProductionHostResolution | null> {
  const host = normalizeHost(hostname);
  if (!host || host === "localhost" || host.endsWith(".vercel.app")) return null;
  const { data, error } = await supabase.rpc("resolve_release_domain", { p_hostname: host });
  if (error) throw new Error("Production storefront hostname could not be resolved.");
  const row = data?.[0];
  if (!row?.content_id || !row.content_slug) return null;
  return {
    content_id: row.content_id,
    content_slug: row.content_slug,
    content_title: row.content_title,
    content_type: row.content_type,
    screening_id: row.screening_id || null,
    domain_branding: isJsonObject(row.domain_branding) ? row.domain_branding : null,
  };
}

export function isProductionStorefrontHost(hostname = window.location.hostname): boolean {
  const host = normalizeHost(hostname);
  return host.endsWith(".degametv.com") && host !== "degametv.com" && !["www","api","admin","studio","watch","app","cdn","auth"].includes(host.split(".")[0]);
}
