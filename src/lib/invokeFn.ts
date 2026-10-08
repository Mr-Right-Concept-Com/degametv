import { supabase } from '@/integrations/supabase/client';

export type FnResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

const FRIENDLY: Record<number, string> = {
  401: 'Please sign in again.',
  403: "You don't have permission to do that.",
  404: 'This service is not available yet. Please try again shortly.',
  429: 'Too many requests — please wait a moment and retry.',
  502: 'An outside service did not respond correctly. Please try again.',
  503: 'This service is not configured yet.',
};

/** Calls a backend function and always returns a clear, user-readable outcome. */
export async function invokeFn<T = any>(name: string, body: Record<string, unknown>): Promise<FnResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (!error && data && data.success !== false && !data.error) return { ok: true, data };
    let status: number | undefined;
    let msg: unknown = data?.error;
    const ctx = (error as any)?.context;
    if (ctx) {
      status = ctx.status;
      try { const j = await ctx.clone().json(); msg = msg || j?.error || j?.message; } catch { /* not json */ }
    }
    if (msg && typeof msg === 'object') msg = Object.values(msg as any).flat().join(', ');
    return { ok: false, status, error: (typeof msg === 'string' && msg) || (status && FRIENDLY[status]) || 'Could not reach the server. Check your connection and try again.' };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}
