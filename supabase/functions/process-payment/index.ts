import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@3.25.76";

const schema = z.object({
  method: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  screeningId: z.string().uuid(),
  location: z.enum(["nigeria", "international"]),
}).strict();

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const randomCode = (bytes: number) => {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(data, b => b.toString(16).padStart(2, "0")).join("");
};

if (import.meta.main) serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed." });

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return json(503, { success: false, error: "Checkout is temporarily unavailable." });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(400, { success: false, error: "Check your email, screening and payment method." });

  const { method, email, screeningId, location } = parsed.data;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const { data: siteSetting, error: siteError } = await admin.from("platform_settings")
      .select("setting_value").eq("setting_key", "public_site_url").maybeSingle();
    const configuredSiteUrl = typeof siteSetting?.setting_value === "string" ? siteSetting.setting_value : "";
    if (siteError || !configuredSiteUrl) {
      return json(503, { success: false, error: "Secure payment return URL is not configured. Contact platform support." });
    }
    let siteOrigin: string;
    try {
      const configured = new URL(configuredSiteUrl);
      if (configured.protocol !== "https:" || configured.username || configured.password) throw new Error("invalid_site_url");
      siteOrigin = configured.origin;
    } catch {
      return json(503, { success: false, error: "Secure payment return URL is invalid. Contact platform support." });
    }

    const { data: configs, error: configError } = await admin.rpc("get_service_provider_runtime_config", { p_capability: "payments" });
    if (configError || !Array.isArray(configs) || !configs.length || configs[0].provider_key !== method) {
      return json(503, { success: false, error: "The selected payment adapter is not active or its Vault credentials are incomplete." });
    }
    const config = configs[0];
    const checkoutEndpoint = config.endpoints?.checkout_initialize;
    if (!config.credential || typeof checkoutEndpoint !== "string" || !checkoutEndpoint.startsWith("/") || checkoutEndpoint.startsWith("//")) {
      return json(503, { success: false, error: "The active payment adapter is missing its checkout contract." });
    }
    if (config.is_live) {
      const { data: delivery } = await admin.rpc("get_service_provider_runtime_config", { p_capability: "video_delivery" });
      if (!Array.isArray(delivery) || !delivery.length || !delivery[0].endpoints?.playback_authorize) {
        return json(503, { success: false, error: "Live sales require configured secure playback entitlement. No charge was made." });
      }
    }

    const { data: screening, error: screeningError } = await admin.from("screenings")
      .select("id,tenant_id,title,slug,status,location_pricing,screening_date,lifecycle,replay_price_ngn,replay_price_usd")
      .eq("id", screeningId).eq("status", "published").maybeSingle();
    if (screeningError || !screening) return json(404, { success: false, error: "This screening is no longer available." });
    if (screening.screening_date && new Date(screening.screening_date).getTime() < Date.now() && screening.lifecycle !== "replay") {
      return json(409, { success: false, error: "Ticket sales for this screening have closed." });
    }

    const pricing = typeof screening.location_pricing === "string" ? JSON.parse(screening.location_pricing) : screening.location_pricing;
    const replayPrice = location === "nigeria" ? screening.replay_price_ngn : screening.replay_price_usd;
    const major = Number(screening.lifecycle === "replay" && replayPrice !== null && replayPrice !== undefined
      ? replayPrice : (location === "nigeria" ? pricing?.nigeria : pricing?.international));
    if (!Number.isFinite(major) || major <= 0) return json(409, { success: false, error: "Ticket pricing is not configured for this location." });

    const currency = location === "nigeria" ? "NGN" : "USD";
    const amountMinor = Math.round(major * 100);
    const reference = "DTV_" + crypto.randomUUID().replaceAll("-", "");
    const ticketCode = randomCode(8).toUpperCase();
    const watchCode = randomCode(20);

    const { data: ticketId, error: orderError } = await admin.rpc("create_guest_payment_order", {
      p_provider: method, p_reference: reference, p_screening_id: screening.id, p_tenant_id: screening.tenant_id,
      p_email: email, p_amount_minor: amountMinor, p_currency: currency, p_location: location,
      p_ticket_code: ticketCode, p_watch_code: watchCode,
    });
    if (orderError || !ticketId) return json(503, { success: false, error: "A secure ticket order could not be created. No charge was made." });

    const checkoutUrl = new URL(checkoutEndpoint, config.base_url);
    if (checkoutUrl.origin !== new URL(config.base_url).origin) throw new Error("invalid_payment_endpoint");
    const authHeader = typeof config.settings?.credential_header === "string" ? config.settings.credential_header : "Authorization";
    const authPrefix = typeof config.settings?.credential_prefix === "string" ? config.settings.credential_prefix : "Bearer ";
    const callback = new URL("/buy/" + encodeURIComponent(screening.slug), siteOrigin).toString();
    const response = await fetch(checkoutUrl, {
      method: "POST",
      headers: { [authHeader]: authPrefix + config.credential, "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: { email }, amount_minor: amountMinor, currency, reference, callback_url: callback,
        metadata: { screening_id: screening.id, ticket_id: ticketId, platform: "degame_tv" },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.authorized !== true || typeof result?.checkout_url !== "string") {
      await admin.from("guest_payment_orders").update({ status: "failed" }).eq("provider_reference", reference);
      await admin.from("screening_tickets").update({ payment_status: "failed" }).eq("id", ticketId);
      return json(502, { success: false, error: "The payment provider could not start checkout. You have not been charged." });
    }

    const returnedCheckout = new URL(result.checkout_url);
    if (returnedCheckout.protocol !== "https:") throw new Error("invalid_checkout_url");
    const allowedCheckoutOrigins = Array.isArray(config.settings?.allowed_checkout_origins) ? config.settings.allowed_checkout_origins : [];
    if (!allowedCheckoutOrigins.includes(returnedCheckout.origin)) throw new Error("untrusted_checkout_origin");
    await admin.from("guest_payment_orders").update({ checkout_url: returnedCheckout.toString(), app_origin: siteOrigin }).eq("provider_reference", reference);
    return json(200, { success: true, authorizationUrl: returnedCheckout.toString(), reference, screeningTitle: screening.title });
  } catch {
    return json(500, { success: false, error: "Checkout could not be started. Please retry or contact support." });
  }
});
