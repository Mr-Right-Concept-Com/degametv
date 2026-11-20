import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const headers = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Content-Type":"application/json", "Cache-Control":"no-store" };
const object = z.record(z.string(),z.unknown());
const Body = z.discriminatedUnion("action",[
  z.object({action:z.literal("release_list")}),
  z.object({action:z.literal("release_probe"),releaseKey:z.string()}),
  z.object({action:z.literal("release_probe_batch"),releaseKey:z.string(),samples:z.number().int().min(1).max(50)}),
  z.object({action:z.literal("release_save"),releaseKey:z.string().regex(/^[a-z][a-z0-9_.-]{1,100}$/),releaseVersion:z.string().min(1).max(80),config:object}),
  z.object({action:z.literal("release_transition"),releaseKey:z.string(),transition:z.enum(["validate","start_canary","set_traffic","approve","pause","rollback"]),trafficPercentage:z.number().int().min(1).max(99).optional(),reason:z.string().min(3).max(500)}),
  z.object({action:z.literal("ai_policy_list")}),
  z.object({action:z.literal("security_alert_list"),unresolvedOnly:z.boolean().optional()}),
  z.object({action:z.literal("security_alert_resolve"),alertId:z.string().uuid(),resolutionNote:z.string().trim().min(5).max(1000)}),
  z.object({action:z.literal("ai_policy_update"),workflowKey:z.string(),enabled:z.boolean(),providerAllowlist:z.array(z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/)).max(10),modelKey:z.string().trim().max(120).nullable(),maxInputChars:z.number().int().min(1).max(200000),maxOutputTokens:z.number().int().min(1).max(16000),allowedDataClasses:z.array(z.enum(["public","user_content","user_generated_content","support_knowledge","aggregate_metrics","operational_telemetry"])).min(1),requiresHumanReview:z.boolean(),systemPolicy:z.string().min(20).max(12000)}),
]);
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const safeHealthUrl=(value:unknown)=>{
  const target=new URL(String(value));
  const host=target.hostname.toLowerCase();
  if(target.protocol!=="https:"||target.username||target.password||!host.includes(".")||
    host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal")||
    /^127\\./.test(host)||/^10\\./.test(host)||/^192\\.168\\./.test(host)||/^169\\.254\\./.test(host)||
    /^172\\.(1[6-9]|2[0-9]|3[01])\\./.test(host)||host==="[::1]"||host.startsWith("[fc")||host.startsWith("[fd")||host.startsWith("[fe80")) {
    throw new Error("Health endpoint must be a public HTTPS hostname.");
  }
  return target;
};

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers});
  if(req.method!=="POST")return respond({error:"Method not allowed."},405);
  const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization");
  if(!url||!service||!authorization?.startsWith("Bearer "))return respond({error:"Platform control is unavailable."},503);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(authorization.slice(7));
  if(authError||!user)return respond({error:"Authentication required."},401);
  const {data:adminRole,error:roleError}=await admin.from("user_roles").select("user_id")
    .eq("user_id",user.id).eq("role","super_admin").maybeSingle();
  if(roleError||!adminRole)return respond({error:"Super administrator access required."},403);
  const parsed=Body.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return respond({error:"Invalid platform control request.",issues:parsed.error.flatten()},400);
  const p=parsed.data;
  try{
    if(p.action==="security_alert_list"){
      let query=admin.from("platform_security_alerts").select("id,severity,event_key,actor_id,entity_type,entity_id,summary,details,created_at,resolved_at,resolved_by,resolution_note").order("created_at",{ascending:false}).limit(200);
      if(p.unresolvedOnly)query=query.is("resolved_at",null);
      const {data,error}=await query;
      if(error)return respond({error:"Security alerts could not be loaded."},503);
      return respond({alerts:data??[]});
    }
    if(p.action==="security_alert_resolve"){
      const {data,error}=await admin.rpc("resolve_platform_security_alert",{
        p_alert_id:p.alertId,p_actor_id:user.id,p_resolution_note:p.resolutionNote,
      });
      if(error){
        const message=error.message??"";
        if(message.includes("security_alert_already_resolved"))return respond({error:"This alert was already resolved."},409);
        if(message.includes("security_alert_not_found"))return respond({error:"Security alert was not found."},404);
        if(message.includes("security_alert_resolution_note_required"))return respond({error:"A resolution note of at least five characters is required."},422);
        return respond({error:"Alert resolution could not be committed."},503);
      }
      return respond({alert:data});
    }
    if(p.action==="release_probe"||p.action==="release_probe_batch"){
      const {data:rollout,error}=await admin.from("platform_release_rollouts").select("id,release_key,state,config").eq("release_key",p.releaseKey).single();
      if(error||!rollout)return respond({error:"Release was not found."},404);
      if(rollout.state!=="canary")return respond({error:"Only active canary releases can be probed."},409);
      let target:URL;try{target=safeHealthUrl(rollout.config?.health_check_url);}catch{return respond({error:"Release health endpoint must be a public HTTPS URL."},400);}
      const sampleCount=p.action==="release_probe_batch"?p.samples:1;
      const observations:Array<{rollout_id:string;release_key:string;subject_bucket:string;success:boolean;latency_ms:number;error_code:string|null}>=[];
      let cursor=0;
      const probeWorker=async()=>{
        while(true){
          const index=cursor++;if(index>=sampleCount)return;
          const started=performance.now();let success=false;let errorCode:string|null=null;
          try{const probe=await fetch(target,{headers:{Accept:"application/json"},redirect:"manual",signal:AbortSignal.timeout(8000)});const body=await probe.json().catch(()=>null);success=probe.ok&&(body?.ok===true||body?.status===true);if(!success)errorCode="health_check_failed";}catch{errorCode="health_check_unreachable";}
          observations[index]={rollout_id:rollout.id,release_key:rollout.release_key,subject_bucket:crypto.randomUUID(),success,latency_ms:Math.max(0,Math.round(performance.now()-started)),error_code:errorCode};
        }
      };
      await Promise.all(Array.from({length:Math.min(5,sampleCount)},()=>probeWorker()));
      const {error:writeError}=await admin.from("platform_release_observations").insert(observations);
      if(writeError)return respond({error:"Health probe results could not be recorded."},503);
      const latencies=observations.map(row=>row.latency_ms).sort((a,b)=>a-b);
      const errorCount=observations.filter(row=>!row.success).length;
      return respond({success:errorCount===0,samples:sampleCount,successfulSamples:sampleCount-errorCount,errorRate:errorCount/sampleCount,
        p95LatencyMs:latencies[Math.min(latencies.length-1,Math.ceil(latencies.length*.95)-1)],releaseKey:rollout.release_key});
    }
    if(p.action==="release_list"){
      const {data,error}=await admin.from("platform_release_rollouts").select("*").order("updated_at",{ascending:false});
      if(error)return respond({error:"Release rollouts could not be loaded."},503);
      return respond({rollouts:data??[]});
    }
    if(p.action==="release_save"){
      const {data:existing,error:readError}=await admin.from("platform_release_rollouts")
        .select("id,state").eq("release_key",p.releaseKey).maybeSingle();
      if(readError)return respond({error:"Release state could not be read."},503);
      if(existing&&existing.state!=="draft")return respond({error:"Only draft releases can be edited. Create a new release key/version for a validated or active release."},409);
      const draft={release_version:p.releaseVersion,state:"draft",traffic_percentage:0,config:p.config,updated_at:new Date().toISOString()};
      let data:Record<string,unknown>|null=null;
      let error:unknown=null;
      if(existing){
        const result=await admin.from("platform_release_rollouts").update(draft).eq("id",existing.id).eq("state","draft").select().maybeSingle();
        data=result.data as Record<string,unknown>|null;error=result.error;
        if(!error&&!data)return respond({error:"Release changed concurrently. Reload before editing."},409);
      }else{
        const result=await admin.from("platform_release_rollouts").insert({...draft,release_key:p.releaseKey,created_by:user.id}).select().single();
        data=result.data as Record<string,unknown>|null;error=result.error;
      }
      if(error||!data)return respond({error:"Draft release could not be saved. The release key may already exist."},409);
      await admin.from("platform_release_audit").insert({rollout_id:data.id,actor_id:user.id,action:"created",details:{reason:"Draft release saved",releaseVersion:p.releaseVersion}});
      await admin.from("audit_logs").insert({user_id:user.id,action:"release.draft.saved",entity_type:"platform_release",entity_id:data.id,new_data:{release_key:p.releaseKey,release_version:p.releaseVersion}});
      return respond({rollout:data});
    }
    if(p.action==="release_transition"){
      const {data:rollout,error:readError}=await admin.from("platform_release_rollouts")
        .select("state,config").eq("release_key",p.releaseKey).maybeSingle();
      if(readError||!rollout)return respond({error:"Release was not found."},404);
      if(p.transition==="validate"){
        const digest=rollout.config?.artifact_digest;
        if(typeof digest!=="string"||!/^sha256:[a-f0-9]{64}$/.test(digest))return respond({error:"A SHA-256 artifact_digest is required before validation."},400);
        try{safeHealthUrl(rollout.config?.health_check_url);}catch{return respond({error:"A valid public HTTPS health_check_url is required."},400);}
      }
      const {data,error}=await admin.rpc("transition_platform_release",{
        p_release_key:p.releaseKey,
        p_expected_state:rollout.state,
        p_transition:p.transition,
        p_actor_id:user.id,
        p_reason:p.reason,
        p_traffic_percentage:p.transition==="start_canary"?(p.trafficPercentage??5):p.trafficPercentage??null,
      });
      if(error){
        const conflict=["release_state_conflict","canary_insufficient_verified_samples","canary_health_thresholds_failed","release_not_in_canary","release_cannot_be_paused","release_cannot_be_rolled_back"].some(code=>error.message?.includes(code));
        return respond({error:conflict?"Release state or health conditions changed. Refresh and review the latest canary telemetry.":"Release transition was rejected.",code:error.message},conflict?409:400);
      }
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
