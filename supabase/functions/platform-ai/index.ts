import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const Body = z.object({
  workflowKey: z.string().regex(/^[a-z][a-z0-9_.-]{1,100}$/),
  operation: z.enum(["text","embedding"]),
  input: z.string().trim().min(1).max(200000),
  dataClass: z.enum(["public","user_content","user_generated_content","support_knowledge","aggregate_metrics","operational_telemetry"]),
}).strict();
const respond = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers });
const readPath = (value: unknown, path: string): unknown => path.split(".").reduce<unknown>((current,key) => {
  if (Array.isArray(current)) {
    const index = Number(key);
    return Number.isInteger(index) && index >= 0 ? current[index] : undefined;
  }
  if (!current || typeof current !== "object") return undefined;
  return (current as Record<string,unknown>)[key];
}, value);
const validBaseUrl = (value: string) => {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("AI provider base URL must use HTTPS.");
  return url;
};

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null,{headers});
  if (req.method !== "POST") return respond({error:"Method not allowed."},405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return respond({error:"AI runtime is unavailable."},503);
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");
  if (!token) return respond({error:"Authentication required."},401);
  const db = createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError} = await db.auth.getUser(token);
  if (authError || !user) return respond({error:"Authentication required."},401);

  const parsed = Body.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return respond({error:"Invalid AI request.",issues:parsed.error.flatten()},400);
  const request = parsed.data;
  const adminCheck = async () => {
    const {data,error} = await db.rpc("is_super_admin",{_user_id:user.id});
    return !error && data === true;
  };
  if (["creator.metadata","creator.pricing"].includes(request.workflowKey)) {
    const {data,error} = await db.rpc("is_approved_creator",{p_user_id:user.id});
    if (error || data !== true) return respond({error:"An approved creator account is required for this AI workflow."},403);
  }
  if (request.workflowKey === "broadcast.moderation" && !(await adminCheck())) {
    return respond({error:"Platform moderator permission is required for broadcast moderation AI."},403);
  }
  if (request.workflowKey === "finance.anomaly_triage" && !(await adminCheck())) {
    return respond({error:"God Mode finance permission is required for financial anomaly triage."},403);
  }
  const expectedDataClass: Record<string,string> = {
    "creator.metadata":"user_content",
    "creator.pricing":"user_content",
    "broadcast.moderation":"user_generated_content",
    "discovery.semantic":"public",
    "support.first_response":"user_generated_content",
    "finance.anomaly_triage":"aggregate_metrics",
  };
  if (expectedDataClass[request.workflowKey] && request.dataClass !== expectedDataClass[request.workflowKey]) {
    return respond({error:"The data classification does not match this workflow's permitted input contract."},403);
  }
  if ((request.operation === "embedding" && request.workflowKey !== "discovery.semantic")
    || (request.operation === "text" && request.workflowKey === "discovery.semantic")) {
    return respond({error:"The operation is not permitted for this AI workflow."},400);
  }
  if (request.workflowKey.startsWith("finance.") && request.dataClass !== "aggregate_metrics" && request.dataClass !== "operational_telemetry") {
    return respond({error:"Finance AI accepts aggregate metrics and operational telemetry only."},403);
  }

  const {data:policy,error:policyError} = await db.from("platform_ai_policies").select("*")
    .eq("workflow_key",request.workflowKey).eq("enabled",true).maybeSingle();
  if (policyError || !policy) return respond({error:"This AI workflow is not enabled by platform policy."},403);
  if (!policy.allowed_data_classes?.includes(request.dataClass)) return respond({error:"The supplied data classification is not allowed for this workflow."},403);
  if (request.input.length > policy.max_input_chars) return respond({error:"Input exceeds the workflow policy limit."},413);
  let effectiveInput = request.input;
  let knowledgeSources: Array<{slug:string;title:string}> = [];
  if (request.workflowKey === "finance.anomaly_triage") {
    const since = new Date(Date.now()-24*60*60*1000).toISOString();
    const [payments,refunds,contributions,ledger,providers] = await Promise.all([
      db.from("payments").select("amount,currency,status,created_at").gte("created_at",since).limit(5000),
      db.from("payment_refunds").select("amount_minor,currency,status,created_at").gte("created_at",since).limit(5000),
      db.from("event_contributions").select("amount_major,currency,status,created_at").gte("created_at",since).limit(5000),
      db.from("wallet_ledger").select("gross,fee,net,currency,kind,settles_at,created_at").gte("created_at",since).limit(5000),
      db.from("service_provider_bindings").select("capability,provider_key,enabled,health_status").is("removed_at",null).limit(500),
    ]);
    if (payments.error||refunds.error||contributions.error||ledger.error||providers.error) {
      return respond({error:"Authoritative financial and provider telemetry is unavailable; no AI analysis was run."},503);
    }
    const group = (rows:Array<Record<string,unknown>>,amountField:string) => {
      const values = new Map<string,{count:number;amount:number;statuses:Record<string,number>}>();
      for (const row of rows) {
        const currency = String(row.currency??"UNKNOWN");
        const item = values.get(currency)??{count:0,amount:0,statuses:{}};
        item.count++;
        const amount = Number(row[amountField]??0);
        if (Number.isFinite(amount)) item.amount += amount;
        const status = String(row.status??row.kind??"unknown");
        item.statuses[status]=(item.statuses[status]??0)+1;
        values.set(currency,item);
      }
      return Object.fromEntries(values);
    };
    const telemetry = {
      window:"last_24_hours",
      payments:group((payments.data??[]) as Array<Record<string,unknown>>,"amount"),
      refunds:group((refunds.data??[]) as Array<Record<string,unknown>>,"amount_minor"),
      contributions:group((contributions.data??[]) as Array<Record<string,unknown>>,"amount_major"),
      walletLedger:group((ledger.data??[]) as Array<Record<string,unknown>>,"net"),
      providers:(providers.data??[]).map(p=>({capability:p.capability,provider:p.provider_key,enabled:p.enabled,health:p.health_status})),
      truncated: [payments.data,refunds.data,contributions.data,ledger.data].some(rows=>(rows?.length??0)>=5000),
    };
    effectiveInput = "Authorized operator question: "+request.input+"\n\nVerified platform aggregates from the database (last 24 hours):\n"+JSON.stringify(telemetry)+
      "\n\nIdentify anomalies for human investigation only. Do not infer payment or refund success from aggregate counts. Never recommend changing balances, releasing settlement, approving refunds, changing payout state, or modifying account verification.";
  }
  if (request.workflowKey === "support.first_response") {
    if (request.dataClass !== "user_generated_content") return respond({error:"Support AI accepts a user question and retrieves approved knowledgebase material server-side."},400);
    if (/(refund|chargeback|payment|paid|transaction|payout|withdraw|wallet balance|bank account|kyc|kyb|identity|verification|verified|account status)/i.test(request.input)) {
      return respond({
        workflowKey:request.workflowKey,
        output:"I can explain the support process, but I cannot confirm payment, refund, payout, wallet, bank, identity, KYC, KYB, or account outcomes. A support agent must verify the relevant authoritative records before giving you a status.",
        requiresHumanReview:true,
        decisionAuthority:"none",
        sources:[],
      });
    }
    const {data:articles,error:knowledgeError} = await db.from("knowledgebase_articles")
      .select("slug,title,summary,body_markdown").eq("is_published",true)
      .textSearch("search_vector",request.input,{type:"websearch",config:"simple"}).limit(8);
    if (knowledgeError) return respond({error:"Approved support knowledge could not be retrieved."},503);
    if (!articles?.length) return respond({
      workflowKey:request.workflowKey,
      output:"I could not find an approved help article that answers this question. I’m escalating it to the support team for a verified response.",
      requiresHumanReview:true,
      decisionAuthority:"none",
      sources:[],
    });
    const sourceBudget = Math.max(0,policy.max_input_chars-request.input.length-600);
    let remainingSourceChars = sourceBudget;
    const sourceBlocks: string[] = [];
    for (const article of articles) {
      if (remainingSourceChars <= 0) break;
      const block = ("SOURCE: "+article.title+"\n"+(article.summary ?? "")+"\n"+article.body_markdown).slice(0,remainingSourceChars);
      if (!block.trim()) continue;
      sourceBlocks.push(block);
      knowledgeSources.push({slug:article.slug,title:article.title});
      remainingSourceChars -= block.length;
    }
    if (sourceBlocks.length === 0) return respond({
      workflowKey:request.workflowKey,
      output:"The approved knowledgebase did not contain enough material to answer this question. I’m escalating it to the support team.",
      requiresHumanReview:true,
      decisionAuthority:"none",
      sources:[],
    });
    const sourceText = sourceBlocks.join("\n\n");
    effectiveInput = "Customer question:\n"+request.input+"\n\nApproved knowledgebase sources (the only factual support material you may use):\n"+sourceText+
      "\n\nAnswer only what these sources support. If they do not answer the question, say so and recommend human support. Do not claim payment, refund, payout, identity, KYC, or account status.";
  }
  if (policy.allow_financial_decisions !== false || policy.allow_identity_decisions !== false) {
    return respond({error:"AI policy cannot authorize financial or identity decisions."},403);
  }
  const {data:bindings,error:bindingError} = await db.from("service_provider_bindings")
    .select("provider_key,base_url,endpoints,settings,is_live,priority")
    .eq("capability",policy.capability).eq("enabled",true).eq("health_status","healthy").is("removed_at",null)
    .order("priority",{ascending:true});
  if (bindingError) return respond({error:"AI provider routing is unavailable."},503);
  const allowed = (bindings ?? []).filter(row => policy.provider_allowlist?.includes(row.provider_key));
  if (!allowed.length) return respond({error:"No policy-approved AI provider is active for this workflow."},503);

  const failures: string[] = [];
  for (const binding of allowed) {
    try {
      if (!binding.base_url) throw new Error("Provider base URL is missing.");
      const endpointKey = request.operation === "embedding" ? "embeddings" : "completion";
      const endpointPath = binding.endpoints?.[endpointKey];
      if (typeof endpointPath !== "string" || !endpointPath.startsWith("/") || endpointPath.startsWith("//")) {
        throw new Error("Provider endpoint is not configured.");
      }
      const target = new URL(endpointPath,validBaseUrl(binding.base_url));
      if (target.origin !== new URL(binding.base_url).origin) throw new Error("Provider endpoint host mismatch.");
      const {data:secretRows,error:secretError} = await db.rpc("get_service_provider_admin_secret",{
        p_capability:policy.capability,p_provider_key:binding.provider_key,
      });
      const secret = Array.isArray(secretRows) ? secretRows[0] : null;
      const credential = binding.is_live ? secret?.live_credential : secret?.test_credential;
      if (secretError || !credential) throw new Error("Provider credential is unavailable.");
      const authHeader = typeof binding.settings?.auth_header === "string" ? binding.settings.auth_header : "Authorization";
      const authPrefix = typeof binding.settings?.auth_prefix === "string" ? binding.settings.auth_prefix : "Bearer ";
      const protocol = binding.settings?.protocol;
      const model = policy.model_key || binding.settings?.model;
      if (typeof model !== "string" || !model.trim()) throw new Error("AI model is not configured.");
      let payload: Record<string,unknown>;
      if (request.operation === "embedding") {
        if (protocol !== "openai_compatible") throw new Error("Embedding adapter requires the openai_compatible protocol.");
        payload = {model,input:request.input};
      } else if (protocol === "anthropic_messages") {
        payload = {model,max_tokens:policy.max_output_tokens,system:policy.system_policy+"\n\nNON-OVERRIDABLE PLATFORM SAFETY: You are advisory only. Never assert or decide payment, refund, chargeback, payout, bank, identity, KYC, KYB, age-verification, or account status. Never execute actions. State uncertainty and require authorized human review.",
          messages:[{role:"user",content:effectiveInput}]};
      } else if (protocol === "openai_compatible") {
        payload = {model,max_tokens:policy.max_output_tokens,
          messages:[{role:"system",content:policy.system_policy+"\n\nNON-OVERRIDABLE PLATFORM SAFETY: You are advisory only. Never assert or decide payment, refund, chargeback, payout, bank, identity, KYC, KYB, age-verification, or account status. Never execute actions. State uncertainty and require authorized human review."},{role:"user",content:effectiveInput}]};
      } else {
        throw new Error("Provider protocol is not supported by the configured adapter.");
      }
      const upstream = await fetch(target,{
        method:"POST",
        headers:{[authHeader]:authPrefix+credential,"Content-Type":"application/json",Accept:"application/json"},
        body:JSON.stringify(payload),
        signal:AbortSignal.timeout(30000),
      });
      if (!upstream.ok) throw new Error("Provider returned HTTP "+upstream.status);
      const response: unknown = await upstream.json();
      const responsePath = typeof binding.settings?.response_path === "string" ? binding.settings.response_path : "";
      const output = responsePath ? readPath(response,responsePath) : request.operation === "embedding"
        ? readPath(response,"data.0.embedding")
        : protocol === "anthropic_messages" ? readPath(response,"content.0.text")
        : readPath(response,"choices.0.message.content");
      if (request.operation === "embedding") {
        if (!Array.isArray(output) || output.length === 0 || output.some(v => typeof v !== "number" || !Number.isFinite(v))) {
          throw new Error("Provider returned an invalid embedding vector.");
        }
        await db.from("service_provider_bindings").update({health_status:"healthy",health_checked_at:new Date().toISOString(),health_error:null})
          .eq("capability",policy.capability).eq("provider_key",binding.provider_key);
        return respond({workflowKey:request.workflowKey,provider:binding.provider_key,model,embedding:output,requiresHumanReview:policy.requires_human_review});
      }
      if (typeof output !== "string" || !output.trim()) throw new Error("Provider returned no text output.");
      if (request.workflowKey === "support.first_response" &&
        /(refund (was|has been|is) (approved|issued|processed|completed)|payment (was|has been|is) (successful|confirmed|received)|payout (was|has been|is) (sent|processed|completed)|account (is|has been) verified|kyc (is|has been) approved)/i.test(output)) {
        return respond({workflowKey:request.workflowKey,output:"I cannot verify or confirm financial or account outcomes. A support agent must check the authoritative records before providing that status.",requiresHumanReview:true,decisionAuthority:"none",sources:[]});
      }
      await db.from("service_provider_bindings").update({health_status:"healthy",health_checked_at:new Date().toISOString(),health_error:null})
        .eq("capability",policy.capability).eq("provider_key",binding.provider_key);
      return respond({workflowKey:request.workflowKey,provider:binding.provider_key,model,output:output.trim(),
        requiresHumanReview:policy.requires_human_review,decisionAuthority:"none",sources:knowledgeSources});
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provider failure";
      failures.push(binding.provider_key+": "+message);
      await db.from("service_provider_bindings").update({health_status:"unhealthy",health_checked_at:new Date().toISOString(),health_error:message.slice(0,500)})
        .eq("capability",policy.capability).eq("provider_key",binding.provider_key);
    }
  }
  return respond({error:"All policy-approved AI providers failed.",code:"AI_PROVIDER_UNAVAILABLE",failures},503);
});
