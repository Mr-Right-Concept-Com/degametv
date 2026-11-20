import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const jsonValue: z.ZodType<unknown> = z.lazy(() => z.union([z.string(), z.number().finite(), z.boolean(), z.null(), z.array(jsonValue), z.record(z.string(), jsonValue)]));

const hexColor=z.string().regex(/^#[0-9a-f]{6}$/i);
const safeAssetUrl=z.string().trim().min(1).max(2048).refine(value=>{
  if(value.startsWith("/")&&!value.startsWith("//"))return true;
  try{return new URL(value).protocol==="https:";}catch{return false;}
});
const BrandConfig=z.object({
 platformName:z.string().trim().min(1).max(80),
 tagline:z.string().trim().max(180),
 primaryColor:hexColor,secondaryColor:hexColor,accentColor:hexColor,backgroundColor:hexColor,
 fontFamily:z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9 ,'-]+$/),
 customDomain:z.string().trim().max(253).refine(value=>value===""||(/^[a-z0-9.-]+$/i.test(value)&&!value.startsWith(".")&&!value.endsWith(".")&&!value.includes(".."))),
 supportEmail:z.string().trim().max(254).refine(value=>value===""||z.string().email().safeParse(value).success),
 logoUrl:safeAssetUrl,faviconUrl:safeAssetUrl,
}).strict();

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setting_update"), key: z.string().min(1).max(100), value: jsonValue }),
  z.object({ action: z.literal("wallet_adjust"), userId: z.string().uuid(), amount: z.number().refine((n) => n !== 0 && Math.abs(n) <= 100_000_000), currency: z.string().regex(/^[A-Z]{3}$/), reason: z.string().min(3).max(500) }),
  z.object({ action: z.literal("role_set"), userId: z.string().uuid(), role: z.enum(["super_admin", "platform_admin", "moderator", "viewer"]), grant: z.boolean() }),
  z.object({ action: z.literal("withdrawal_set"), id: z.string().uuid(), status: z.enum(["approved", "rejected"]), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("impersonate"), userId: z.string().uuid(), redirectTo: z.string().url().optional() }),
  z.object({ action: z.literal("runtime_controls") }),
  z.object({ action: z.literal("branding_get") }),
  z.object({ action: z.literal("branding_set"), brandKey: z.literal("platform.default"), brandConfig: BrandConfig, isPublic: z.boolean(), expectedVersion: z.number().int().min(1), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("public_site_url_set"), url: z.string().url().refine(value => new URL(value).protocol === "https:"), published: z.boolean(), reason: z.string().min(3).max(500) }),
  z.object({ action: z.literal("country_currency_set"), countryCode: z.string().regex(/^[A-Z]{2}$/), currencyCode: z.string().regex(/^[A-Z]{3}$/), currencySymbol: z.string().max(12).nullable(), localeCode: z.string().min(2).max(24), timezoneName: z.string().max(100).nullable(), enabled: z.boolean(), reason: z.string().min(3).max(500) }),
  z.object({ action: z.literal("feature_control_set"), featureKey: z.string().regex(/^[a-z][a-z0-9_.-]{1,119}$/), enabled: z.boolean(), rolloutPercentage: z.number().int().min(0).max(100), releaseState: z.enum(["draft","canary","released","paused","rolled_back"]), config: z.record(z.string(), jsonValue), reason: z.string().min(3).max(500) }),
]);

