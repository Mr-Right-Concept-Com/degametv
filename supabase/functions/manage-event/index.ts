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

    // Cancel + refund every paid, unrefunded ticket
    const now = new Date().toISOString();
    await admin.from("screenings").update({ lifecycle: "cancelled", cancelled_at: now }).eq("id", s.id);
    const { data: tickets } = await admin.from("screening_tickets")
      .select("id, email, price, currency").eq("screening_id", s.id)
      .eq("payment_status", "completed").is("refunded_at", null);

    let refunded = 0;
    for (const t of tickets || []) {
      await admin.from("screening_tickets").update({
        refunded_at: now, refund_reason: p.reason || "Event cancelled", payment_status: "refunded",
      }).eq("id", t.id);
      const { data: led } = await admin.from("wallet_ledger").select("user_id, gross, fee, net").eq("ticket_id", t.id).eq("kind", "sale").maybeSingle();
      if (led) {
        await admin.from("wallet_ledger").insert({
          user_id: led.user_id, ticket_id: t.id, screening_id: s.id,
          gross: -led.gross, fee: -led.fee, net: -led.net, currency: t.currency || "NGN",
          kind: "refund", settles_at: now,
        });
      }
      refunded++;
    }
    await admin.from("audit_logs").insert({
      user_id: user.id, action: "event_cancel_refund", entity_type: "screening", entity_id: s.id,
      new_data: { refunded, reason: p.reason || null },
    });
    return json({ success: true, refunded });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
