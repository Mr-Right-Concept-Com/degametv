import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setting_update"), key: z.string().min(1).max(100), value: z.any() }),
  z.object({ action: z.literal("wallet_adjust"), userId: z.string().uuid(), amount: z.number().refine((n) => n !== 0 && Math.abs(n) <= 100_000_000), currency: z.enum(["NGN", "USD"]), reason: z.string().min(3).max(500) }),
  z.object({ action: z.literal("role_set"), userId: z.string().uuid(), role: z.enum(["super_admin", "platform_admin", "moderator", "viewer"]), grant: z.boolean() }),
  z.object({ action: z.literal("withdrawal_set"), id: z.string().uuid(), status: z.enum(["pending", "approved", "paid", "rejected"]), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("impersonate"), userId: z.string().uuid(), redirectTo: z.string().url().optional() }),
]);

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("is_super_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Super admin required" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const p = parsed.data;
    let result: unknown = null;
    let entityId: string | null = null;

    switch (p.action) {
      case "setting_update": {
        const { error } = await admin.from("platform_settings")
          .upsert({ setting_key: p.key, setting_value: p.value, updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
        if (error) return json({ error: error.message }, 500);
        break;
      }
      case "wallet_adjust": {
        const { data, error } = await admin.from("wallet_ledger").insert({
          user_id: p.userId, gross: p.amount, fee: 0, net: p.amount, currency: p.currency,
          kind: "adjustment", settles_at: new Date().toISOString(),
        }).select("id").single();
        if (error) return json({ error: error.message }, 500);
        entityId = data.id;
        break;
      }
      case "role_set": {
        if (p.role === "creator") return json({ error: "Creator eligibility is granted only by the verified KYC review workflow." }, 403);
        if (p.userId === user.id && !p.grant && p.role === "super_admin") return json({ error: "You cannot remove your own super admin role" }, 400);
        if (p.grant) {
          const { data: ex } = await admin.from("user_roles").select("id").eq("user_id", p.userId).eq("role", p.role).maybeSingle();
          if (!ex) await admin.from("user_roles").insert({ user_id: p.userId, role: p.role });
        } else {
          await admin.from("user_roles").delete().eq("user_id", p.userId).eq("role", p.role);
        }
        entityId = p.userId;
        break;
      }
      case "withdrawal_set": {
        const { error } = await admin.from("withdrawal_requests").update({ status: p.status, admin_note: p.note ?? null }).eq("id", p.id);
        if (error) return json({ error: error.message }, 500);
        entityId = p.id;
        break;
      }
      case "impersonate": {
        const { data: target } = await admin.auth.admin.getUserById(p.userId);
        if (!target?.user?.email) return json({ error: "User not found" }, 404);
        const { data, error } = await admin.auth.admin.generateLink({
          type: "magiclink", email: target.user.email, options: { redirectTo: p.redirectTo },
        });
        if (error) return json({ error: error.message }, 500);
        result = { link: data.properties?.action_link, email: target.user.email };
        entityId = p.userId;
        break;
      }
    }

    await admin.from("audit_logs").insert({
      user_id: user.id, action: `godmode_${p.action}`, entity_type: "godmode", entity_id: entityId,
      new_data: { ...p, value: "value" in p ? p.value : undefined },
    });
    return json({ success: true, result });
  } catch (e) {
    console.error("admin-godmode", e);
    return json({ error: (e as Error).message }, 500);
  }
});
