import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({
  screeningId: z.string().uuid().optional(),
  liveStreamId: z.string().uuid().optional(),
  contentId: z.string().uuid().optional(),
  contributionType: z.enum(["tip", "gift"]),
  giftCatalogKey: z.string().regex(/^[a-z0-9_-]{1,64}$/).optional(),
  amount: z.number().positive().max(1_000_000),
  currency: z.string().regex(/^[A-Za-z]{3}$/),
  countryCode: z.string().regex(/^[A-Za-z]{2}$/).optional(),
  email: z.string().trim().email().max(254).optional(),
  displayName: z.string().trim().max(100).optional(),
  message: z.string().trim().max(280).optional(),
  anonymous: z.boolean().default(false),
  method: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/).optional(),
}).strict().superRefine((v, ctx) => {
  const targets = [v.screeningId, v.liveStreamId, v.contentId].filter(Boolean).length;
  if (targets !== 1) ctx.addIssue({ code: "custom", message: "Choose exactly one event or content target." });
  if (v.contributionType === "gift" && !v.giftCatalogKey) ctx.addIssue({ code: "custom", path: ["giftCatalogKey"], message: "Choose a gift." });
});

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, cf-ipcountry", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json", "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !service || !anon) return json({ error: "Fan support checkout is unavailable." }, 503);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Check the contribution amount, currency and event details." }, 400);
  const p = parsed.data;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  let user: any = null;
  const authorization = req.headers.get("Authorization") || "";
  if (authorization.startsWith("Bearer ")) {
    const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const authResult = await caller.auth.getUser();
    if (!authResult.error) user = authResult.data.user;
  }
  const email = user?.email || p.email?.toLowerCase();
  if (!email) return json({ error: "Enter an email address for payment receipt and contribution confirmation." }, 400);

  try {
    let tenantId: string, creatorId: string, screeningId: string | null = p.screeningId ?? null, liveStreamId: string | null = p.liveStreamId ?? null, contentId: string | null = p.contentId ?? null, title: string;
    if (screeningId) {
      const { data: screening, error } = await admin.from("screenings")
        .select("id,tenant_id,content_id,title,status,event_visibility,invite_only")
        .eq("id", screeningId).eq("status", "published").maybeSingle();
      if (error || !screening || !["public", "unlisted"].includes(screening.event_visibility) || screening.invite_only) return json({ error: "This event is not accepting public fan contributions." }, 404);
      const { data: content } = await admin.from("content").select("creator_id").eq("id", screening.content_id).maybeSingle();
      if (!content?.creator_id) return json({ error: "The creator for this event could not be verified." }, 409);
      tenantId = screening.tenant_id; creatorId = content.creator_id; title = screening.title;
    } else if (liveStreamId) {
      const { data: stream, error } = await admin.from("live_streams")
        .select("id,tenant_id,creator_id,title,event_visibility,invite_only,status,metadata")
        .eq("id", liveStreamId).maybeSingle();
      if (error || !stream || !["public", "unlisted"].includes(stream.event_visibility) || stream.invite_only || !["scheduled", "starting", "live"].includes(stream.status)) return json({ error: "This live event is not accepting public fan contributions." }, 404);
      const linkedScreeningId = stream.metadata && typeof stream.metadata === "object" ? (stream.metadata as Record<string, unknown>).screening_id : null;
      if (typeof linkedScreeningId === "string") {
        const { data: linkedScreening } = await admin.from("screenings").select("event_visibility,invite_only,status").eq("id", linkedScreeningId).maybeSingle();
        if (!linkedScreening || linkedScreening.status !== "published" || !["public", "unlisted"].includes(linkedScreening.event_visibility) || linkedScreening.invite_only) {
          return json({ error: "This live event is linked to a private screening and is not accepting public contributions." }, 404);
        }
      }
      tenantId = stream.tenant_id; creatorId = stream.creator_id; title = stream.title;
    } else {
      const { data: content, error } = await admin.from("content")
        .select("id,tenant_id,creator_id,title,status")
        .eq("id", contentId!).eq("status", "published").maybeSingle();
      if (error || !content?.creator_id) return json({ error: "This published content is not accepting fan contributions." }, 404);
      tenantId = content.tenant_id; creatorId = content.creator_id; title = content.title;
    }

    const edgeCountry = req.headers.get("cf-ipcountry")?.toUpperCase();
    const countryCode = p.countryCode?.toUpperCase() ?? (edgeCountry && /^[A-Z]{2}$/.test(edgeCountry) ? edgeCountry : null);
    if (!countryCode) return json({ error: "Choose your country before supporting this creator." }, 422);
    const { data: countryRule, error: countryError } = await admin.from("country_currency_rules")
      .select("country_code,currency_code").eq("country_code", countryCode).eq("enabled", true).maybeSingle();
    if (countryError || !countryRule) return json({ error: "Fan contributions are not enabled for this country." }, 422);
    const currency = p.currency.toUpperCase();
    const { count: currencyCount } = await admin.from("country_currency_rules")
      .select("country_code", { count: "exact", head: true }).eq("currency_code", currency).eq("enabled", true);
    if (!currencyCount) return json({ error: "This transaction currency is not enabled." }, 422);

    const { data: providers, error: providerError } = await admin.rpc("get_service_provider_runtime_config", { p_capability: "payments" });
    if (providerError || !Array.isArray(providers) || !providers.length) return json({ error: "No payment provider is enabled in Admin Provider Vault." }, 503);
    const usable = providers.filter((provider: any) =>
      provider.is_live === true && provider.credential &&
      Array.isArray(provider.settings?.supported_currencies) && provider.settings.supported_currencies.includes(currency) &&
      typeof provider.endpoints?.checkout_initialize === "string" && provider.endpoints.checkout_initialize.startsWith("/") && !provider.endpoints.checkout_initialize.startsWith("//") &&
      typeof provider.endpoints?.payment_verify === "string" && provider.endpoints.payment_verify.startsWith("/") && !provider.endpoints.payment_verify.startsWith("//") &&
      (!p.method || provider.provider_key === p.method)
    );
    if (!usable.length) return json({ error: "No live payment provider supports this contribution currency and method." }, 503);

    const { data: siteSetting, error: siteError } = await admin.from("platform_settings").select("setting_value,is_public").eq("setting_key", "public_site_url").maybeSingle();
    let siteOrigin: string;
    try {
      const site = new URL(typeof siteSetting?.setting_value === "string" ? siteSetting.setting_value : "");
      if (siteError || siteSetting?.is_public !== true || site.protocol !== "https:" || site.username || site.password) throw new Error("invalid_origin");
      siteOrigin = site.origin;
    } catch { return json({ error: "The canonical public return URL is not configured." }, 503); }

    const { data: commissionSetting, error: commissionError } = await admin.from("platform_settings").select("setting_value").eq("setting_key", "commission_rates").maybeSingle();
    const feeRate = Number(commissionSetting?.setting_value?.creator);
    if (commissionError || !Number.isFinite(feeRate) || feeRate < 0 || feeRate > 0.5) return json({ error: "Creator contribution fee policy is not configured safely." }, 503);

    const fractionDigits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
    const amountMinor = Math.round(p.amount * Math.pow(10, fractionDigits));
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return json({ error: "The contribution amount is invalid." }, 422);
    const platformFeeMajor = Math.round(p.amount * feeRate * Math.pow(10, fractionDigits)) / Math.pow(10, fractionDigits);
    const reference = "DTVG_" + crypto.randomUUID().replaceAll("-", "");
    const provider = usable[0];
    const { data: contribution, error: insertError } = await admin.from("event_contributions").insert({
      tenant_id: tenantId, creator_id: creatorId, screening_id: screeningId, live_stream_id: liveStreamId, content_id: contentId,
      contributor_user_id: user?.id ?? null, contributor_name: p.anonymous ? null : (p.displayName || user?.user_metadata?.full_name || null),
      contributor_email: email, contribution_type: p.contributionType, gift_catalog_key: p.contributionType === "gift" ? p.giftCatalogKey : null,
      message: p.message || null, amount_minor: amountMinor, amount_major: p.amount, platform_fee_major: platformFeeMajor,
      currency, provider_key: provider.provider_key, provider_reference: reference, provider_mode: "live",
      is_anonymous: p.anonymous, status: "pending",
    }).select("id").single();
    if (insertError || !contribution) return json({ error: "The contribution order could not be created. No charge was made." }, 503);

    const target = new URL(provider.endpoints.checkout_initialize, provider.base_url);
    if (target.origin !== new URL(provider.base_url).origin) {
      await admin.from("event_contributions").update({ status: "failed" }).eq("id", contribution.id);
      return json({ error: "The configured payment endpoint is invalid." }, 503);
    }
    const header = provider.settings?.credential_header || "Authorization";
    const prefix = provider.settings?.credential_prefix ?? "Bearer ";
    const callback = new URL("/payment/return?reference=" + reference, siteOrigin).toString();
    const adapter = String(provider.settings?.checkout_adapter ?? provider.settings?.adapter ?? provider.provider_key).toLowerCase();
    const metadata = { contribution_id: contribution.id, contribution_type: p.contributionType, reference, creator_id: creatorId };
    let body: string, contentType = "application/json";
    if (adapter === "stripe") {
      const form = new URLSearchParams({
        mode: "payment", success_url: callback + "&session_id={CHECKOUT_SESSION_ID}", cancel_url: callback,
        customer_email: email, client_reference_id: reference,
        "line_items[0][price_data][currency]": currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": String(amountMinor),
        "line_items[0][price_data][product_data][name]": p.contributionType === "gift" ? "Creator gift — " + title : "Creator tip — " + title,
        "line_items[0][quantity]": "1", "metadata[reference]": reference, "metadata[contribution_id]": contribution.id,
      });
      body = form.toString(); contentType = "application/x-www-form-urlencoded";
    } else if (adapter === "paystack") {
      body = JSON.stringify({ email, amount: amountMinor, currency, reference, callback_url: callback, metadata });
    } else if (adapter === "flutterwave") {
      body = JSON.stringify({ tx_ref: reference, amount: p.amount, currency, redirect_url: callback, customer: { email }, customizations: { title: "DeGameTV", description: title }, meta: metadata });
    } else {
      body = JSON.stringify({ customer: { email }, amount_minor: amountMinor, currency, reference, callback_url: callback, metadata });
    }
    const response = await fetch(target, { method: "POST", headers: { [header]: prefix + provider.credential, "Content-Type": contentType, Accept: "application/json" }, body, signal: AbortSignal.timeout(15000) });
    const result = await response.json().catch(() => null);
    let checkoutUrl: string | null = null, checkoutId: string | null = null;
    if (adapter === "paystack" && result?.status === true) { checkoutUrl = result.data?.authorization_url ?? null; checkoutId = result.data?.reference ?? reference; }
    else if (adapter === "stripe" && response.ok) { checkoutUrl = result?.url ?? null; checkoutId = result?.id ?? null; }
    else if (adapter === "flutterwave" && response.ok && result?.status === "success") { checkoutUrl = result.data?.link ?? null; checkoutId = result.data?.id ? String(result.data.id) : null; }
    else if (adapter === "generic" && response.ok && result?.authorized === true) { checkoutUrl = result.checkout_url ?? null; checkoutId = result.provider_checkout_id ?? null; }
    if (!response.ok || typeof checkoutUrl !== "string") {
      await admin.from("event_contributions").update({ status: "failed" }).eq("id", contribution.id);
      return json({ error: "The payment provider could not start checkout. No charge was made." }, 502);
    }
    const safeCheckout = new URL(checkoutUrl);
    const allowedOrigins = Array.isArray(provider.settings?.allowed_checkout_origins) ? provider.settings.allowed_checkout_origins : [];
    if (safeCheckout.protocol !== "https:" || !allowedOrigins.includes(safeCheckout.origin)) {
      await admin.from("event_contributions").update({ status: "failed" }).eq("id", contribution.id);
      return json({ error: "The payment provider returned an untrusted checkout address." }, 502);
    }
    await admin.from("event_contributions").update({ provider_checkout_id: checkoutId }).eq("id", contribution.id);
    return json({ success: true, checkoutUrl: safeCheckout.toString(), reference, contributionId: contribution.id, amount: p.amount, currency });
  } catch (error) {
    console.error("process-event-contribution", error);
    return json({ error: "Fan support checkout failed safely. No content access was granted." }, 503);
  }
});
