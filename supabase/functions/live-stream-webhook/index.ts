import { createClient } from "npm:@supabase/supabase-js@2";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
const safeEqual = (left: string, right: string) => {
  if (!left || left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
};
const hmac = async (secret: string, raw: string, algorithm: "SHA-256" | "SHA-512") => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: algorithm }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
};

Deno.serve(async req => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return json(503, { error: "Webhook unavailable" });
  const raw = await req.text();
  if (raw.length > 1024 * 1024) return json(413, { error: "Webhook payload too large" });

  try {
    const event = JSON.parse(raw);
    if (!event || typeof event !== "object" || Array.isArray(event)) return json(400, { error: "Invalid event" });
    const reference = event.provider_reference;
    const rawEventId = event.id ?? event.event_id;
    const eventId = typeof rawEventId === "string" || typeof rawEventId === "number" ? String(rawEventId) : "";
    if (typeof reference !== "string" || reference.length < 1 || reference.length > 240
      || !eventId || eventId.length > 255)
      return json(400, { error: "Provider reference and stable event id are required" });

    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: stream, error: streamError } = await db.from("live_streams")
      .select("id,tenant_id,metadata,lifecycle_status")
      .eq("metadata->>provider_reference", reference).maybeSingle();
    if (streamError || !stream) return json(404, { error: "Stream not found" });
    const providerKey = stream.metadata?.provider;
    if (typeof providerKey !== "string" || !providerKey) return json(409, { error: "Stream provider is not pinned" });

    const [{ data: binding, error: bindingError }, { data: secrets, error: secretError }] = await Promise.all([
      db.from("service_provider_bindings").select("provider_key,settings")
        .eq("capability", "live_streaming").eq("provider_key", providerKey).maybeSingle(),
      db.rpc("get_service_provider_admin_secret", { p_capability: "live_streaming", p_provider_key: providerKey }),
    ]);
    const vault = Array.isArray(secrets) ? secrets[0] : null;
    const webhookSecret = vault?.webhook_secret;
    if (bindingError || secretError || !binding || !webhookSecret)
      return json(503, { error: "Provider webhook secret is unavailable in Vault" });

    const settings = binding.settings || {};
    const signatureHeader = typeof settings.signature_header === "string" ? settings.signature_header : "x-provider-signature";
    const algorithm = settings.signature_algorithm === "SHA-256" ? "SHA-256" : "SHA-512";
    const supplied = (req.headers.get(signatureHeader) || "").toLowerCase()
      .replace(/^sha256=/, "").replace(/^sha512=/, "");
    if (!safeEqual(supplied, await hmac(webhookSecret, raw, algorithm)))
      return json(401, { error: "Invalid provider signature" });

    const rawType = event.type || event.event || event.status;
    const configuredMap = settings.webhook_event_map && typeof settings.webhook_event_map === "object"
      ? settings.webhook_event_map : {};
    const defaults: Record<string, string> = {
      live: "stream.active", "stream.live": "stream.active",
      connected: "stream.connected", "stream.connected": "stream.connected",
      disconnected: "stream.disconnected", "stream.disconnected": "stream.disconnected",
      ended: "stream.ended", "stream.ended": "stream.ended",
      replay_ready: "recording.ready", "recording.ready": "recording.ready",
      replay_failed: "recording.failed", "recording.failed": "recording.failed",
    };
    const normalized = typeof configuredMap[rawType] === "string" ? configuredMap[rawType] : defaults[rawType];
    const allowedEvents = new Set(["stream.connected", "stream.active", "stream.disconnected",
      "stream.ended", "recording.ready", "recording.failed"]);
    if (!allowedEvents.has(normalized)) return json(200, { received: true, ignored: true });

    const payload: Record<string, unknown> = { source_event: rawType };
    if (normalized === "recording.ready") {
      const recordingUrl = event.replay_playback_url || event.replay_url || event.data?.replay_url;
      if (typeof recordingUrl !== "string") return json(400, { error: "Replay URL is required for recording-ready events" });
      let parsedUrl: URL;
      try { parsedUrl = new URL(recordingUrl); } catch { return json(400, { error: "Invalid replay URL" }); }
      const allowedOrigins = Array.isArray(settings.allowed_recording_origins) ? settings.allowed_recording_origins : [];
      if (parsedUrl.protocol !== "https:" || !allowedOrigins.includes(parsedUrl.origin))
        return json(400, { error: "Replay URL origin is not allowlisted" });
      payload.replay_url = parsedUrl.toString();
    }

    const { data, error } = await db.rpc("apply_stream_provider_event", {
      p_provider_key: providerKey,
      p_provider_reference: reference,
      p_event_id: eventId,
      p_event_type: normalized,
      p_payload: payload,
    });
    if (error) return json(error.message?.includes("provider_stream_not_found") ? 404 : 409,
      { error: "Provider event could not be reconciled" });
    return json(200, data || { received: true });
  } catch (error) {
    console.error("live-stream-webhook", error);
    return json(400, { error: "Invalid provider webhook payload" });
  }
});
