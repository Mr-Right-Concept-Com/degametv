import {createClient} from "npm:@supabase/supabase-js@2";
import {z} from "npm:zod@3";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-media-worker-secret","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const Scan=z.object({clean:z.boolean(),engine:z.string().min(1),signatureVersion:z.string().optional(),findings:z.array(z.string()).default([])});
const Transcode=z.object({jobId:z.string().uuid(),status:z.enum(["accepted","complete"]),providerJobId:z.string().min(1),renditions:z.array(z.object({path:z.string().min(1),kind:z.enum(["hls","dash","thumbnail","preview","caption"]),mimeType:z.string().optional(),width:z.number().int().positive().optional(),height:z.number().int().positive().optional(),language:z.string().optional()})).default([]),subtitles:z.array(z.record(z.unknown())).default([])});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const secret=Deno.env.get("MEDIA_WORKER_SECRET");
 if(!secret||req.headers.get("x-media-worker-secret")!==secret)return json(401,{error:"Worker authentication failed."});
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return json(503,{error:"Media worker is not configured."});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),body=await req.json().catch(()=>({}));
 if(body?.action==="transcode_callback"){
  const callback=z.object({action:z.literal("transcode_callback"),jobId:z.string().uuid(),status:z.enum(["complete","failed"]),renditions:z.array(z.object({path:z.string().min(1).max(1000),kind:z.enum(["hls","dash","thumbnail","preview","caption"]),mimeType:z.string().optional(),width:z.number().int().positive().optional(),height:z.number().int().positive().optional(),language:z.string().optional()})).default([]),subtitles:z.array(z.record(z.unknown())).default([]),error:z.string().max(1000).optional()}).strict().safeParse(body);
  if(!callback.success)return json(400,{error:"Invalid transcoder callback."});
  const p=callback.data,{data:job,error:jobError}=await db.from("media_processing_jobs").select("id,upload_session_id,status,attempts,max_attempts").eq("id",p.jobId).maybeSingle();
  if(jobError||!job||job.status!=="TRANSCODING")return json(404,{error:"Active transcode job not found."});
  if(p.status==="complete"){
   if(!p.renditions.some(r=>r.kind==="hls")||!p.renditions.some(r=>r.kind==="dash")||!p.renditions.some(r=>r.kind==="thumbnail"))return json(422,{error:"HLS, DASH and thumbnail renditions are mandatory."});
   if(p.renditions.some(r=>!r.path.startsWith("jobs/"+job.id+"/")))return json(422,{error:"Rendition path is outside this job's delivery namespace."});
   const {error}=await db.from("media_processing_jobs").update({status:"READY",stage:"complete",renditions:p.renditions,subtitles:p.subtitles,locked_at:null,locked_by:null,last_error:null,updated_at:new Date().toISOString()}).eq("id",job.id);
   if(error)return json(503,{error:"Transcode output could not be persisted."});
   await db.from("media_upload_sessions").update({status:"READY",updated_at:new Date().toISOString()}).eq("id",job.upload_session_id);
   return json(200,{success:true,status:"READY"});
  }
  const attempts=Number(job.attempts??1),dead=attempts>=Number(job.max_attempts??8),delay=Math.min(3600,Math.pow(2,attempts)*15);
  const {error}=await db.from("media_processing_jobs").update({status:dead?"DEAD_LETTER":"RETRY_WAIT",available_at:new Date(Date.now()+delay*1000).toISOString(),dead_lettered_at:dead?new Date().toISOString():null,last_error:p.error??"transcode_failed",locked_at:null,locked_by:null,updated_at:new Date().toISOString()}).eq("id",job.id);
  return error?json(503,{error:"Transcode failure could not be persisted."}):json(200,{success:true,status:dead?"DEAD_LETTER":"RETRY_WAIT"});
 }
 const worker=typeof body.workerId==="string"&&/^[a-zA-Z0-9._:-]{3,100}$/.test(body.workerId)?body.workerId:"media-worker-"+crypto.randomUUID();
 const {data:jobs,error}=await db.rpc("claim_media_processing_jobs",{p_worker:worker,p_limit:Math.min(Math.max(Number(body.limit)||3,1),10)});
 if(error)return json(503,{error:"Durable media jobs could not be claimed."});
 const bucket=Deno.env.get("MEDIA_QUARANTINE_BUCKET")??"media-quarantine",delivery=Deno.env.get("MEDIA_DELIVERY_BUCKET")??"media-delivery";
 const scanner=Deno.env.get("MALWARE_SCANNER_URL"),scannerKey=Deno.env.get("MALWARE_SCANNER_TOKEN"),transcoder=Deno.env.get("MEDIA_TRANSCODER_URL"),transcoderKey=Deno.env.get("MEDIA_TRANSCODER_TOKEN");
 if(!scanner||!scannerKey||!transcoder||!transcoderKey)return json(503,{error:"Malware scanner and transcoder providers must both be configured; no media is promoted without them."});
 const results=[];
 for(const job of jobs??[]){
  try{
   const {data:source,error:sourceError}=await db.storage.from(bucket).createSignedUrl(job.quarantine_path,300);
   if(sourceError||!source?.signedUrl)throw new Error("quarantine_read_url_failed");
   const scanResponse=await fetch(scanner,{method:"POST",headers:{"Authorization":"Bearer "+scannerKey,"Content-Type":"application/json"},body:JSON.stringify({url:source.signedUrl,sha256:job.sha256,filename:job.provenance?.source_filename}),signal:AbortSignal.timeout(120000)});
   if(!scanResponse.ok)throw new Error("malware_scanner_http_"+scanResponse.status);
   const scan=Scan.safeParse(await scanResponse.json());if(!scan.success)throw new Error("malware_scanner_invalid_response");
   if(!scan.data.clean){
    await db.from("media_processing_jobs").update({status:"FAILED",stage:"malware_scan",last_error:"malware_detected:"+scan.data.findings.join(","),locked_at:null,locked_by:null,updated_at:new Date().toISOString()}).eq("id",job.id);
    await db.from("media_upload_sessions").update({status:"FAILED",updated_at:new Date().toISOString()}).eq("id",job.upload_session_id);
    results.push({jobId:job.id,status:"REJECTED_MALWARE"});continue;
   }
   await db.from("media_processing_jobs").update({stage:"promotion",provenance:{...job.provenance,malware_scan:{engine:scan.data.engine,signatureVersion:scan.data.signatureVersion,scannedAt:new Date().toISOString(),clean:true}}}).eq("id",job.id);
   const masterPath="masters/"+job.id+"/source";
   const {data:quarantined,error:downloadError}=await db.storage.from(bucket).download(job.quarantine_path);
   if(downloadError||!quarantined)throw new Error("quarantine_master_download_failed");
   const {error:copyError}=await db.storage.from(delivery).upload(masterPath,quarantined,{contentType:"application/octet-stream",upsert:true});
   if(copyError)throw new Error("clean_master_promotion_failed");
   const {data:master,error:masterError}=await db.storage.from(delivery).createSignedUrl(masterPath,900);
   if(masterError||!master?.signedUrl)throw new Error("master_signed_url_failed");
   const response=await fetch(transcoder,{method:"POST",headers:{"Authorization":"Bearer "+transcoderKey,"Content-Type":"application/json","Idempotency-Key":"transcode:"+job.id},body:JSON.stringify({jobId:job.id,sourceUrl:master.signedUrl,sha256:job.sha256,outputs:["HLS","DASH","THUMBNAIL","PREVIEW","CAPTIONS"],callbackUrl:Deno.env.get("MEDIA_TRANSCODE_CALLBACK_URL")??null}),signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw new Error("transcoder_http_"+response.status);
   const parsed=Transcode.safeParse(await response.json());if(!parsed.success||parsed.data.jobId!==job.id)throw new Error("transcoder_invalid_response");
   if(parsed.data.status==="complete"&&parsed.data.renditions.length===0)throw new Error("transcoder_returned_no_renditions");
   const state=parsed.data.status==="complete"?"READY":"TRANSCODING";
   const {error:updateError}=await db.from("media_processing_jobs").update({status:state,stage:parsed.data.status==="complete"?"complete":"transcode",clean_master_path:masterPath,renditions:parsed.data.renditions,subtitles:parsed.data.subtitles,provenance:{...job.provenance,malware_scan:{engine:scan.data.engine,signatureVersion:scan.data.signatureVersion,clean:true},transcoder:{providerJobId:parsed.data.providerJobId,acceptedAt:new Date().toISOString()}},locked_at:null,locked_by:null,last_error:null,updated_at:new Date().toISOString()}).eq("id",job.id);
   if(updateError)throw new Error("job_result_persist_failed");
   if(state==="READY")await db.from("media_upload_sessions").update({status:"READY",updated_at:new Date().toISOString()}).eq("id",job.upload_session_id);
   results.push({jobId:job.id,status:state,providerJobId:parsed.data.providerJobId});
  }catch(error){
   const attempts=Number(job.attempts??1),dead=attempts>=Number(job.max_attempts??8),delay=Math.min(3600,Math.pow(2,attempts)*15);
   await db.from("media_processing_jobs").update({status:dead?"DEAD_LETTER":"RETRY_WAIT",stage:job.stage,available_at:new Date(Date.now()+delay*1000).toISOString(),dead_lettered_at:dead?new Date().toISOString():null,last_error:String(error).slice(0,1000),locked_at:null,locked_by:null,updated_at:new Date().toISOString()}).eq("id",job.id);
   results.push({jobId:job.id,status:dead?"DEAD_LETTER":"RETRY_WAIT",retryAfterSeconds:dead?null:delay});
  }
 }
 return json(200,{claimed:jobs?.length??0,results});
});