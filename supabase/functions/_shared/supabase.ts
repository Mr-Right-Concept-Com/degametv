import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.87.1";
import type { Database } from "./database.types.ts";

export type TypedSupabaseClient = SupabaseClient<Database>;

const authOptions = { persistSession: false, autoRefreshToken: false } as const;

export function createServiceClient(url: string, serviceRoleKey: string): TypedSupabaseClient {
  return createClient<Database>(url, serviceRoleKey, { auth: authOptions });
}

export function createUserClient(url: string, anonKey: string, authorization: string): TypedSupabaseClient {
  return createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: authOptions,
  });
}