const editableSettings = new Set([
  "addons_catalog",
  "base_currency",
  "commission_rates",
  "creator_approval_mode",
  "kyb_verification_mode",
  "kyc_verification_mode",
  "public_site_url",
  "stream_rules",
]);
const approvalModes = new Set(["manual", "automatic", "hybrid"]);

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: adminRole, error: roleError } = await admin.from("user_roles").select("user_id").eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
    if (roleError || !adminRole) return json({ error: "Super admin required" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const p = parsed.data;
    let result: unknown = null;
    let entityId: string | null = null;

    switch (p.action) {
      case "setting_update": {
        if (!editableSettings.has(p.key)) return json({ error: "This setting is not editable through Godmode." }, 403);
        if (["creator_approval_mode", "kyc_verification_mode", "kyb_verification_mode"].includes(p.key)
          && (typeof p.value !== "string" || !approvalModes.has(p.value))) {
          return json({ error: "Approval mode must be manual, automatic, or hybrid." }, 400);
        }
        if (p.key === "base_currency") {
          if (typeof p.value !== "string" || !/^[A-Z]{3}$/.test(p.value)) return json({ error: "Platform base currency must be a three-letter ISO 4217 code." }, 400);
          const {data:currency,error:currencyError}=await admin.from("country_currency_rules").select("currency_code").eq("currency_code",p.value).eq("enabled",true).limit(1);
          if(currencyError||!currency?.length)return json({error:"Platform base currency is not present in the enabled ISO 4217 registry."},422);
        }
        if (/(secret|api[_-]?key|password|token)/i.test(p.key) || ["email_provider", "payment_gateways"].includes(p.key)) return json({ error: "Credential and provider settings must use their Vault control plane." }, 403);
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
        if(p.status==="rejected"&&(!p.note||p.note.trim().length<5))return json({error:"A rejection reason of at least five characters is required."},422);
        const {data,error}=await admin.rpc("transition_withdrawal_request",{
          p_request_id:p.id,p_transition:p.status==="approved"?"approve":"reject",p_actor_id:user.id,p_admin_note:p.note??null,
        });
        if(error)return json({error:error.message},error.message.includes("withdrawal_request_state_conflict")?409:400);
        result=data;entityId=p.id;
        break;
      }
      case "runtime_controls": {
        const [countries,features] = await Promise.all([
          admin.from("country_currency_rules").select("country_code,currency_code,currency_symbol,locale_code,timezone_name,enabled,source,metadata,updated_at").order("country_code"),
          admin.from("platform_feature_controls").select("feature_key,enabled,rollout_percentage,release_state,config,change_reason,updated_at,updated_by").order("feature_key"),
        ]);
        if (countries.error || features.error) return json({error:"Runtime controls could not be loaded."},503);
        const {data:siteSetting} = await admin.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
        result = { countries:countries.data ?? [], features:features.data ?? [], administratorId:user.id, webAppUrl:typeof siteSetting?.setting_value === "string" ? siteSetting.setting_value : "", webAppUrlPublished:siteSetting?.is_public === true };
        break;
      }
      case "branding_get": {
        const {data,error}=await admin.from("platform_branding_registry").select("brand_key,brand_config,is_public,version,updated_by,updated_at").eq("brand_key","platform.default").maybeSingle();
        if(error)return json({error:"Branding registry could not be loaded."},503);
        if(!data)return json({error:"The canonical platform branding record is missing."},404);
        result=data;entityId=data.brand_key;
        break;
      }
      case "branding_set": {
        const {data:previous,error:readError}=await admin.from("platform_branding_registry").select("brand_config,is_public,version").eq("brand_key",p.brandKey).maybeSingle();
        if(readError)return json({error:"Branding version could not be read."},503);
        if(!previous)return json({error:"Canonical branding record not found."},404);
        if(previous.version!==p.expectedVersion)return json({error:"Branding changed in another session. Reload before saving."},409);
        const {data,error}=await admin.from("platform_branding_registry").update({
          brand_config:p.brandConfig,is_public:p.isPublic,version:previous.version+1,updated_by:user.id,updated_at:new Date().toISOString(),
        }).eq("brand_key",p.brandKey).eq("version",p.expectedVersion)
          .select("brand_key,brand_config,is_public,version,updated_by,updated_at").maybeSingle();
        if(error)return json({error:"Branding update could not be committed."},503);
        if(!data)return json({error:"Branding version conflict. Reload before saving."},409);
        result=data;entityId=p.brandKey;
        await admin.from("audit_logs").insert({user_id:user.id,action:"platform_branding.updated",entity_type:"platform_branding",entity_id:null,
          old_data:previous,new_data:{brand_key:p.brandKey,brand_config:p.brandConfig,is_public:p.isPublic,version:data.version,reason:p.reason}});
        break;
      }
      case "country_currency_set": {
        const {data:previous} = await admin.from("country_currency_rules").select("*").eq("country_code",p.countryCode).maybeSingle();
        if(!previous)return json({error:"Country code is not present in the canonical ISO country registry."},404);
        const {data:currency,error:currencyError}=await admin.from("country_currency_rules").select("currency_code").eq("currency_code",p.currencyCode).eq("enabled",true).limit(1);
        if(currencyError||!currency?.length)return json({error:"Currency code is not present in the enabled ISO 4217 registry."},422);
        let canonicalLocale:string;
        try{canonicalLocale=Intl.getCanonicalLocales(p.localeCode)[0];}catch{return json({error:"Locale must be a valid BCP 47 language tag."},400);}
        if(p.timezoneName){try{new Intl.DateTimeFormat("en",{timeZone:p.timezoneName}).format();}catch{return json({error:"Timezone must be a valid IANA timezone."},400);}}
        const {data,error} = await admin.from("country_currency_rules").upsert({
          country_code:p.countryCode,currency_code:p.currencyCode,currency_symbol:p.currencySymbol,
          locale_code:canonicalLocale,timezone_name:p.timezoneName,enabled:p.enabled,source:"admin",updated_by:user.id,updated_at:new Date().toISOString()
        },{onConflict:"country_code"}).select().single();
        if(error)return json({error:error.message},400);
        result=data;entityId=p.countryCode;
        await admin.from("audit_logs").insert({user_id:user.id,action:"country_currency_rule.upsert",entity_type:"country_currency_rule",entity_id:null,old_data:previous??{},new_data:{...data,reason:p.reason}});
        break;
      }
      case "public_site_url_set": {
        const {data:previous} = await admin.from("platform_settings").select("setting_value,is_public").eq("setting_key","public_site_url").maybeSingle();
        const {data,error} = await admin.from("platform_settings").upsert({setting_key:"public_site_url",setting_value:p.url,is_public:p.published,description:"Canonical DeGameTV web application URL consumed by native clients.",updated_at:new Date().toISOString()},{onConflict:"setting_key"}).select("setting_key,setting_value,is_public").single();
        if(error)return json({error:error.message},400);
        result=data;entityId="public_site_url";
        await admin.from("audit_logs").insert({user_id:user.id,action:"public_site_url.updated",entity_type:"platform_setting",entity_id:null,old_data:previous??{},new_data:{...data,reason:p.reason}});
        break;
      }
      case "feature_control_set": {
        const {data:previous} = await admin.from("platform_feature_controls").select("*").eq("feature_key",p.featureKey).maybeSingle();
        if(p.releaseState==="canary"&&(!p.enabled||p.rolloutPercentage<1||p.rolloutPercentage>99))return json({error:"Canary requires enabled=true and rollout between 1% and 99%."},400);
        if(p.releaseState==="released"&&(!p.enabled||p.rolloutPercentage!==100))return json({error:"A released feature requires enabled=true and 100% rollout."},400);
        if(["draft","paused","rolled_back"].includes(p.releaseState)&&p.enabled)return json({error:"Draft, paused and rolled-back features must be disabled."},400);
        if(p.releaseState==="released"&&(!previous||!["canary","released"].includes(previous.release_state)))return json({error:"A feature must pass through canary before its first full release."},409);
        const {data,error} = await admin.from("platform_feature_controls").upsert({
          feature_key:p.featureKey,enabled:p.enabled,rollout_percentage:p.rolloutPercentage,release_state:p.releaseState,
          config:p.config,change_reason:p.reason,updated_by:user.id,updated_at:new Date().toISOString()
        },{onConflict:"feature_key"}).select().single();
        if(error)return json({error:error.message},400);
        result=data;entityId=p.featureKey;
        await admin.from("audit_logs").insert({user_id:user.id,action:"platform_feature_control.upsert",entity_type:"platform_feature_control",entity_id:null,old_data:previous??{},new_data:data});
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
