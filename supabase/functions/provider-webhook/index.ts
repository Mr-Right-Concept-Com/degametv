import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const readPath = (value: unknown, path: unknown): unknown => {
  if (typeof path !== "string" || !path || path.length > 160) return undefined;
  return path.split(".").reduce<unknown>((current, key) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
};
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
const constantTimeEqual = (left: string, right: string) => {
  if (!left || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
};
const hmac = async (secret: string, raw: string, algorithm: "SHA-256" | "SHA-512") => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: algorithm }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
};

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return json({ error: "Webhook processor unavailable." }, 503);

  const providerKey = new URL(req.url).searchParams.get("provider");
  if (!providerKey || !/^[a-zA-Z0-9_-]{2,80}$/.test(providerKey)) return json({ error: "Provider is required." }, 400);
  const raw = await req.text();
  if (raw.length > 1024 * 1024) return json({ error: "Webhook payload is too large." }, 413);
  let event: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    event = parsed as Record<string, unknown>;
  } catch { return json({ error: "Invalid webhook payload." }, 400); }

  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const [{ data: binding, error: bindingError }, { data: secrets, error: secretError }] = await Promise.all([
      db.from("service_provider_bindings").select("provider_key,settings,is_live")
        .eq("capability", "live_streaming").eq("provider_key", providerKey).maybeSingle(),
      db.rpc("get_service_provider_admin_secret", { p_capability: "live_streaming", p_provider_key: providerKey }),
    ]);
    const vault = Array.isArray(secrets) ? secrets[0] : null;
    const settings = binding?.settings && typeof binding.settings === "object" ? binding.settings : {};
    const webhookSecret = vault?.webhook_secret;
    if (bindingError || secretError || !binding || !webhookSecret)
      return json({ error: "Provider webhook secret is not configured in Vault." }, 503);

    const signatureHeader = typeof settings.webhook_signature_header === "string"
      ? settings.webhook_signature_header
      : typeof settings.signature_header === "string" ? settings.signature_header : "x-provider-signature";
    const algorithm = (settings.webhook_signature_algorithm || settings.signature_algorithm) === "SHA-256" ? "SHA-256" : "SHA-512";
    const received = (req.headers.get(signatureHeader) || "").toLowerCase()
      .replace(/^sha256=/, "").replace(/^sha512=/, "");
    const expected = await hmac(webhookSecret, raw, algorithm);
    if (!constantTimeEqual(received, expected)) return json({ error: "Invalid provider signature." }, 401);

    const eventIdValue = readPath(event, settings.webhook_event_id_path || "id")
      ?? readPath(event, "event_id");
    const eventNameValue = readPath(event, settings.webhook_event_type_path || "type")
      ?? readPath(event, "event");
    const providerReference = readPath(event, settings.webhook_reference_path);
    if (typeof eventIdValue !== "string" || !eventIdValue || eventIdValue.length > 255
      || typeof eventNameValue !== "string" || typeof providerReference !== "string" || !providerReference)
      return json({ error: "Configure webhook_event_id_path, webhook_event_type_path and webhook_reference_path for this provider." }, 400);

    const eventMap = settings.webhook_event_map && typeof settings.webhook_event_map === "object"
      ? settings.webhook_event_map as Record<string, unknown> : {};
    const normalized = eventMap[eventNameValue];
    const allowed = new Set(["stream.connected", "stream.active", "stream.disconnected", "stream.ended", "recording.ready", "recording.failed"]);
    if (typeof normalized !== "string" || !allowed.has(normalized))
      return json({ received: true, ignored: true, reason: "unmapped_event" });

    const safePayload: Record<string, unknown> = { provider_event_name: eventNameValue };
    if (normalized === "recording.ready") {
      const rawUrl = readPath(event, settings.webhook_replay_url_path || "data.replay_url");
      if (typeof rawUrl !== "string") return json({ error: "Replay URL missing from recording-ready event." }, 400);
      let replayUrl: URL;
      try { replayUrl = new URL(rawUrl); } catch { return json({ error: "Invalid replay URL." }, 400); }
      const origins = Array.isArray(settings.allowed_recording_origins) ? settings.allowed_recording_origins : [];
      if (replayUrl.protocol !== "https:" || !origins.includes(replayUrl.origin))
        return json({ error: "Replay URL origin is not allowlisted for this provider." }, 400);
      safePayload.replay_url = replayUrl.toString();
    }

    const { data, error } = await db.rpc("apply_stream_provider_event", {
      p_provider_key: providerKey,
      p_provider_reference: providerReference,
      p_event_id: eventIdValue,
      p_event_type: normalized,
      p_payload: safePayload,
    });
    if (error) {
      const notFound = error.message?.includes("provider_stream_not_found");
      return json({ error: notFound ? "Provider stream reference is not registered." : "Provider event could not be reconciled." }, notFound ? 404 : 409);
    }
    return json(data || { received: true });
  } catch (error) {
    console.error("provider-webhook", error);
    return json({ error: "Webhook processing failed." }, 500);
  }
});
