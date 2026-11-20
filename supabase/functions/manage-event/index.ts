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

    const { data: s } = await admin.from("screenings").select("id, title, content_id").eq("id", p.screeningId).maybeSingle();
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

    const { data: paymentConfigs, error: configError } = await admin.rpc(
      "get_service_provider_runtime_config",
      { p_capability: "payments" },
    );
    const paymentProvider = Array.isArray(paymentConfigs) ? paymentConfigs[0] : null;
    const refundPath = paymentProvider?.endpoints?.refund;
    const canRefund = !configError && typeof paymentProvider?.credential === "string" &&
      paymentProvider.credential.length > 0 && typeof refundPath === "string" &&
      refundPath.startsWith("/") && !refundPath.startsWith("//");

    let refunded = 0;
    const pendingRefunds: string[] = [];
    for (const ticket of tickets || []) {
      const { data: order, error: orderError } = await admin.from("guest_payment_orders")
        .select("provider, provider_reference, provider_transaction_id, amount_minor, currency, status")
        .eq("ticket_id", ticket.id)
        .eq("status", "paid")
        .maybeSingle();
      if (orderError || !order || order.provider !== paymentProvider?.provider_key || !canRefund ||
          (!order.provider_transaction_id && !order.provider_reference)) {
        pendingRefunds.push(ticket.id);
        continue;
      }

      const refundUrl = new URL(refundPath, paymentProvider.base_url);
      if (refundUrl.origin !== new URL(paymentProvider.base_url).origin) {
        pendingRefunds.push(ticket.id);
        continue;
      }
      const settings = paymentProvider.settings || {};
      const authHeader = typeof settings.credential_header === "string" ? settings.credential_header : "Authorization";
      const authPrefix = typeof settings.credential_prefix === "string" ? settings.credential_prefix : "Bearer ";
      const refundResponse = await fetch(refundUrl, {
        method: "POST",
        headers: { [authHeader]: authPrefix + paymentProvider.credential, "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: order.provider_transaction_id || order.provider_reference,
          reference: order.provider_reference,
          amount_minor: Number(order.amount_minor),
          currency: order.currency,
          reason: p.reason || "Event cancelled",
        }),
        signal: AbortSignal.timeout(15000),
      });
      const refundResult = await refundResponse.json().catch(() => null);
      if (!refundResponse.ok || refundResult?.accepted !== true || refundResult?.status !== "processed") {
        pendingRefunds.push(ticket.id);
        continue;
      }

      const now = new Date().toISOString();
      const { data: updatedTicket, error: updateError } = await admin.from("screening_tickets")
        .update({ refunded_at: now, refund_reason: p.reason || "Event cancelled", payment_status: "refunded" })
        .eq("id", ticket.id).eq("payment_status", "completed").is("refunded_at", null)
        .select("id").maybeSingle();
      if (updateError || !updatedTicket) {
        // Provider accepted the refund; leave an explicit reconciliation item rather
        // than claiming the local ticket state was updated.
        pendingRefunds.push(ticket.id);
        continue;
      }

      const { data: ledger } = await admin.from("wallet_ledger")
        .select("user_id, gross, fee, net")
        .eq("ticket_id", ticket.id).eq("kind", "sale").maybeSingle();
      if (ledger) {
        const { error: ledgerError } = await admin.from("wallet_ledger").insert({
          user_id: ledger.user_id, ticket_id: ticket.id, screening_id: s.id,
          gross: -ledger.gross, fee: -ledger.fee, net: -ledger.net,
          currency: ticket.currency || "NGN", kind: "refund", settles_at: now,
        });
        if (ledgerError) pendingRefunds.push(ticket.id);
      }
      refunded++;
    }

    const now = new Date().toISOString();
    const { error: cancelError } = await admin.from("screenings")
      .update({ lifecycle: "cancelled", cancelled_at: now }).eq("id", s.id);
    if (cancelError) return json({
      error: "Refund processing finished but the screening cancellation state needs reconciliation.",
      refunded, pendingRefunds,
    });

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
