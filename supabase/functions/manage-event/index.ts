import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.object({
  screeningId: z.string().uuid(),
  action: z.enum(["upcoming", "live", "replay", "archived", "cancel"]),
  replayPriceNgn: z.number().min(0).max(10_000_000).optional(),
  replayPriceUsd: z.number().min(0).max(100_000).optional(),
  replayAccessHours: z.number().int().min(1).max(720).optional(),
  reason: z.string().max(500).optional(),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const p = parsed.data;

    const { data: s } = await admin.from("screenings").select("id, title, content_id, tenant_id").eq("id", p.screeningId).maybeSingle();
    if (!s) return json({ error: "Event not found" }, 404);
    const { data: c } = await admin.from("content").select("creator_id").eq("id", s.content_id).maybeSingle();
    const { data: isAdmin } = await admin.rpc("is_super_admin", { _user_id: user.id });
    if (!isAdmin && c?.creator_id !== user.id) return json({ error: "Not allowed" }, 403);

    if (p.action !== "cancel") {
      const patch: Record<string, unknown> = { lifecycle: p.action };
      if (p.action === "replay") {
        if (p.replayPriceNgn !== undefined) patch.replay_price_ngn = p.replayPriceNgn;
        if (p.replayPriceUsd !== undefined) patch.replay_price_usd = p.replayPriceUsd;
        if (p.replayAccessHours !== undefined) patch.replay_access_hours = p.replayAccessHours;
      }
      const { error } = await admin.from("screenings").update(patch).eq("id", s.id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, lifecycle: p.action });
    }

    // Refund through the original payment provider before changing ticket state.
    // A local ledger entry is never proof that money was returned.
    const { data: tickets, error: ticketError } = await admin.from("screening_tickets")
      .select("id, email, price, currency")
      .eq("screening_id", s.id)
      .eq("payment_status", "completed")
      .is("refunded_at", null);
    if (ticketError) return json({ error: "Paid tickets could not be loaded; cancellation was not applied." }, 503);

    let refunded = 0;
    const pendingRefunds: string[] = [];
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if ((tickets || []).length > 0 && (!serviceKey || !supabaseUrl)) {
      return json({ error: "Refund service is unavailable; cancellation was not applied." }, 503);
    }
    for (const ticket of tickets || []) {
      const response = await fetch(supabaseUrl + "/functions/v1/process-refund", {
        method: "POST",
        headers: { Authorization: "Bearer " + serviceKey, apikey: serviceKey, "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, reason: p.reason || "Event cancelled", requestedBy: user.id }),
        signal: AbortSignal.timeout(25000),
      }).catch(() => null);
      const result = response ? await response.json().catch(() => null) : null;
      if (response?.ok && result?.success === true) refunded++;
      else pendingRefunds.push(ticket.id);
    }

    // Refund canonical live tickets through their original provider adapters.
    const { data: liveTickets, error: liveTicketError } = await admin.from("tickets")
      .select("id,metadata,revoked_at")
      .eq("content_id", s.content_id)
      .not("stream_id", "is", null)
      .filter("metadata->>screening_id", "eq", s.id)
      .is("revoked_at", null);
    if (liveTicketError) return json({ error: "Live tickets could not be loaded; cancellation was not applied.", refunded, pendingRefunds }, 503);
    if ((liveTickets || []).length > 0 && (!serviceKey || !supabaseUrl)) {
      return json({ error: "Refund service is unavailable; cancellation was not applied.", refunded, pendingRefunds }, 503);
    }
    for (const ticket of liveTickets || []) {
      const response = await fetch(supabaseUrl + "/functions/v1/process-refund", {
        method: "POST",
        headers: { Authorization: "Bearer " + serviceKey, apikey: serviceKey, "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, reason: p.reason || "Event cancelled", requestedBy: user.id }),
        signal: AbortSignal.timeout(25000),
      }).catch(() => null);
      const result = response ? await response.json().catch(() => null) : null;
      if (response?.ok && result?.success === true) refunded++;
      else pendingRefunds.push(ticket.id);
    }

    const now = new Date().toISOString();
    const { data: eventStreams, error: streamLookupError } = await admin.from("live_streams")
      .select("id,status")
      .eq("tenant_id", s.tenant_id || "")
      .contains("metadata", { screening_id: s.id });
    if (streamLookupError) return json({ error: "Event stream state could not be reconciled; cancellation is pending.", refunded, pendingRefunds }, 503);
    if ((eventStreams || []).length > 0) {
      const { error: streamEndError } = await admin.from("live_streams")
        .update({ status: "ended", actual_ended_at: now, actual_end: now, updated_at: now })
        .in("id", eventStreams.map((stream: any) => stream.id))
        .in("status", ["scheduled", "starting", "live"]);
      if (streamEndError) return json({ error: "The live stream could not be closed; cancellation is pending.", refunded, pendingRefunds }, 503);
    }
    const { error: cancelError } = await admin.from("screenings")
      .update({ lifecycle: "cancelled", cancelled_at: now }).eq("id", s.id);
    if (cancelError) return json({
      error: "Refund processing finished but the screening cancellation state needs reconciliation.",
      refunded, pendingRefunds,
    }, 503);

    await admin.from("audit_logs").insert({
      user_id: user.id, action: "event_cancel_refund", entity_type: "screening", entity_id: s.id,
      new_data: { refunded, pending_refund_ticket_ids: pendingRefunds, reason: p.reason || null },
    });
    return json({
      success: true, refunded, pendingRefunds,
      message: pendingRefunds.length
        ? "Screening cancelled. Some refunds could not be confirmed and require reconciliation."
        : "Screening cancelled and all paid tickets were refunded by the payment provider.",
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
