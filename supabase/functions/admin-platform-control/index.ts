import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const headers = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Content-Type":"application/json", "Cache-Control":"no-store" };
const object = z.record(z.string(),z.unknown());
const Body = z.discriminatedUnion("action",[
  z.object({action:z.literal("release_list")}),
  z.object({action:z.literal("release_save"),releaseKey:z.string().regex(/^[a-z][a-z0-9_.-]{1,100}$/),releaseVersion:z.string().min(1).max(80),config:object}),
  z.object({action:z.literal("release_transition"),releaseKey:z.string(),transition:z.enum(["validate","start_canary","set_traffic","approve","pause","rollback"]),trafficPercentage:z.number().int().min(1).max(99).optional(),reason:z.string().min(3).max(500)}),
  z.object({action:z.literal("ai_policy_list")}),
  z.object({action:z.literal("ai_policy_update"),workflowKey:z.string(),enabled:z.boolean(),providerAllowlist:z.array(z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/)).max(10),modelKey:z.string().trim().max(120).nullable(),maxInputChars:z.number().int().min(1).max(200000),maxOutputTokens:z.number().int().min(1).max(16000),allowedDataClasses:z.array(z.enum(["public","user_content","user_generated_content","support_knowledge","aggregate_metrics","operational_telemetry"])).min(1),requiresHumanReview:z.boolean(),systemPolicy:z.string().min(20).max(12000)}),
]);
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const p95=(values:number[])=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)];};

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers});
  if(req.method!=="POST")return respond({error:"Method not allowed."},405);
  const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization");
  if(!url||!service||!authorization?.startsWith("Bearer "))return respond({error:"Platform control is unavailable."},503);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(authorization.slice(7));
  if(authError||!user)return respond({error:"Authentication required."},401);
  const {data:isAdmin,error:roleError}=await admin.rpc("is_super_admin",{_user_id:user.id});
  if(roleError||!isAdmin)return respond({error:"Super administrator access required."},403);
  const parsed=Body.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return respond({error:"Invalid platform control request.",issues:parsed.error.flatten()},400);
  const p=parsed.data;
  try{
    if(p.action==="release_list"){
      const {data,error}=await admin.from("platform_release_rollouts").select("*").order("updated_at",{ascending:false});
      if(error)return respond({error:"Release rollouts could not be loaded."},503);
      return respond({rollouts:data??[]});
    }
    if(p.action==="release_save"){
      const {data:existing,error:readError}=await admin.from("platform_release_rollouts").select("id,state").eq("release_key",p.releaseKey).maybeSingle();
      if(readError)return respond({error:"Release state could not be read."},503);
      if(existing&&existing.state!=="draft")return respond({error:"Only draft releases can be edited. Create a new release key/version for a validated or active release."},409);
      const {data,error}=await admin.from("platform_release_rollouts").upsert({
        release_key:p.releaseKey,release_version:p.releaseVersion,state:"draft",traffic_percentage:0,
        config:p.config,created_by:user.id,updated_at:new Date().toISOString(),
      },{onConflict:"release_key"}).select().single();
      if(error)return respond({error:error.message},400);
      await admin.from("platform_release_audit").insert({rollout_id:data.id,actor_id:user.id,action:existing?"created":"created",details:{reason:"Draft release saved",releaseVersion:p.releaseVersion}});
      await admin.from("audit_logs").insert({user_id:user.id,action:"release.draft.saved",entity_type:"platform_release",entity_id:data.id,new_data:{release_key:p.releaseKey,release_version:p.releaseVersion}});
      return respond({rollout:data});
    }
    if(p.action==="release_transition"){
      const {data:rollout,error:readError}=await admin.from("platform_release_rollouts").select("*").eq("release_key",p.releaseKey).single();
      if(readError||!rollout)return respond({error:"Release was not found."},404);
      let patch:Record<string,unknown>={updated_at:new Date().toISOString()};
      let auditAction:"validated"|"canary_started"|"traffic_changed"|"approved"|"paused"|"rolled_back";
      if(p.transition==="validate"){
        if(rollout.state!=="draft")return respond({error:"Only draft releases can be validated."},409);
        const digest=rollout.config?.artifact_digest;
        const healthUrl=rollout.config?.health_check_url;
        if(typeof digest!=="string"||!/^sha256:[a-f0-9]{64}$/.test(digest))return respond({error:"A SHA-256 artifact_digest is required before validation."},400);
        try{const parsedUrl=new URL(String(healthUrl));if(parsedUrl.protocol!=="https:"||parsedUrl.username||parsedUrl.password)return respond({error:"A verified HTTPS health_check_url is required."},400);}catch{return respond({error:"A valid HTTPS health_check_url is required."},400);}
        patch.state="validated";patch.traffic_percentage=0;auditAction="validated";
      }else if(p.transition==="start_canary"){
        if(rollout.state!=="validated")return respond({error:"Release must pass validation before canary."},409);
        const percentage=p.trafficPercentage??5;
        patch.state="canary";patch.traffic_percentage=percentage;auditAction="canary_started";
      }else if(p.transition==="set_traffic"){
        if(rollout.state!=="canary"||p.trafficPercentage===undefined)return respond({error:"Traffic can only be changed on an active canary."},409);
        patch.traffic_percentage=p.trafficPercentage;auditAction="traffic_changed";
      }else if(p.transition==="approve"){
        if(rollout.state!=="canary")return respond({error:"Only an active canary can be approved."},409);
        const since=new Date(Date.now()-rollout.health_window_seconds*1000).toISOString();
        const {data:observations,error:metricsError}=await admin.from("platform_release_observations").select("success,latency_ms")
          .eq("release_key",p.releaseKey).gte("observed_at",since);
        if(metricsError)return respond({error:"Canary health telemetry is unavailable."},503);
        const samples=observations??[];
        if(samples.length<rollout.minimum_samples)return respond({error:"Canary has insufficient verified health samples.",required:rollout.minimum_samples,observed:samples.length},409);
        const errors=samples.filter(row=>!row.success).length;
        const errorRate=errors/samples.length;
        const latency=p95(samples.map(row=>Number(row.latency_ms)).filter(Number.isFinite));
        if(errorRate>Number(rollout.error_rate_threshold)||latency>rollout.latency_p95_threshold_ms)
          return respond({error:"Canary health thresholds were not met. Keep traffic limited or roll back.",samples:samples.length,errorRate,p95LatencyMs:latency},409);
        patch.state="approved";patch.traffic_percentage=100;patch.approved_by=user.id;patch.approved_at=new Date().toISOString();auditAction="approved";
      }else if(p.transition==="pause"){
        if(!["validated","canary"].includes(rollout.state))return respond({error:"Only validated or canary releases can be paused."},409);
        patch.state="paused";patch.traffic_percentage=0;auditAction="paused";
      }else{
        if(!["validated","canary","paused"].includes(rollout.state))return respond({error:"This release state cannot be rolled back."},409);
        patch.state="rolled_back";patch.traffic_percentage=0;patch.rolled_back_by=user.id;patch.rolled_back_at=new Date().toISOString();auditAction="rolled_back";
      }
      const {data,error}=await admin.from("platform_release_rollouts").update(patch).eq("id",rollout.id).select().single();
      if(error)return respond({error:error.message},400);
      await admin.from("platform_release_audit").insert({rollout_id:rollout.id,actor_id:user.id,action:auditAction,details:{reason:p.reason,previous_state:rollout.state,new_state:data.state,traffic_percentage:data.traffic_percentage}});
      await admin.from("audit_logs").insert({user_id:user.id,action:"release."+auditAction,entity_type:"platform_release",entity_id:rollout.id,old_data:{state:rollout.state,traffic_percentage:rollout.traffic_percentage},new_data:{state:data.state,traffic_percentage:data.traffic_percentage,reason:p.reason}});
      return respond({rollout:data});
    }
    if(p.action==="ai_policy_list"){
      const {data,error}=await admin.from("platform_ai_policies").select("*").order("workflow_key");
      if(error)return respond({error:"AI policies could not be loaded."},503);
      return respond({policies:data??[]});
    }
    if(p.action==="ai_policy_update"){
      const {data:current,error:readError}=await admin.from("platform_ai_policies").select("*").eq("workflow_key",p.workflowKey).single();
      if(readError||!current)return respond({error:"AI workflow policy was not found."},404);
      if(p.enabled){
        if(!p.providerAllowlist.length)return respond({error:"Enable at least one approved provider before enabling this workflow."},400);
        const {data:providers,error:providerError}=await admin.from("service_provider_bindings").select("provider_key,capability,enabled,health_status,removed_at")
          .eq("capability",current.capability).in("provider_key",p.providerAllowlist).eq("enabled",true).is("removed_at",null);
        if(providerError)return respond({error:"AI provider state could not be verified."},503);
        const healthy=new Set((providers??[]).filter(row=>row.health_status==="healthy").map(row=>row.provider_key));
        if(p.providerAllowlist.some(key=>!healthy.has(key)))return respond({error:"Every allowlisted provider must be enabled and pass a health check before the workflow can be enabled."},409);
      }
      const {data,error}=await admin.from("platform_ai_policies").update({
        enabled:p.enabled,provider_allowlist:p.providerAllowlist,model_key:p.modelKey,
        max_input_chars:p.maxInputChars,max_output_tokens:p.maxOutputTokens,allowed_data_classes:p.allowedDataClasses,
        requires_human_review:p.requiresHumanReview,system_policy:p.systemPolicy,
        allow_financial_decisions:false,allow_identity_decisions:false,updated_by:user.id,updated_at:new Date().toISOString(),
      }).eq("workflow_key",p.workflowKey).select().single();
      if(error)return respond({error:error.message},400);
      await admin.from("audit_logs").insert({user_id:user.id,action:"ai.policy.updated",entity_type:"platform_ai_policy",entity_id:null,old_data:{enabled:current.enabled,provider_allowlist:current.provider_allowlist},new_data:{workflow_key:p.workflowKey,enabled:data.enabled,provider_allowlist:data.provider_allowlist}});
      return respond({policy:data});
    }
    return respond({error:"Unsupported platform control action."},400);
  }catch(error){
    console.error("admin-platform-control",error instanceof Error?error.message:"Control plane error");
    return respond({error:"Platform control operation failed."},500);
  }
});
