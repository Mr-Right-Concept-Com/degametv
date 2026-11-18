import { supabase } from '@/integrations/supabase/client';

export type FnResult<T> = { ok: boolean; data?: T; error?: string; status?: number };

const FRIENDLY: Record<number, string> = {
  401: 'Please sign in again.',
  403: "You don't have permission to do that.",
  404: 'This service is not available yet. Please try again shortly.',
  429: 'Too many requests — please wait a moment and retry.',
  502: 'An outside service did not respond correctly. Please try again.',
  503: 'This service is not configured yet.',
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function messageFrom(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (!isRecord(value)) return undefined;
  const flattened = Object.values(value).flatMap((entry) =>
    Array.isArray(entry) ? entry : [entry],
  );
  const message = flattened.filter((entry) => typeof entry === 'string').join(', ');
  return message || undefined;
}

/** Calls a backend function and always returns a clear, user-readable outcome. */
export async function invokeFn<T = unknown>(name: string, body: Record<string, unknown>): Promise<FnResult<T>> {
  try {
    const { data: rawData, error } = await supabase.functions.invoke(name, { body });
    const data = isRecord(rawData) ? rawData : undefined;
    if (!error && data && data.success !== false && !data.error) {
      return { ok: true, data: rawData as T };
    }

    let status: number | undefined;
    let message: unknown = data?.error;
    const context = error && typeof error === 'object' && 'context' in error
      ? error.context
      : undefined;

    if (context instanceof Response) {
      status = context.status;
      try {
        const responseBody: unknown = await context.clone().json();
        if (isRecord(responseBody)) {
          message = message ?? responseBody.error ?? responseBody.message;
        }
      } catch {
        // Non-JSON error responses are handled by the friendly fallback below.
      }
    }

    return {
      ok: false,
      status,
      error: messageFrom(message) ?? (status ? FRIENDLY[status] : undefined)
        ?? 'Could not reach the server. Check your connection and try again.',
    };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}
