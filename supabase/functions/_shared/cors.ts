export type CorsHeaders = Readonly<Record<string, string>>;

export const defaultCorsHeaders: CorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function createCorsHeaders(headers: CorsHeaders = {}): Headers {
  return new Headers({ ...defaultCorsHeaders, ...headers });
}

export const corsHeaders = defaultCorsHeaders;
