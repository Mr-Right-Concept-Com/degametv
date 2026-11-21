import { createServiceClient, type TypedSupabaseClient } from "../_shared/supabase.ts";
import {z} from "npm:zod@3";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-media-worker-secret,x-media-transcoder-callback-secret","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const enc=new TextEncoder(),hex=(v:ArrayBuffer)=>[...new Uint8Array(v)].map(x=>x.toString(16).padStart(2,"0")).join("");
const hash=async(v:string|Uint8Array)=>hex(await crypto.subtle.digest("SHA-256",typeof v==="string"?enc.encode(v):v));
const hmac=async(k:Uint8Array|string,v:string)=>new Uint8Array(await crypto.subtle.sign("HMAC",await crypto.subtle.importKey("raw",typeof k==="string"?enc.encode(k):toArrayBuffer(k),{name:"HMAC",hash:"SHA-256"},false,["sign"]),enc.encode(v)));
const encode=(v:string)=>encodeURIComponent(v).replace(/[!'()*]/g,c=>"%"+c.charCodeAt(0).toString(16).toUpperCase());
const query=(u:URL)=>[...u.searchParams.entries()].sort(([a,av],[b,bv])=>a.localeCompare(b)||av.localeCompare(bv)).map(([k,v])=>encode(k)+"="+encode(v)).join("&");
const stamp=()=>new Date().toISOString().replace(/[:-]|\.\d{3}/g,"");
type Binding={id:string;provider_key:string;base_url:string|null;endpoints:Record<string,string>;settings:Record<string,unknown>;credential:string;webhook_secret:string|null;};
type Storage={endpoint:URL;bucket:string;deliveryBucket:string;region:string;accessKeyId:string;secretAccessKey:string;sessionToken?:string;pathStyle:boolean;};
async function binding(db:TypedSupabaseClient,capability:string):Promise<Binding>{
 const {data,error}=await db.rpc("get_service_provider_runtime_config",{p_capability:capability});
 if(error||!Array.isArray(data)||!data.length)throw new Error("No enabled "+capability+" provider binding is configured.");
 return data[0] as Binding;
}
function storageConfig(p:Binding):Storage{
 let c:Record<string,unknown>;try{c=JSON.parse(p.credential) as Record<string,unknown>;}catch{throw new Error("The media_storage Vault credential must contain S3 accessKeyId and secretAccessKey.");}
 const endpoint=String(p.base_url??p.settings.endpoint??""),bucket=String(p.settings.quarantineBucket??p.settings.bucket??""),deliveryBucket=String(p.settings.deliveryBucket??"");
 if(!endpoint||!bucket||!deliveryBucket||bucket===deliveryBucket||typeof c.accessKeyId!=="string"||typeof c.secretAccessKey!=="string")throw new Error("The media_storage provider is missing its endpoint, bucket or S3 credentials.");
 return {endpoint:new URL(endpoint),bucket,deliveryBucket,region:String(p.settings.region??"auto"),accessKeyId:c.accessKeyId,secretAccessKey:c.secretAccessKey,sessionToken:typeof c.sessionToken==="string"?c.sessionToken:undefined,pathStyle:p.settings.pathStyle!==false};
}
function objectUrl(c:Storage,key:string,bucket=c.bucket){const u=new URL(c.endpoint.toString());if(c.pathStyle)u.pathname=u.pathname.replace(/\/$/,"")+"/"+encode(bucket)+"/"+key.split("/").map(encode).join("/");else{u.hostname=bucket+"."+u.hostname;u.pathname=u.pathname.replace(/\/$/,"")+"/"+key.split("/").map(encode).join("/");}return u;}
async function keyFor(c:Storage,date:string){return hmac(await hmac(await hmac(await hmac("AWS4"+c.secretAccessKey,date),c.region),"s3"),"aws4_request");}
async function requestS3(c:Storage,key:string,method:string,headers:Record<string,string>={},body?:string,bucket=c.bucket){
 const u=objectUrl(c,key,bucket),now=stamp(),day=now.slice(0,8),payload=await hash(body??"");
 const all={host:u.host,"x-amz-content-sha256":payload,"x-amz-date":now,...(c.sessionToken?{"x-amz-security-token":c.sessionToken}:{}),...headers};
 const canonicalHeaders=Object.entries(all).map(([k,v])=>[k.toLowerCase(),v.trim()] as const).sort(([a],[b])=>a.localeCompare(b)),signed=canonicalHeaders.map(([k])=>k).join(";");
 const canonical=method+"\n"+u.pathname+"\n"+query(u)+"\n"+canonicalHeaders.map(([k,v])=>k+":"+v+"\n").join("")+"\n"+signed+"\n"+payload;
 const scope=day+"/"+c.region+"/s3/aws4_request",toSign="AWS4-HMAC-SHA256\n"+now+"\n"+scope+"\n"+await hash(canonical),sig=hex(await hmac(await keyFor(c,day),toSign));
 const auth="AWS4-HMAC-SHA256 Credential="+c.accessKeyId+"/"+scope+", SignedHeaders="+signed+", Signature="+sig;
 const {host:_host,...wireHeaders}=all;return fetch(u,{method,headers:{...wireHeaders,...headers,Authorization:auth},body:body??undefined,signal:AbortSignal.timeout(30000)});
}
async function presign(c:Storage,key:string,method:"GET"|"PUT",contentType?:string,bucket=c.bucket,expiresSeconds=900){
 const u=objectUrl(c,key,bucket),now=stamp(),day=now.slice(0,8),scope=day+"/"+c.region+"/s3/aws4_request";
 const headers=contentType?"content-type;host":"host";
 const params:Record<string,string>={"X-Amz-Algorithm":"AWS4-HMAC-SHA256","X-Amz-Credential":c.accessKeyId+"/"+scope,"X-Amz-Date":now,"X-Amz-Expires":String(expiresSeconds),"X-Amz-SignedHeaders":headers};
 if(c.sessionToken)params["X-Amz-Security-Token"]=c.sessionToken;for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
 const canonical=method+"\n"+u.pathname+"\n"+query(u)+"\n"+(contentType?"content-type:"+contentType+"\n":"")+"host:"+u.host+"\n\n"+headers+"\nUNSIGNED-PAYLOAD";
 const toSign="AWS4-HMAC-SHA256\n"+now+"\n"+scope+"\n"+await hash(canonical),sig=hex(await hmac(await keyFor(c,day),toSign));
 u.searchParams.set("X-Amz-Signature",sig);return u.toString();
}
const Scan=z.object({clean:z.boolean(),engine:z.string().min(1),signatureVersion:z.string().optional(),sha256:z.string().regex(/^[a-f0-9]{64}$/i),findings:z.array(z.string()).default([])});
const Transcode=z.object({jobId:z.string().uuid(),status:z.literal("accepted"),providerJobId:z.string().min(1),renditions:z.array(z.object({path:z.string().min(1),kind:z.enum(["hls","dash","thumbnail","preview","caption"]),mimeType:z.string().optional(),width:z.number().int().positive().optional(),height:z.number().int().positive().optional(),language:z.string().optional()})).default([]),subtitles:z.array(z.record(z.unknown())).default([])});
const Callback=z.object({action:z.literal("transcode_callback"),jobId:z.string().uuid(),status:z.enum(["complete","failed"]),renditions:z.array(z.object({path:z.string().min(1).max(1000),kind:z.enum(["hls","dash","thumbnail","preview","caption"]),mimeType:z.string().optional(),width:z.number().int().positive().optional(),height:z.number().int().positive().optional(),language:z.string().optional()})).default([]),subtitles:z.array(z.record(z.unknown())).default([]),error:z.string().max(1000).optional()}).strict();
Deno.serve(async req=>{
 try {
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)return json(503,{error:"Media worker is not configured."});
 const db=createServiceClient(url,key);
 const {data:workerSecret,error:workerSecretError}=await db.rpc("get_media_worker_secret");
 if(workerSecretError||typeof workerSecret!=="string"||!workerSecret)return json(503,{error:"Worker authentication material is unavailable."});
 const body=await req.json().catch(()=>({}));
 if(body?.action==="transcode_callback"){
  const {data:callbackSecret,error:callbackSecretError}=await db.rpc("get_media_transcoder_callback_secret");
  if(callbackSecretError||typeof callbackSecret!=="string"||!callbackSecret||req.headers.get("x-media-transcoder-callback-secret")!==callbackSecret)return json(401,{error:"Transcoder callback authentication failed."});
 }else if(req.headers.get("x-media-worker-secret")!==workerSecret)return json(401,{error:"Worker authentication failed."});
 if(body?.action!=="transcode_callback"){
  const {count,error:queueError}=await db.from("media_processing_jobs")
   .select("id",{count:"exact",head:true})
   .in("status",["QUARANTINED","RETRY_WAIT"])
   .lte("available_at",new Date().toISOString());
  if(queueError)return json(503,{error:"Durable media queue could not be inspected.",code:"MEDIA_QUEUE_UNAVAILABLE"});
  if((count??0)===0)return json(200,{success:true,status:"idle",claimed:0,results:[]});
 }
 let storage:Storage;
 try{storage=storageConfig(await binding(db,"media_storage"));}catch(e){return json(503,{error:e instanceof Error?e.message:"Storage provider unavailable.",code:"MEDIA_STORAGE_PROVIDER_UNAVAILABLE"});}
 if(body?.action==="transcode_callback"){
  const parsed=Callback.safeParse(body);if(!parsed.success)return json(400,{error:"Invalid transcoder callback."});const p=parsed.data;
  const {data:job,error}=await db.from("media_processing_jobs").select("id,upload_session_id,content_id,status,attempts,max_attempts,clean_master_path,quarantine_path").eq("id",p.jobId).maybeSingle();
  if(error||!job||job.status!=="TRANSCODING")return json(404,{error:"Active transcode job not found."});
  if(p.status==="failed"){const attempts=Number(job.attempts??1),dead=attempts>=Number(job.max_attempts??8),delay=Math.min(3600,Math.pow(2,attempts)*15);const {error:updateError}=await db.from("media_processing_jobs").update({status:dead?"DEAD_LETTER":"RETRY_WAIT",available_at:new Date(Date.now()+delay*1000).toISOString(),dead_lettered_at:dead?new Date().toISOString():null,last_error:p.error??"transcode_failed",locked_at:null,locked_by:null,updated_at:new Date().toISOString()}).eq("id",job.id);await db.from("media_upload_sessions").update({status:dead?"FAILED":"QUARANTINED",updated_at:new Date().toISOString()}).eq("id",job.upload_session_id);return updateError?json(503,{error:"Transcode failure could not be persisted."}):json(200,{success:true,status:dead?"DEAD_LETTER":"RETRY_WAIT"});}
  if(!p.renditions.some(r=>r.kind==="hls")||!p.renditions.some(r=>r.kind==="dash")||!p.renditions.some(r=>r.kind==="thumbnail"))return json(422,{error:"HLS, DASH and thumbnail renditions are mandatory."});
  if(p.renditions.some(r=>!r.path.startsWith("jobs/"+job.id+"/")))return json(422,{error:"Rendition path is outside this job's output namespace."});
  for(const r of p.renditions){const head=await requestS3(storage,r.path,"HEAD",{},undefined,storage.deliveryBucket);if(!head.ok)return json(422,{error:"A transcoder rendition is not present in the configured delivery bucket.",path:r.path,status:head.status});}
  const hls=p.renditions.find(r=>r.kind==="hls")!.path,dash=p.renditions.find(r=>r.kind==="dash")!.path,poster=p.renditions.find(r=>r.kind==="thumbnail")!.path,preview=p.renditions.find(r=>r.kind==="preview")?.path;
  const {data:session}=await db.from("media_upload_sessions").select("owner_id").eq("id",job.upload_session_id).maybeSingle();
  const {data:content}=job.content_id?await db.from("content").select("metadata").eq("id",job.content_id).maybeSingle():{data:null};
  const metadata={...(content?.metadata??{}),media_ingestion:{status:"READY",job_id:job.id,master_object_path:job.clean_master_path,ready_at:new Date().toISOString()}};
  const {error:jobUpdate}=await db.from("media_processing_jobs").update({status:"READY",stage:"complete",renditions:p.renditions,subtitles:p.subtitles,locked_at:null,locked_by:null,last_error:null,updated_at:new Date().toISOString()}).eq("id",job.id);
  if(jobUpdate)return json(503,{error:"Media job could not be finalized."});
  const {error:sessionUpdate}=await db.from("media_upload_sessions").update({status:"READY",updated_at:new Date().toISOString()}).eq("id",job.upload_session_id);
  await requestS3(storage,job.quarantine_path,"DELETE");
  if(job.content_id){const {error:contentUpdate}=await db.from("content").update({video_url:job.clean_master_path,hls_manifest_url:hls,dash_manifest_url:dash,poster_url:poster,preview_url:preview??null,captions:p.subtitles,metadata}).eq("id",job.content_id).eq("creator_id",session?.owner_id);if(contentUpdate)return json(503,{error:"Renditions are ready but content playback metadata requires reconciliation."});}
  return json(200,{success:true,status:"READY"});
 }
 let scanner:Binding,transcoder:Binding;
 try{[scanner,transcoder]=await Promise.all([binding(db,"media_scanner"),binding(db,"media_transcoder")]);}catch(e){return json(503,{error:e instanceof Error?e.message:"Scanner and transcoder must both be configured. Quarantine is fail-closed."});}
 const worker=typeof body.workerId==="string"&&/^[a-zA-Z0-9._:-]{3,100}$/.test(body.workerId)?body.workerId:"media-worker-"+crypto.randomUUID();
 const {data:jobs,error:claimError}=await db.rpc("claim_media_processing_jobs",{p_worker:worker,p_limit:Math.min(Math.max(Number(body.limit)||3,1),10)});
 if(claimError)return json(503,{error:"Durable media jobs could not be claimed."});
 const results=[];
 for(const job of jobs??[]){
  try{
   await db.from("media_upload_sessions").update({status:"SCANNING",updated_at:new Date().toISOString()}).eq("id",job.upload_session_id);
   const sourceUrl=await presign(storage,job.quarantine_path,"GET");
   const scanUrl=new URL(scanner.endpoints.scan??"/scan",scanner.base_url??undefined).toString();
   const scanResponse=await fetch(scanUrl,{method:"POST",headers:{"Authorization":"Bearer "+scanner.credential,"Content-Type":"application/json"},body:JSON.stringify({sourceUrl,expectedSha256:job.provenance?.expected_sha256??null,filename:job.provenance?.source_filename}),signal:AbortSignal.timeout(120000)});
   if(!scanResponse.ok)throw new Error("scanner_http_"+scanResponse.status);
   const scan=Scan.safeParse(await scanResponse.json());if(!scan.success)throw new Error("scanner_response_invalid");
   if(job.provenance?.expected_sha256&&String(job.provenance.expected_sha256).toLowerCase()!==scan.data.sha256.toLowerCase())throw new Error("whole_file_sha256_mismatch");
   if(!scan.data.clean){await db.from("media_processing_jobs").update({status:"FAILED",stage:"malware_scan",last_error:"malware_detected:"+scan.data.findings.join(","),locked_at:null,locked_by:null,updated_at:new Date().toISOString()}).eq("id",job.id);await db.from("media_upload_sessions").update({status:"FAILED",updated_at:new Date().toISOString()}).eq("id",job.upload_session_id);await requestS3(storage,job.quarantine_path,"DELETE");results.push({jobId:job.id,status:"REJECTED_MALWARE"});continue;}
   await db.from("media_upload_sessions").update({status:"PROMOTING",updated_at:new Date().toISOString()}).eq("id",job.upload_session_id);
   const masterPath="masters/"+job.id+"/source";
   const copy=await requestS3(storage,masterPath,"PUT",{"x-amz-copy-source":"/"+storage.bucket+"/"+job.quarantine_path},undefined,storage.deliveryBucket);
   if(!copy.ok)throw new Error("server_side_clean_master_copy_failed_"+copy.status);
   const outputPrefix="jobs/"+job.id+"/",outputs=[
    {kind:"hls",path:outputPrefix+"master.m3u8",mimeType:"application/vnd.apple.mpegurl"},
    {kind:"dash",path:outputPrefix+"manifest.mpd",mimeType:"application/dash+xml"},
    {kind:"thumbnail",path:outputPrefix+"poster.jpg",mimeType:"image/jpeg"},
    {kind:"preview",path:outputPrefix+"preview.mp4",mimeType:"video/mp4"},
    {kind:"caption",path:outputPrefix+"captions.vtt",mimeType:"text/vtt"}
   ];
   const uploadTargets=await Promise.all(outputs.map(async o=>({...o,uploadUrl:await presign(storage,o.path,"PUT",o.mimeType,storage.deliveryBucket,86400)})));
   const transcodeUrl=new URL(transcoder.endpoints.transcode??"/transcode",transcoder.base_url??undefined).toString();
   const callbackUrl=Deno.env.get("MEDIA_TRANSCODE_CALLBACK_URL")??(url+"/functions/v1/media-ingest-worker");
   const {data:callbackSecret,error:callbackSecretError}=await db.rpc("get_media_transcoder_callback_secret");if(callbackSecretError||typeof callbackSecret!=="string"||!callbackSecret)throw new Error("transcoder_callback_secret_unavailable");
   const transcodeResponse=await fetch(transcodeUrl,{method:"POST",headers:{"Authorization":"Bearer "+transcoder.credential,"Content-Type":"application/json","Idempotency-Key":"transcode:"+job.id},body:JSON.stringify({jobId:job.id,sourceUrl:await presign(storage,masterPath,"GET",undefined,storage.deliveryBucket,21600),sourceSha256:scan.data.sha256,outputFormat:"fmp4-single-file",outputs:uploadTargets,packaging:{hls:"byte-range",dash:"SegmentBase"},callbackUrl,callbackSecret}),signal:AbortSignal.timeout(30000)});
   if(!transcodeResponse.ok)throw new Error("transcoder_http_"+transcodeResponse.status);
   const parsed=Transcode.safeParse(await transcodeResponse.json());if(!parsed.success||parsed.data.jobId!==job.id)throw new Error("transcoder_response_invalid");
   await db.from("media_upload_sessions").update({status:"TRANSCODING",updated_at:new Date().toISOString()}).eq("id",job.upload_session_id);

   const {error:updateError}=await db.from("media_processing_jobs").update({status:"TRANSCODING",stage:"transcode",clean_master_path:masterPath,sha256:scan.data.sha256,renditions:parsed.data.renditions,subtitles:parsed.data.subtitles,provenance:{...(job.provenance??{}),malware_scan:{engine:scan.data.engine,signatureVersion:scan.data.signatureVersion,clean:true,scannedAt:new Date().toISOString(),sha256:scan.data.sha256},transcoder:{provider:transcoder.provider_key,providerJobId:parsed.data.providerJobId,acceptedAt:new Date().toISOString()}},locked_at:null,locked_by:null,last_error:null,updated_at:new Date().toISOString()}).eq("id",job.id);
   if(updateError)throw new Error("job_state_update_failed");
   results.push({jobId:job.id,status:"TRANSCODING",providerJobId:parsed.data.providerJobId});
  }catch(e){const attempts=Number(job.attempts??1),dead=attempts>=Number(job.max_attempts??8),delay=Math.min(3600,Math.pow(2,attempts)*15);await db.from("media_processing_jobs").update({status:dead?"DEAD_LETTER":"RETRY_WAIT",available_at:new Date(Date.now()+delay*1000).toISOString(),dead_lettered_at:dead?new Date().toISOString():null,last_error:String(e).slice(0,1000),locked_at:null,locked_by:null,updated_at:new Date().toISOString()}).eq("id",job.id);await db.from("media_upload_sessions").update({status:dead?"FAILED":"QUARANTINED",updated_at:new Date().toISOString()}).eq("id",job.upload_session_id);results.push({jobId:job.id,status:dead?"DEAD_LETTER":"RETRY_WAIT",retryAfterSeconds:dead?null:delay});}
 }
 return json(200,{claimed:jobs?.length??0,results});
 } catch(error) {
  console.error("media_ingest_worker_unhandled",error instanceof Error?error.stack??error.message:String(error));
  return json(500,{error:"Unexpected media worker failure.",code:"MEDIA_WORKER_UNHANDLED"});
 }
});