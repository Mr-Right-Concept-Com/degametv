import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const catalogViewSchema = z.enum(["public_content_catalog", "public_screenings_catalog"]);
type CatalogView = z.infer<typeof catalogViewSchema>;

interface CatalogQuery {
  view: CatalogView;
  select: string;
  filters?: Record<string, string>;
  order?: string;
  signal?: AbortSignal;
}

export async function fetchCatalogRows<T>(
  query: CatalogQuery,
  rowSchema: z.ZodType<T>,
): Promise<T[]> {
  const view = catalogViewSchema.parse(query.view);
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !publishableKey) throw new Error("Supabase catalog configuration is unavailable.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error("Unable to resolve the current session.");
  const params = new URLSearchParams({ select: query.select });
  for (const [column, value] of Object.entries(query.filters ?? {})) params.set(column, value);
  if (query.order) params.set("order", query.order);

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/rest/v1/${view}?${params.toString()}`,
    {
      signal: query.signal,
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${sessionData.session?.access_token ?? publishableKey}`,
        Accept: "application/json",
      },
    },
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Catalog request failed (${response.status}): ${message.slice(0, 240)}`);
  }
  const payload: unknown = await response.json();
  const parsed = z.array(rowSchema).safeParse(payload);
  if (!parsed.success) throw new Error("Catalog response failed runtime validation.");
  return parsed.data;
}
