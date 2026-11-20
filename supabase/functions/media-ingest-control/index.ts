import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json = (status:number, body:Record<string,unknown>) => new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const hex = (bytes:ArrayBuffer) => [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,"0")).join("");
const sha256 = async (data:Uint8Array) => hex(await crypto.subtle.digest("SHA-256",data));
const b64 = (v:string) => { const raw=atob(v); const out=new Uint8Array(raw.length); for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i); return out; };
const common = {sessionId:z.string().uuid()};
const Body = z.discriminatedUnion("action",[
 z.object({action:z.literal("initialize"),contentId:z.string().uuid().optional(),filename:z.string().trim().min(1).max(240),mimeType:z.string().regex(/^[\w.+-]+\/[\w.+-]+$/),sizeBytes:z.number().int().positive().max(20*1024*1024*1024),sha256:z.string().regex(/^[a-f0-9]{64}$/i).optional(),chunkSizeBytes:z.number().int().min(256*1024).max(8*1024*1024).default(5*1024*1024)}).strict(),
 z.object({action:z.literal("upload_chunk"),...common,index:z.number().int().min(0).max(4095),dataBase64:z.string().min(1).max(12*1024*1024),sha256:z.string().regex(/^[a-f0-9]{64}$/i)}).strict(),
 z.object({action:z.literal("complete"),...common}).strict(),
 z.object({action:z.literal("recover"),...common}).strict(),
 z.object({action:z.literal("cancel"),...common}).strict(),
 z.object({action:z.literal("process"),jobId:z.string().uuid()}).strict(),
 z.object({action:z.literal("playback_url"),jobId:z.string().uuid(),path:z.string().min(1).max(1000)}).strict(),
]);
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY"),auth=req.headers.get("Authorization");
 if(!url||!service||!anon||!auth?.startsWith("Bearer "))return json(401,{error:"Authentication required."});
 const caller=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await caller.auth.getUser(); if(authError||!user)return json(401,{error:"Invalid session."});
 const parsed=Body.safeParse(await req.json().catch(()=>null)); if(!parsed.success)return json(400,{error:"Invalid media request.",issues:parsed.error.flatten()});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),p=parsed.data;
 const bucket=Deno.env.get("MEDIA_QUARANTINE_BUCKET")??"media-quarantine";
 if(p.action==="initialize"){
  let studioQuery=await db.from("studio_accounts").select("id,base_currency").eq("user_id",user.id).eq("status","approved").maybeSingle();
  if(studioQuery.error||!studioQuery.data)return json(403,{error:"An approved creator account is required."});
  if(p.contentId){const {data:owned}=await db.from("content").select("id").eq("id",p.contentId).eq("creator_id",user.id).maybeSingle();if(!owned)return json(404,{error:"Content not found."});}
  const chunks=Math.ceil(p.sizeBytes/p.chunkSizeBytes); if(chunks>4096)return json(413,{error:"Upload exceeds the supported chunk count."});
  const id=crypto.randomUUID(),path="quarantine/"+user.id+"/"+id+"/assembled";
  const {data:session,error}=await db.from("media_upload_sessions").insert({id,owner_id:user.id,content_id:p.contentId??null,studio_account_id:studioQuery.data.id,object_path:path,original_filename:p.filename,mime_type:p.mimeType,expected_size_bytes:p.sizeBytes,chunk_size_bytes:p.chunkSizeBytes,expected_sha256:p.sha256?.toLowerCase()??null,received_size_bytes:0,chunk_manifest:[],status:"INITIALIZED",expires_at:new Date(Date.now()+24*3600000).toISOString()}).select("id,status,expires_at").single();
  if(error||!session)return json(503,{error:"Upload session could not be initialized."});
  return json(201,{session,chunkSizeBytes:p.chunkSizeBytes,totalChunks:chunks,transport:"authenticated_chunk_api"});
 }
 if(p.action==="process"){
  const {data:job,error}=await db.from("media_processing_jobs").select("*").eq("id",p.jobId).maybeSingle();
  if(error||!job)return json(404,{error:"Processing job not found."});
  const {data:studio}=await db.from("studio_accounts").select("id").eq("user_id",user.id).maybeSingle();
  const {data:admin}=await db.from("user_roles").select("role").eq("user_id",user.id).in("role",["super_admin","platform_admin"]).limit(1);
  if(job.upload_session_id){const {data:session}=await db.from("media_upload_sessions").select("owner_id").eq("id",job.upload_session_id).maybeSingle();if(session?.owner_id!==user.id&&!admin?.length)return json(403,{error:"Not authorized."});}
  if(!admin?.length)return json(403,{error:"Processing is performed by the trusted worker, not browser clients."});
  return json(409,{error:"Use the authenticated media worker endpoint configured for this deployment."});
 }
 if(p.action==="playback_url"){
  const {data:job}=await db.from("media_processing_jobs").select("id,status,renditions,content_id,upload_session_id").eq("id",p.jobId).maybeSingle();
  if(!job||job.status!=="READY")return json(404,{error:"A ready media rendition was not found."});
  const {data:session}=await db.from("media_upload_sessions").select("owner_id").eq("id",job.upload_session_id).maybeSingle();
  const {data:admin}=await db.from("user_roles").select("role").eq("user_id",user.id).in("role",["super_admin","platform_admin"]).limit(1);
  if(session?.owner_id!==user.id&&!admin?.length)return json(403,{error:"Not authorized."});
  const rendition=(job.renditions as Array<{path:string;kind?:string}>).find(r=>r.path===p.path);
  if(!rendition)return json(404,{error:"Rendition not found."});
  const {data,error}=await db.storage.from("media-delivery").createSignedUrl(rendition.path,300);
  if(error||!data?.signedUrl)return json(503,{error:"Playback URL could not be issued."});
  return json(200,{url:data.signedUrl,expiresIn:300});
 }
 const {data:session,error:sessionError}=await db.from("media_upload_sessions").select("*").eq("id",p.sessionId).eq("owner_id",user.id).maybeSingle();
 if(sessionError||!session)return json(404,{error:"Upload session not found."});
 if(Date.parse(session.expires_at)<Date.now()&&session.status!=="READY")return json(410,{error:"Upload session expired."});
 if(p.action==="recover")return json(200,{sessionId:session.id,status:session.status,receivedSizeBytes:session.received_size_bytes,expectedSizeBytes:session.expected_size_bytes,chunks:session.chunk_manifest,expiresAt:session.expires_at});
 if(p.action==="cancel"){
  if(["READY","CANCELLED"].includes(session.status))return json(409,{error:"This upload can no longer be cancelled."});
  await db.storage.from(bucket).remove([session.object_path,...(session.chunk_manifest as Array<{path:string}>).map(c=>c.path)]);
  const {error}=await db.from("media_upload_sessions").update({status:"CANCELLED",cancelled_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",session.id);
  return error?json(503,{error:"Upload cancellation failed."}):json(200,{success:true,status:"CANCELLED"});
 }
 if(p.action==="upload_chunk"){
  if(!["INITIALIZED","UPLOADING"].includes(session.status))return json(409,{error:"Upload is not accepting chunks."});
  const bytes=b64(p.dataBase64); if(bytes.byteLength>8*1024*1024)return json(413,{error:"Chunk exceeds 8 MiB."});
  const digest=await sha256(bytes); if(digest!==p.sha256.toLowerCase())return json(422,{error:"Chunk SHA-256 mismatch."});
  const manifest=session.chunk_manifest as Array<{index:number;path:string;size:number;sha256:string}>;
  const expectedChunks=Math.ceil(Number(session.expected_size_bytes)/Number(session.chunk_size_bytes));
  if(p.index>expectedChunks+1)return json(400,{error:"Chunk index is outside the accepted range."});
  const old=manifest.find(c=>c.index===p.index); if(old){if(old.sha256!==digest)return json(409,{error:"Chunk index already exists with different content."});return json(200,{success:true,duplicate:true,receivedSizeBytes:session.received_size_bytes});}
  const path="quarantine/"+user.id+"/"+session.id+"/chunks/"+String(p.index).padStart(6,"0");
  const {error:uploadError}=await db.storage.from(bucket).upload(path,bytes,{contentType:"application/octet-stream",upsert:false});
  if(uploadError)return json(503,{error:"Chunk could not be stored in quarantine."});
  const next=[...manifest,{index:p.index,path,size:bytes.byteLength,sha256:digest}].sort((a,b)=>a.index-b.index);
  const received=next.reduce((n,c)=>n+c.size,0);
  if(received>Number(session.expected_size_bytes)){await db.storage.from(bucket).remove([path]);return json(413,{error:"Received bytes exceed declared file size."});}
  const {error:updateError}=await db.from("media_upload_sessions").update({chunk_manifest:next,received_size_bytes:received,status:"UPLOADING",updated_at:new Date().toISOString()}).eq("id",session.id).eq("received_size_bytes",session.received_size_bytes);
  if(updateError){await db.storage.from(bucket).remove([path]);return json(409,{error:"Concurrent chunk update; recover the session and retry."});}
  return json(200,{success:true,index:p.index,receivedSizeBytes:received,chunkCount:next.length});
 }
 if(p.action==="complete"){
  if(session.status==="QUARANTINED"||session.status==="READY")return json(200,{success:true,status:session.status});
  const manifest=(session.chunk_manifest as Array<{index:number;path:string;size:number;sha256:string}>).sort((a,b)=>a.index-b.index);
  if(Number(session.received_size_bytes)!==Number(session.expected_size_bytes)||manifest.reduce((n,c)=>n+c.size,0)!==Number(session.expected_size_bytes))return json(409,{error:"Upload is incomplete.",receivedSizeBytes:session.received_size_bytes,expectedSizeBytes:session.expected_size_bytes});
  const assembled=new Uint8Array(Number(session.expected_size_bytes));let offset=0;
  for(let i=0;i<manifest.length;i++){if(manifest[i].index!==i)return json(409,{error:"Chunk sequence has a gap.",missingIndex:i});const {data,error}=await db.storage.from(bucket).download(manifest[i].path);if(error||!data)return json(503,{error:"A quarantined chunk could not be read."});const bytes=new Uint8Array(await data.arrayBuffer());if(await sha256(bytes)!==manifest[i].sha256)return json(422,{error:"Stored chunk integrity check failed."});assembled.set(bytes,offset);offset+=bytes.length;}
  const digest=await sha256(assembled);if(session.expected_sha256&&digest!==session.expected_sha256)return json(422,{error:"Whole-file SHA-256 mismatch."});
  const {error:masterError}=await db.storage.from(bucket).upload(session.object_path,assembled,{contentType:"application/octet-stream",upsert:false});
  if(masterError)return json(503,{error:"Assembled file could not be stored in quarantine."});
  const {data:job,error:jobError}=await db.from("media_processing_jobs").insert({upload_session_id:session.id,content_id:session.content_id,idempotency_key:"media:"+session.id,status:"QUARANTINED",stage:"inspection",quarantine_path:session.object_path,sha256:digest,provenance:{algorithm:"SHA-256",digest,source_filename:session.original_filename,received_at:new Date().toISOString()}}).select("id,status").single();
  if(jobError&&jobError.code!=="23505")return json(503,{error:"Media processing job could not be queued."});
  const {data:existingJob}=jobError?await db.from("media_processing_jobs").select("id,status").eq("idempotency_key","media:"+session.id).single():{data:job};
  const {error:updateError}=await db.from("media_upload_sessions").update({status:"QUARANTINED",completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",session.id);
  if(updateError)return json(503,{error:"Upload completed but session state requires reconciliation."});
  return json(202,{success:true,status:"QUARANTINED",sha256:digest,job:existingJob});
 }
 return json(400,{error:"Unsupported action."});
});