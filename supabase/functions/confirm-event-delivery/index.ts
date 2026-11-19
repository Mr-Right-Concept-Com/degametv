import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return json({ error: "Settlement verification is unavailable." }, 503);
  const auth = req.headers.get("Authorization") || "";
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") || "", {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Authentication required." }, 401);
  const { data: isAdmin, error: adminError } = await db.rpc("is_super_admin", { _user_id: user.id });
  if (adminError || !isAdmin) return json({ error: "Platform settlement verification permission is required." }, 403);

  try {
    const body = await req.json();
    const sourceType = body?.sourceType;
    const eventId = typeof body?.eventId === "string" ? body.eventId : "";
    const evidenceReference = typeof body?.evidenceReference === "string" ? body.evidenceReference.trim() : "";
    if (!eventId || !["screening", "live_stream", "content"].includes(sourceType)) return json({ error: "A valid event and delivery source are required." }, 400);

    let screeningId: string | null = null;
    let liveStreamId: string | null = null;
    let contentId: string | null = null;
    let eventEndedAt: string | null = null;
    let deliveryConfirmedAt: string | null = null;
    let evidence: Record<string, unknown> = {};

    if (sourceType === "live_stream") {
      const { data: stream, error } = await db.from("live_streams")
        .select("id,tenant_id,creator_id,status,actual_ended_at,recording_enabled,settlement_delivery_required,vod_replay_asset_url,metadata")
        .eq("id", eventId).maybeSingle();
      if (error || !stream || !stream.actual_ended_at) return json({ error: "The live event has not been authoritatively ended." }, 409);
      if (stream.recording_enabled && stream.settlement_delivery_required) {
        if (!stream.vod_replay_asset_url) return json({ error: "The required replay has not been processed and delivered." }, 409);
        const metadata = stream.metadata && typeof stream.metadata === "object" ? stream.metadata as Record<string, unknown> : {};
        if (evidenceReference && evidenceReference !== stream.vod_replay_asset_url &&
            evidenceReference !== metadata.recording_asset_id && evidenceReference !== metadata.recording_provider_asset_id) {
          return json({ error: "The supplied evidence does not match the platform's verified replay asset." }, 409);
        }
        evidence = { kind: "provider_replay_asset", asset_reference: stream.vod_replay_asset_url, provider: metadata.provider || null, provider_reference: metadata.provider_reference || null };
      } else {
        evidence = { kind: "platform_verified_live_end", stream_id: stream.id, actual_ended_at: stream.actual_ended_at, provider_reference: (stream.metadata as Record<string, unknown> | null)?.provider_reference || null };
      }
      liveStreamId = stream.id;
      const streamMetadata = stream.metadata && typeof stream.metadata === "object" ? stream.metadata as Record<string, unknown> : {};
      if (typeof streamMetadata.screening_id === "string") screeningId = streamMetadata.screening_id;
      eventEndedAt = stream.actual_ended_at;
      deliveryConfirmedAt = stream.actual_ended_at;
    } else if (sourceType === "screening") {
      const { data: screening, error } = await db.from("screenings")
        .select("id,tenant_id,content_id,event_type,lifecycle,live_ended_at,live_replay_ready_at,screening_date,status,cancelled_at")
        .eq("id", eventId).maybeSingle();
      if (error || !screening || screening.status !== "published" || screening.cancelled_at) return json({ error: "The screening is unavailable or cancelled." }, 409);
      screeningId = screening.id;
      if (screening.event_type === "live") {
        const { data: stream } = await db.from("live_streams")
          .select("id,actual_ended_at,recording_enabled,settlement_delivery_required,vod_replay_asset_url,metadata")
          .contains("metadata", { screening_id: screening.id }).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (stream) {
          if (!stream.actual_ended_at) return json({ error: "The live event has not ended." }, 409);
          if (stream.recording_enabled && stream.settlement_delivery_required && !stream.vod_replay_asset_url) return json({ error: "The required replay is not ready." }, 409);
          liveStreamId = stream.id;
          eventEndedAt = stream.actual_ended_at;
          deliveryConfirmedAt = stream.actual_ended_at;
          evidence = stream.recording_enabled && stream.settlement_delivery_required
            ? { kind: "provider_replay_asset", asset_reference: stream.vod_replay_asset_url, provider: (stream.metadata as Record<string, unknown> | null)?.provider || null }
            : { kind: "platform_verified_live_end", actual_ended_at: stream.actual_ended_at };
        } else {
          if (!screening.live_ended_at || !screening.live_replay_ready_at) return json({ error: "Platform delivery evidence for this live event is incomplete." }, 409);
          eventEndedAt = screening.live_ended_at; deliveryConfirmedAt = screening.live_replay_ready_at;
          evidence = { kind: "screening_replay_ready", replay_ready_at: screening.live_replay_ready_at };
        }
      } else {
        if (!screening.live_replay_ready_at) return json({ error: "The premiere replay or delivered screening asset is not ready." }, 409);
        eventEndedAt = screening.live_ended_at || screening.screening_date;
        deliveryConfirmedAt = screening.live_replay_ready_at;
        evidence = { kind: "premiere_replay_ready", replay_ready_at: screening.live_replay_ready_at, content_id: screening.content_id };
      }
    } else {
      const { data: content, error } = await db.from("content")
        .select("id,tenant_id,creator_id,status,updated_at").eq("id", eventId).maybeSingle();
      if (error || !content || content.status !== "published") return json({ error: "Only published content can be delivery-verified." }, 409);
      contentId = content.id;
      eventEndedAt = content.updated_at || new Date().toISOString();
      deliveryConfirmedAt = new Date().toISOString();
      evidence = { kind: "platform_verified_published_content", content_id: content.id, published_updated_at: content.updated_at };
    }

    const evidencePayload = { ...evidence, verified_by: user.id, verified_at: new Date().toISOString(), verification_source: "platform_admin_control_plane" };
    const updated: Array<{ id: string; hold_status: string; release_at: string | null }> = [];
    const targets = [
      ...(liveStreamId ? [{ column: "live_stream_id", id: liveStreamId }] : []),
      ...(screeningId ? [{ column: "screening_id", id: screeningId }] : []),
      ...(contentId ? [{ column: "content_id", id: contentId }] : []),
    ];
    for (const target of targets) {
      const { data: rows, error: updateError } = await db.from("event_settlement_holds").update({
        event_ended_at: eventEndedAt,
        delivery_confirmed_at: deliveryConfirmedAt,
        delivery_evidence: evidencePayload,
        updated_at: new Date().toISOString(),
      }).eq(target.column, target.id).eq("hold_status", "held").select("id,hold_status,release_at");
      if (updateError) return json({ error: "Delivery evidence was verified but settlement holds could not be updated." }, 503);
      if (rows) updated.push(...rows);
    }

    await db.from("audit_logs").insert({
      user_id: user.id, action: "event.delivery.verified", entity_type: "event_settlement",
      entity_id: eventId, new_data: { source_type: sourceType, evidence, updated_holds: updated.length },
    });
    return json({ success: true, verified: true, updatedHolds: updated.length, holds: updated });
  } catch (error) {
    console.error("confirm-event-delivery", error);
    return json({ error: "Delivery verification failed safely." }, 500);
  }
});
