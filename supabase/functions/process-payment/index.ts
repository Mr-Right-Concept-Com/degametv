import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import type { Database, Json } from "../_shared/database.types.ts";
import { z } from "npm:zod@3.25.76";

const schema = z.object({
  method: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  screeningId: z.string().uuid(),
  location: z.enum(["nigeria", "international"]),
  countryCode: z.string().regex(/^[A-Za-z]{2}$/).optional(),
  currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
  cohortId: z.string().min(8).max(128).optional(),
}).strict();

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
async function featureEnabled(db: SupabaseClient<Database>, key: string, subject: string): Promise<boolean> {
  const { data: flag, error } = await db.from("platform_feature_controls").select("enabled,rollout_percentage,release_state").eq("feature_key",key).maybeSingle();
  if (error) return false;
  if (!flag) return false;
  if (!flag.enabled || ["draft","paused","rolled_back"].includes(flag.release_state)) return false;
  if (flag.release_state === "released") return flag.rollout_percentage === 100;
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(subject+":"+key));
  return new DataView(digest).getUint32(0,false)%100 < flag.rollout_percentage;
}
async function convertAmount(baseUrl: string, serviceKey: string, amount: number, fromCurrency: string, toCurrency: string, countryCode: string | null): Promise<number> {
  if (fromCurrency === toCurrency) return amount;
  const response = await fetch(baseUrl + "/functions/v1/convert-currency", {
    method: "POST",
    headers: { Authorization: "Bearer " + serviceKey, apikey: serviceKey, "Content-Type": "application/json" },
    body: JSON.stringify({ amount, fromCurrency, toCurrency, country: countryCode ?? undefined }),
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !Number.isFinite(result?.converted)) throw new Error("FX conversion is unavailable for the selected currency.");
  return Number(result.converted);
}

type PaymentProvider={id:string;capability:string;credential:string;endpoints:Json;is_live:boolean;provider_key:string;settings:Json;webhook_secret:string;base_url:string};
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null&&!Array.isArray(value);
const isPaymentProvider=(value:unknown):value is PaymentProvider=>isRecord(value)&&typeof value.provider_key==="string"&&value.is_live===true&&typeof value.credential==="string"&&isRecord(value.settings)&&isRecord(value.endpoints)&&typeof value.base_url==="string";
const randomCode = (bytes: number) => {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(data, b => b.toString(16).padStart(2, "0")).join("");
};

if (import.meta.main) serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed." });

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !service || !anon) return json(503, { success: false, error: "Checkout is temporarily unavailable." });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(400, { success: false, error: "Check your email, screening and payment method." });

  const { method, email, screeningId, location } = parsed.data;
  const admin = createClient<Database>(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  let walletUser: { id: string; email: string } | null = null;
  if (method === "personal_wallet") {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json(401, { success: false, error: "Sign in to use your Personal Wallet." });
    const caller = createClient<Database>(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user || !authData.user.email) return json(401, { success: false, error: "A verified signed-in account is required for Personal Wallet checkout." });
    const { data: ownsWallet, error: ownerError } = await caller.rpc("assert_personal_wallet_ticket_owner", { p_user_id: authData.user.id });
    if (ownerError || ownsWallet !== true) return json(403, { success: false, error: "Your authenticated account does not own this Personal Wallet." });
    walletUser = { id: authData.user.id, email: authData.user.email.toLowerCase() };
  }
  if (!await featureEnabled(admin, "cinema.ticketing", parsed.data.cohortId ?? walletUser?.id ?? email)) return json(403, { success: false, error: "Ticket checkout is paused for this release cohort." });

  const edgeCountry = req.headers.get("cf-ipcountry")?.toUpperCase();
  const countryCode = parsed.data.countryCode?.toUpperCase() ?? (edgeCountry && /^[A-Z]{2}$/.test(edgeCountry) ? edgeCountry : location === "nigeria" ? "NG" : null);
  const { data: countryRule, error: countryError } = countryCode
    ? await admin.from("country_currency_rules").select("country_code,currency_code").eq("country_code", countryCode).eq("enabled", true).maybeSingle()
    : { data: null, error: null };
  if (countryError || (countryCode && !countryRule)) return json(422, { success: false, error: "This country is not enabled for ticket checkout." });
  const effectiveLocation = countryCode === "NG" ? "nigeria" : "international";
  const sourceCurrency = effectiveLocation === "nigeria" ? "NGN" : "USD";
  const currency = (parsed.data.currency ?? countryRule?.currency_code ?? sourceCurrency).toUpperCase();
  const { count: currencySupported } = await admin.from("country_currency_rules").select("country_code", { count: "exact", head: true }).eq("currency_code", currency).eq("enabled", true);
  if (!currencySupported) return json(422, { success: false, error: "The requested transaction currency is not enabled on the platform." });

  try {
    let siteOrigin = "";
    if (method !== "personal_wallet") {
      const { data: siteSetting, error: siteError } = await admin.from("platform_settings")
        .select("setting_value,is_public").eq("setting_key", "public_site_url").maybeSingle();
      const configuredSiteUrl = typeof siteSetting?.setting_value === "string" ? siteSetting.setting_value : "";
      if (siteError || siteSetting?.is_public !== true || !configuredSiteUrl) {
        return json(503, { success: false, error: "Secure payment return URL is not configured. Contact platform support." });
      }
      try {
        const configured = new URL(configuredSiteUrl);
        if (configured.protocol !== "https:" || configured.username || configured.password) throw new Error("invalid_site_url");
        siteOrigin = configured.origin;
      } catch {
        return json(503, { success: false, error: "Secure payment return URL is invalid. Contact platform support." });
      }
    }

    let config: PaymentProvider | null = null;
    let checkoutEndpoint = "";
    if (method !== "personal_wallet") {
      const { data: configs, error: configError } = await admin.rpc("get_service_provider_runtime_config", { p_capability: "payments" });
      if (configError || !Array.isArray(configs) || !configs.length) return json(503, { success: false, error: "No live payment adapter is available." });
      config = configs.find((provider) => isPaymentProvider(provider) && provider.provider_key === method) ?? null;
      if (!config) return json(503, { success: false, error: "The selected live payment adapter is not active or its Vault credentials are incomplete." });
      const providerEndpoints = isRecord(config.endpoints) ? config.endpoints : {};
      if (!config.credential || typeof providerEndpoints.checkout_initialize !== "string" || !providerEndpoints.checkout_initialize.startsWith("/") || providerEndpoints.checkout_initialize.startsWith("//") || typeof providerEndpoints.payment_verify !== "string" || !providerEndpoints.payment_verify.startsWith("/") || providerEndpoints.payment_verify.startsWith("//") || typeof providerEndpoints.refund !== "string" || !providerEndpoints.refund.startsWith("/") || providerEndpoints.refund.startsWith("//")) return json(503, { success: false, error: "The active payment adapter is missing its checkout contract." });
      checkoutEndpoint = providerEndpoints.checkout_initialize;
      if (config.is_live) {
        const { data: delivery } = await admin.rpc("get_service_provider_runtime_config", { p_capability: "video_delivery" });
        if (!Array.isArray(delivery) || !delivery.length || !isRecord(delivery[0]) || !isRecord(delivery[0].endpoints) || typeof delivery[0].endpoints.playback_authorize !== "string") return json(503, { success: false, error: "Live sales require configured secure playback entitlement. No charge was made." });
      }
    }

    const { data: screening, error: screeningError } = await admin.from("screenings")
      .select("id,tenant_id,title,slug,status,location_pricing,screening_date,lifecycle,replay_price_ngn,replay_price_usd,base_price,base_currency,replay_base_price")
      .eq("id", screeningId).eq("status", "published").maybeSingle();
    if (screeningError || !screening) return json(404, { success: false, error: "This screening is no longer available." });
    if (screening.screening_date && new Date(screening.screening_date).getTime() < Date.now() && screening.lifecycle !== "replay") {
      return json(409, { success: false, error: "Ticket sales for this screening have closed." });
    }

    const pricing = typeof screening.location_pricing === "string" ? JSON.parse(screening.location_pricing) : screening.location_pricing;
    const legacyReplayPrice = effectiveLocation === "nigeria" ? screening.replay_price_ngn : screening.replay_price_usd;
    const legacyBasePrice = effectiveLocation === "nigeria" ? pricing?.nigeria : pricing?.international;
    const hasBasePrice = screening.base_price !== null && screening.base_price !== undefined;
    const major = Number(screening.lifecycle === "replay"
      ? (hasBasePrice ? screening.replay_base_price : legacyReplayPrice)
      : (hasBasePrice ? screening.base_price : legacyBasePrice));
    const priceCurrency = hasBasePrice ? String(screening.base_currency || "").toUpperCase() : sourceCurrency;
    if (!Number.isFinite(major) || major <= 0 || !/^[A-Z]{3}$/.test(priceCurrency)) return json(409, { success: false, error: "Ticket pricing is not configured in a supported currency." });

    if (method !== "personal_wallet") {
      const supportedCurrencies = isRecord(config?.settings) && Array.isArray(config.settings.supported_currencies) ? config.settings.supported_currencies : [];
      if (!supportedCurrencies.includes(currency)) return json(422, { success: false, error: "The selected payment provider does not support this transaction currency." });
    }
    const convertedMajor = await convertAmount(url, service, major, priceCurrency, currency, countryCode);
    const fractionDigits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    const amountMinor = Math.round(convertedMajor * Math.pow(10, fractionDigits));
    const { data: commissionSetting, error: commissionError } = await admin.from("platform_settings").select("setting_value").eq("setting_key", "commission_rates").maybeSingle();
    const commissionValue = isRecord(commissionSetting?.setting_value) ? commissionSetting.setting_value.creator : undefined;
    const creatorCommissionRate = Number(commissionValue);
    if (commissionError || !Number.isFinite(creatorCommissionRate) || creatorCommissionRate < 0 || creatorCommissionRate > 0.5) return json(503, { success: false, error: "Creator commission policy is not configured safely." });
    const platformFeeMinor = Math.round(amountMinor * creatorCommissionRate);
    const platformFeeMajor = platformFeeMinor / Math.pow(10, fractionDigits);
    if (method === "personal_wallet") {
      if (!walletUser) return json(401, { success: false, error: "Sign in to use your Personal Wallet." });
      const reference = "DTVW_" + crypto.randomUUID().replaceAll("-", "");
      const ticketCode = randomCode(8).toUpperCase();
      const watchCode = randomCode(20);
      const { data: walletPurchase, error: walletError } = await admin.rpc("purchase_personal_wallet_screening_ticket", {
        p_user_id: walletUser.id, p_screening_id: screening.id, p_email: walletUser.email,
        p_amount_minor: amountMinor, p_amount_major: convertedMajor, p_platform_fee_major: platformFeeMajor,
        p_currency: currency, p_location: effectiveLocation, p_ticket_code: ticketCode,
        p_watch_code: watchCode, p_reference: reference,
      });
      if (walletError || !isRecord(walletPurchase) || walletPurchase.success !== true) {
        const message = walletError?.message.includes("insufficient_personal_wallet_funds")
          ? "Your Personal Wallet balance is insufficient in " + currency + "."
          : "Personal Wallet checkout could not be completed. Your balance was not charged.";
        return json(409, { success: false, error: message });
      }
      return json(200, { success: true, walletPaid: true, reference, ticketId: walletPurchase.ticket_id,
        ticketCode: walletPurchase.ticket_code, watchCode: walletPurchase.watch_code, email: walletUser.email,
        screeningTitle: screening.title, amount: convertedMajor, currency, balanceMinor: walletPurchase.balance_minor });
    }
    if (!config) return json(503, { success: false, error: "The selected payment provider is unavailable." });
    const providerSettings = isRecord(config.settings) ? config.settings : {};
    const reference = "DTV_" + crypto.randomUUID().replaceAll("-", "");
    const ticketCode = randomCode(8).toUpperCase();
    const watchCode = randomCode(20);

    const { data: ticketId, error: orderError } = await admin.rpc("create_guest_payment_order_v3", {
      p_provider: method, p_reference: reference, p_screening_id: screening.id, p_tenant_id: screening.tenant_id,
      p_email: email, p_amount_minor: amountMinor, p_amount_major: convertedMajor, p_platform_fee_major: platformFeeMajor, p_currency: currency, p_location: effectiveLocation,
      p_ticket_code: ticketCode, p_watch_code: watchCode, p_app_origin: siteOrigin,
    });
    if (orderError || !ticketId) return json(503, { success: false, error: "A secure ticket order could not be created. No charge was made." });

    const checkoutUrl = new URL(checkoutEndpoint, config.base_url);
    if (checkoutUrl.origin !== new URL(config.base_url).origin) {
      await admin.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:"Checkout endpoint host mismatch."}).eq("capability","payments").eq("provider_key",config.provider_key);
      throw new Error("invalid_payment_endpoint");
    }
    const authHeader = typeof providerSettings.credential_header === "string" ? providerSettings.credential_header : "Authorization";
    const authPrefix = typeof providerSettings.credential_prefix === "string" ? providerSettings.credential_prefix : "Bearer ";
    const callback = new URL("/buy/" + encodeURIComponent(screening.slug), siteOrigin).toString();
    const checkoutAdapter = String(providerSettings.checkout_adapter ?? providerSettings.adapter ?? config.provider_key).toLowerCase();
    const metadata = { screening_id: screening.id, ticket_id: ticketId, platform: "degame_tv", reference };
    let requestBody: string;
    let contentType = "application/json";
    if (checkoutAdapter === "stripe") {
      const form = new URLSearchParams({
        mode: "payment", success_url: callback + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: callback, customer_email: email, client_reference_id: reference,
        "line_items[0][price_data][currency]": currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": String(amountMinor),
        "line_items[0][price_data][product_data][name]": screening.title,
        "line_items[0][quantity]": "1",
        "metadata[reference]": reference, "metadata[screening_id]": screening.id, "metadata[ticket_id]": ticketId,
      });
      requestBody = form.toString(); contentType = "application/x-www-form-urlencoded";
    } else if (checkoutAdapter === "paystack") {
      requestBody = JSON.stringify({ email, amount: amountMinor, currency, reference, callback_url: callback, metadata });
    } else if (checkoutAdapter === "flutterwave") {
      requestBody = JSON.stringify({ tx_ref: reference, amount: convertedMajor, currency, redirect_url: callback, customer: { email }, customizations: { title: "DeGameTV", description: screening.title }, meta: metadata });
    } else {
      requestBody = JSON.stringify({ customer: { email }, amount_minor: amountMinor, currency, reference, callback_url: callback, metadata });
    }
    const response = await fetch(checkoutUrl, {
      method: "POST",
      headers: { [authHeader]: authPrefix + config.credential, "Content-Type": contentType, Accept: "application/json" },
      body: requestBody,
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => null);
    let providerCheckoutUrl: string | null = null;
    let providerCheckoutId: string | null = null;
    if (checkoutAdapter === "paystack" && result?.status === true) {
      providerCheckoutUrl = typeof result.data?.authorization_url === "string" ? result.data.authorization_url : null;
      providerCheckoutId = typeof result.data?.reference === "string" ? result.data.reference : reference;
    } else if (checkoutAdapter === "stripe" && response.ok) {
      providerCheckoutUrl = typeof result?.url === "string" ? result.url : null;
      providerCheckoutId = typeof result?.id === "string" ? result.id : null;
    } else if (checkoutAdapter === "flutterwave" && response.ok && result?.status === "success") {
      providerCheckoutUrl = typeof result.data?.link === "string" ? result.data.link : null;
      providerCheckoutId = result.data?.id ? String(result.data.id) : null;
    } else if (checkoutAdapter === "generic" && response.ok && result?.authorized === true) {
      providerCheckoutUrl = typeof result.checkout_url === "string" ? result.checkout_url : null;
      providerCheckoutId = typeof result.provider_checkout_id === "string" ? result.provider_checkout_id : null;
    }
    if (!response.ok || !providerCheckoutUrl) {
      await admin.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:"Checkout initialization failed."}).eq("capability","payments").eq("provider_key",config.provider_key);
      await admin.from("guest_payment_orders").update({ status: "failed" }).eq("provider_reference", reference);
      await admin.from("screening_tickets").update({ payment_status: "failed" }).eq("id", ticketId);
      return json(502, { success: false, error: "The payment provider could not start checkout. You have not been charged." });
    }
    const returnedCheckout = new URL(providerCheckoutUrl);
    if (returnedCheckout.protocol !== "https:") throw new Error("invalid_checkout_url");
    const allowedCheckoutOrigins = Array.isArray(providerSettings.allowed_checkout_origins) ? providerSettings.allowed_checkout_origins : [];
    if (!allowedCheckoutOrigins.includes(returnedCheckout.origin)) {
      await admin.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:"Provider returned an untrusted checkout URL."}).eq("capability","payments").eq("provider_key",config.provider_key);
      throw new Error("untrusted_checkout_origin");
    }
    await admin.from("service_provider_bindings").update({health_status:"healthy",health_checked_at:new Date().toISOString(),health_error:null}).eq("capability","payments").eq("provider_key",config.provider_key);
    await admin.from("guest_payment_orders").update({ checkout_url: returnedCheckout.toString(), provider_checkout_id: providerCheckoutId, app_origin: siteOrigin }).eq("provider_reference", reference);
    return json(200, { success: true, authorizationUrl: returnedCheckout.toString(), reference, screeningTitle: screening.title, amount: convertedMajor, currency, provider: config.provider_key });
  } catch {
    return json(500, { success: false, error: "Checkout could not be started. Please retry or contact support." });
  }
});
