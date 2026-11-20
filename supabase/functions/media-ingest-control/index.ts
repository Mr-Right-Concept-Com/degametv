import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const encoder=new TextEncoder();
const hex=(v:ArrayBuffer)=>[...new Uint8Array(v)].map(x=>x.toString(16).padStart(2,"0")).join("");
const sha256=async(v:string|Uint8Array)=>hex(await crypto.subtle.digest("SHA-256",typeof v==="string"?encoder.encode(v):v));
const hmac=async(key:Uint8Array|string,data:string)=>new Uint8Array(await crypto.subtle.sign("HMAC",await crypto.subtle.importKey("raw",typeof key==="string"?encoder.encode(key):key,{name:"HMAC",hash:"SHA-256"},false,["sign"]),encoder.encode(data)));
const awsEncode=(v:string)=>encodeURIComponent(v).replace(/[!'()*]/g,c=>"%"+c.charCodeAt(0).toString(16).toUpperCase());
const canonicalQuery=(u:URL)=>[...u.searchParams.entries()].sort(([a,av],[b,bv])=>a.localeCompare(b)||av.localeCompare(bv)).map(([k,v])=>awsEncode(k)+"="+awsEncode(v)).join("&");
const timestamp=()=>new Date().toISOString().replace(/[:-]|\.\d{3}/g,"");
type S3Config={endpoint:URL;bucket:string;region:string;accessKeyId:string;secretAccessKey:string;sessionToken?:string;pathStyle:boolean;};
type Provider={id:string;provider_key:string;base_url:string|null;endpoints:Record<string,string>;settings:Record<string,unknown>;credential:string;};
async function getStorage(db:ReturnType<typeof createClient>):Promise<S3Config>{
 const {data,error}=await db.rpc("get_service_provider_runtime_config",{p_capability:"media_storage"});
 if(error||!Array.isArray(data)||!data.length)throw new Error("No enabled media_storage provider binding is configured.");
 const p=data[0] as Provider;
 let secret:Record<string,unknown>;
 try{secret=JSON.parse(p.credential) as Record<string,unknown>;}catch{throw new Error("The media_storage Vault credential must be a JSON object containing accessKeyId and secretAccessKey.");}
 const endpoint=String(p.base_url??p.settings.endpoint??"");
 const bucket=String(p.settings.bucket??"");
 const region=String(p.settings.region??"auto");
 if(!endpoint||!bucket||typeof secret.accessKeyId!=="string"||typeof secret.secretAccessKey!=="string")throw new Error("The selected media_storage binding is missing endpoint, bucket, or S3 credentials.");
 return {endpoint:new URL(endpoint),bucket,region,accessKeyId:secret.accessKeyId,secretAccessKey:secret.secretAccessKey,sessionToken:typeof secret.sessionToken==="string"?secret.sessionToken:undefined,pathStyle:p.settings.pathStyle!==false};
}
function objectUrl(c:S3Config,key:string){
 const u=new URL(c.endpoint.toString());
 if(c.pathStyle)u.pathname=u.pathname.replace(/\/$/,"")+"/"+awsEncode(c.bucket)+"/"+key.split("/").map(awsEncode).join("/");
 else{u.hostname=c.bucket+"."+u.hostname;u.pathname=u.pathname.replace(/\/$/,"")+"/"+key.split("/").map(awsEncode).join("/");}
 return u;
}
async function signingKey(secret:string,date:string,region:string){const d=await hmac("AWS4"+secret,date);const r=await hmac(d,region);const s=await hmac(r,"s3");return hmac(s,"aws4_request");}
async function signedRequest(c:S3Config,key:string,method:string,query:Record<string,string>={},body?:string,headers:Record<string,string>={}){
 const u=objectUrl(c,key);for(const [k,v] of Object.entries(query))u.searchParams.set(k,v);
 const now=timestamp(),day=now.slice(0,8),payloadHash=await sha256(body??"");
 const all={host:u.host,"x-amz-content-sha256":payloadHash,"x-amz-date":now,...(c.sessionToken?{"x-amz-security-token":c.sessionToken}:{}),...headers};
 const canonicalHeaders=Object.entries(all).map(([k,v])=>[k.toLowerCase(),v.trim()] as const).sort(([a],[b])=>a.localeCompare(b));
 const signedHeaders=canonicalHeaders.map(([k])=>k).join(";");
 const canonical=method+"\n"+u.pathname+"\n"+canonicalQuery(u)+"\n"+canonicalHeaders.map(([k,v])=>k+":"+v+"\n").join("")+"\n"+signedHeaders+"\n"+payloadHash;
 const scope=day+"/"+c.region+"/s3/aws4_request";
 const toSign="AWS4-HMAC-SHA256\n"+now+"\n"+scope+"\n"+await sha256(canonical);
 const signature=hex(await hmac(await signingKey(c.secretAccessKey,day,c.region),toSign));
 const auth="AWS4-HMAC-SHA256 Credential="+c.accessKeyId+"/"+scope+", SignedHeaders="+signedHeaders+", Signature="+signature;
 const response=await fetch(u,{method,headers:{...all,Authorization:auth,...headers},body:body??undefined,signal:AbortSignal.timeout(30000)});
 return response;
}
async function presignPart(c:S3Config,key:string,uploadId:string,partNumber:number,checksum:string){
 const u=objectUrl(c,key);u.searchParams.set("partNumber",String(partNumber));u.searchParams.set("uploadId",uploadId);
 const now=timestamp(),day=now.slice(0,8),scope=day+"/"+c.region+"/s3/aws4_request";
 const params:Record<string,string>={"X-Amz-Algorithm":"AWS4-HMAC-SHA256","X-Amz-Credential":c.accessKeyId+"/"+scope,"X-Amz-Date":now,"X-Amz-Expires":"900","X-Amz-SignedHeaders":"host;x-amz-checksum-sha256"};
 if(c.sessionToken)params["X-Amz-Security-Token"]=c.sessionToken;
 for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
 const canonical= "PUT\n"+u.pathname+"\n"+canonicalQuery(u)+"\nhost:"+u.host+"\nx-amz-checksum-sha256:"+checksum+"\n\nhost;x-amz-checksum-sha256\nUNSIGNED-PAYLOAD";
 const toSign="AWS4-HMAC-SHA256\n"+now+"\n"+scope+"\n"+await sha256(canonical);
 u.searchParams.set("X-Amz-Signature",hex(await hmac(await signingKey(c.secretAccessKey,day,c.region),toSign)));
 return u.toString();
}
function xmlValue(xml:string,tag:string){return new RegExp("<"+tag+">([\\s\\S]*?)</"+tag+">").exec(xml)?.[1]??null;}
const Common={sessionId:z.string().uuid()};
const Body=z.discriminatedUnion("action",[
 z.object({action:z.literal("init_multipart"),contentId:z.string().uuid().optional(),filename:z.string().trim().min(1).max(240),mimeType:z.string().regex(new RegExp("^[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+$")),sizeBytes:z.number().int().positive().max(20*1024*1024*1024),sha256:z.string().regex(/^[a-f0-9]{64}$/i).optional(),chunkSizeBytes:z.number().int().min(5*1024*1024).max(512*1024*1024).default(64*1024*1024)}).strict(),
 z.object({action:z.literal("sign_part"),...Common,partNumber:z.number().int().min(1).max(10000),checksumSha256:z.string().regex(/^[A-Za-z0-9+/]{43}=$/)}).strict(),
 z.object({action:z.literal("complete_multipart"),...Common,parts:z.array(z.object({partNumber:z.number().int().min(1).max(10000),etag:z.string().min(1).max(200),checksumSha256:z.string().regex(/^[A-Za-z0-9+/]{43}=$/)}).strict()).min(1).max(10000)}).strict(),
 z.object({action:z.literal("abort_multipart"),...Common}).strict(),
 z.object({action:z.literal("recover"),...Common}).strict(),
 z.object({action:z.literal("attach_content"),...Common,contentId:z.string().uuid()}).strict(),
 z.object({action:z.literal("cancel"),...Common}).strict(),
 z.object({action:z.literal("playback_url"),jobId:z.string().uuid(),path:z.string().min(1).max(1000)}).strict(),
]);
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY"),auth=req.headers.get("Authorization");
 if(!url||!service||!anon||!auth?.startsWith("Bearer "))return json(401,{error:"Authentication required."});
 const caller=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await caller.auth.getUser();if(authError||!user)return json(401,{error:"Invalid session."});
 const parsed=Body.safeParse(await req.json().catch(()=>null));if(!parsed.success)return json(400,{error:"Invalid media request.",issues:parsed.error.flatten()});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),p=parsed.data;
 if(p.action==="init_multipart"){
  const {data:studio,error:studioError}=await db.from("studio_accounts").select("id,base_currency").eq("user_id",user.id).eq("status","approved").maybeSingle();
  if(studioError||!studio)return json(403,{error:"An approved creator account is required."});
  if(p.contentId){const {data:content,error}=await db.from("content").select("id").eq("id",p.contentId).eq("creator_id",user.id).maybeSingle();if(error||!content)return json(404,{error:"Content not found or not owned by this creator."});}
  const totalParts=Math.ceil(p.sizeBytes/p.chunkSizeBytes);if(totalParts>10000)return json(413,{error:"The selected part size would exceed S3's 10,000-part limit."});
  let storage:S3Config;try{storage=await getStorage(db);}catch(e){return json(503,{error:e instanceof Error?e.message:"Media storage provider is unavailable."});}
  const id=crypto.randomUUID(),safeName=p.filename.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(-120),objectPath="quarantine/"+user.id+"/"+id+"/"+safeName;
  const {data:session,error:insertError}=await db.from("media_upload_sessions").insert({id,owner_id:user.id,content_id:p.contentId??null,studio_account_id:studio.id,object_path:objectPath,original_filename:p.filename,mime_type:p.mimeType,expected_size_bytes:p.sizeBytes,chunk_size_bytes:p.chunkSizeBytes,expected_sha256:p.sha256?.toLowerCase()??null,received_size_bytes:0,chunk_manifest:[],status:"INITIALIZED",expires_at:new Date(Date.now()+24*3600000).toISOString()}).select("id").single();
  if(insertError||!session)return json(503,{error:"Upload session could not be initialized."});
  const init=await signedRequest(storage,objectPath,"POST",{"uploads":""},undefined,{"x-amz-checksum-algorithm":"SHA256"});
  if(!init.ok){await db.from("media_upload_sessions").update({status:"FAILED"}).eq("id",id);return json(502,{error:"Storage provider could not initialize multipart upload.",providerStatus:init.status});}
  const uploadId=xmlValue(await init.text(),"UploadId");if(!uploadId){await db.from("media_upload_sessions").update({status:"FAILED"}).eq("id",id);return json(502,{error:"Storage provider returned no multipart upload identifier."});}
  const {error:saveError}=await db.from("media_upload_sessions").update({storage_upload_id:uploadId,status:"UPLOADING",updated_at:new Date().toISOString()}).eq("id",id);
  if(saveError){await signedRequest(storage,objectPath,"DELETE",{"uploadId":uploadId});return json(503,{error:"Multipart session could not be persisted."});}
  return json(201,{sessionId:id,status:"UPLOADING",objectPath,partSizeBytes:p.chunkSizeBytes,totalParts,expiresAt:new Date(Date.now()+24*3600000).toISOString(),transport:"s3_multipart_presigned",provider:"configured"});
 }
 if(p.action==="playback_url"){
  const {data:job}=await db.from("media_processing_jobs").select("id,status,renditions,upload_session_id").eq("id",p.jobId).eq("status","READY").maybeSingle();
  if(!job)return json(404,{error:"A ready rendition was not found."});
  const {data:session}=await db.from("media_upload_sessions").select("owner_id").eq("id",job.upload_session_id).maybeSingle();
  const {data:admin}=await db.from("user_roles").select("role").eq("user_id",user.id).in("role",["super_admin","platform_admin"]).limit(1);
  if(session?.owner_id!==user.id&&!admin?.length)return json(403,{error:"Not authorized."});
  const renditions=job.renditions as Array<{path:string;kind:string}>,rendition=renditions.find(r=>r.path===p.path);if(!rendition)return json(404,{error:"Rendition not found."});
  try{const storage=await getStorage(db);const signed=await presignPart(storage,p.path,"",1,"");const u=new URL(signed);u.searchParams.delete("partNumber");u.searchParams.delete("uploadId");u.searchParams.set("X-Amz-SignedHeaders","host");u.searchParams.delete("X-Amz-Signature");const now=u.searchParams.get("X-Amz-Date")!,day=now.slice(0,8),scope=day+"/"+storage.region+"/s3/aws4_request";const canonical="GET\n"+u.pathname+"\n"+canonicalQuery(u)+"\nhost:"+u.host+"\n\nhost\nUNSIGNED-PAYLOAD";const signature=hex(await hmac(await signingKey(storage.secretAccessKey,day,storage.region),"AWS4-HMAC-SHA256\n"+now+"\n"+scope+"\n"+await sha256(canonical)));u.searchParams.set("X-Amz-Signature",signature);return json(200,{url:u.toString(),expiresIn:900});}catch(e){return json(503,{error:e instanceof Error?e.message:"Playback signing failed."});}
 }
 const {data:session,error:sessionError}=await db.from("media_upload_sessions").select("*").eq("id",p.sessionId).eq("owner_id",user.id).maybeSingle();
 if(sessionError||!session)return json(404,{error:"Upload session not found."});
 if(Date.parse(session.expires_at)<Date.now()&&session.status!=="READY")return json(410,{error:"Upload session expired."});
 if(p.action==="recover"){
  if(["QUARANTINED","SCANNING","PROMOTING","TRANSCODING","READY","FAILED","CANCELLED","DEAD_LETTER"].includes(session.status)){
   return json(200,{sessionId:session.id,status:session.status,receivedSizeBytes:session.received_size_bytes,expectedSizeBytes:session.expected_size_bytes,partSizeBytes:session.chunk_size_bytes,parts:session.chunk_manifest??[],expiresAt:session.expires_at});
  }
  if(!session.storage_upload_id)return json(409,{error:"No active multipart storage session exists."});
  try{const storage=await getStorage(db),res=await signedRequest(storage,session.object_path,"GET",{"uploadId":session.storage_upload_id});if(!res.ok)return json(502,{error:"Storage provider could not recover multipart parts.",providerStatus:res.status});const xml=await res.text(),parts=[...xml.matchAll(/<Part>([\s\S]*?)<\/Part>/g)].map(m=>({partNumber:Number(xmlValue(m[1],"PartNumber")),etag:xmlValue(m[1],"ETag")?.replaceAll("&quot;","").replaceAll('"',""),checksumSha256:xmlValue(m[1],"ChecksumSHA256"),size:Number(xmlValue(m[1],"Size")??0)})).filter(x=>Number.isInteger(x.partNumber)&&x.etag&&x.checksumSha256);return json(200,{sessionId:session.id,status:session.status,receivedSizeBytes:session.received_size_bytes,expectedSizeBytes:session.expected_size_bytes,partSizeBytes:session.chunk_size_bytes,parts,expiresAt:session.expires_at});}catch(e){return json(503,{error:e instanceof Error?e.message:"Multipart recovery failed."});}
 }
 if(p.action==="attach_content"){
  const {data:content,error:contentError}=await db.from("content").select("id,metadata").eq("id",p.contentId).eq("creator_id",user.id).maybeSingle();
  if(contentError||!content)return json(404,{error:"Production not found or not owned by this creator."});
  const {data:job,error:jobError}=await db.from("media_processing_jobs").select("id,status,quarantine_path,clean_master_path,sha256,renditions,subtitles").eq("upload_session_id",session.id).maybeSingle();
  if(jobError||!job||!["QUARANTINED","SCANNING","PROMOTING","TRANSCODING","READY","RETRY_WAIT"].includes(job.status))return json(409,{error:"This upload has not completed multipart ingestion."});
  const {error:sessionUpdate}=await db.from("media_upload_sessions").update({content_id:content.id,updated_at:new Date().toISOString()}).eq("id",session.id).eq("owner_id",user.id);
  if(sessionUpdate)return json(503,{error:"Upload could not be linked to this production."});
  const {error:jobUpdate}=await db.from("media_processing_jobs").update({content_id:content.id,updated_at:new Date().toISOString()}).eq("id",job.id);
  if(jobUpdate)return json(503,{error:"Media job could not be linked to this production."});
  const renditions=(job.renditions??[]) as Array<{path:string;kind:string}>;
  const metadata={...(content.metadata??{}),media_ingestion:{status:job.status,job_id:job.id,master_object_path:job.clean_master_path??session.object_path,sha256:job.sha256}};
  const playback=job.status==="READY"?{
   video_url:job.clean_master_path,
   hls_manifest_url:renditions.find(r=>r.kind==="hls")?.path??null,
   dash_manifest_url:renditions.find(r=>r.kind==="dash")?.path??null,
   poster_url:renditions.find(r=>r.kind==="thumbnail")?.path??undefined,
   preview_url:renditions.find(r=>r.kind==="preview")?.path??null,
   captions:job.subtitles??[],
  }:{video_url:session.object_path};
  const {error:contentUpdate}=await db.from("content").update({...playback,metadata}).eq("id",content.id).eq("creator_id",user.id);
  if(contentUpdate)return json(503,{error:"Production was found but its master asset link could not be saved."});
  return json(200,{success:true,contentId:content.id,jobId:job.id,status:job.status});
 }
 if(p.action==="sign_part"){
  if(session.status!=="UPLOADING"||!session.storage_upload_id)return json(409,{error:"Upload is not accepting parts."});
  const count=Math.ceil(Number(session.expected_size_bytes)/Number(session.chunk_size_bytes));if(p.partNumber>count)return json(400,{error:"Part number exceeds declared upload size."});
  try{const storage=await getStorage(db),uploadUrl=await presignPart(storage,session.object_path,session.storage_upload_id,p.partNumber,p.checksumSha256);return json(200,{partNumber:p.partNumber,uploadUrl,headers:{"x-amz-checksum-sha256":p.checksumSha256},expiresIn:900});}catch(e){return json(503,{error:e instanceof Error?e.message:"Could not sign multipart part."});}
 }
 if(p.action==="complete_multipart"){
  if(session.status==="QUARANTINED"||session.status==="SCANNING"||session.status==="TRANSCODING"||session.status==="READY")return json(200,{success:true,status:session.status});
  if(session.status!=="UPLOADING"||!session.storage_upload_id)return json(409,{error:"Upload is not ready for completion."});
  const sorted=[...p.parts].sort((a,b)=>a.partNumber-b.partNumber),expected=Math.ceil(Number(session.expected_size_bytes)/Number(session.chunk_size_bytes));
  if(sorted.length!==expected||sorted.some((x,i)=>x.partNumber!==i+1)||new Set(sorted.map(x=>x.partNumber)).size!==sorted.length)return json(409,{error:"Multipart part sequence is incomplete or duplicated.",expectedParts:expected,receivedParts:sorted.length});
  if(sorted.some((x,i)=>x.etag.replaceAll('"',"").length<8||!/^[a-fA-F0-9-]+$/.test(x.etag.replaceAll('"',""))))return json(422,{error:"A storage part returned an invalid ETag."});
  try{
   const storage=await getStorage(db),list=await signedRequest(storage,session.object_path,"GET",{"uploadId":session.storage_upload_id});if(!list.ok)return json(502,{error:"Storage provider could not validate uploaded parts.",providerStatus:list.status});
   const listXml=await list.text(),actual=[...listXml.matchAll(/<Part>([\s\S]*?)<\/Part>/g)].map(m=>({partNumber:Number(xmlValue(m[1],"PartNumber")),etag:xmlValue(m[1],"ETag")?.replaceAll("&quot;","").replaceAll('"',""),checksumSha256:xmlValue(m[1],"ChecksumSHA256")}));
   for(const part of sorted){const got=actual.find(x=>x.partNumber===part.partNumber);if(!got||got.etag!==part.etag.replaceAll('"',"")||got.checksumSha256!==part.checksumSha256)return json(422,{error:"Storage ETag or SHA-256 checksum does not match the submitted part manifest.",partNumber:part.partNumber});}
   const manifest=sorted.map(x=>({partNumber:x.partNumber,etag:x.etag.replaceAll('"',""),checksumSha256:x.checksumSha256,size:x.partNumber<expected?Number(session.chunk_size_bytes):Number(session.expected_size_bytes)-(expected-1)*Number(session.chunk_size_bytes)}));
   const xml="<CompleteMultipartUpload>"+manifest.map(x=>"<Part><PartNumber>"+x.partNumber+"</PartNumber><ETag>&quot;"+x.etag+"&quot;</ETag><ChecksumSHA256>"+x.checksumSha256+"</ChecksumSHA256></Part>").join("")+"</CompleteMultipartUpload>";
   const done=await signedRequest(storage,session.object_path,"POST",{"uploadId":session.storage_upload_id},xml,{"content-type":"application/xml"});if(!done.ok){const detail=(await done.text()).slice(0,400);return json(502,{error:"Storage provider rejected multipart completion.",providerStatus:done.status,detail});}
   const resultXml=await done.text(),storageEtag=xmlValue(resultXml,"ETag");
   const digest=await sha256(manifest.map(x=>x.checksumSha256).join(":"));
   const {data:job,error:jobError}=await db.from("media_processing_jobs").insert({upload_session_id:session.id,content_id:session.content_id,idempotency_key:"media:"+session.id,status:"QUARANTINED",stage:"inspection",quarantine_path:session.object_path,sha256:null,provenance:{algorithm:"S3-MULTIPART-PER-PART-SHA256",expected_sha256:session.expected_sha256??null,parts:manifest,storage_etag:storageEtag,source_filename:session.original_filename,completed_at:new Date().toISOString()}}).select("id,status").single();
   let finalJob=job;if(jobError?.code==="23505"){const {data:existing}=await db.from("media_processing_jobs").select("id,status").eq("idempotency_key","media:"+session.id).single();finalJob=existing;}else if(jobError)return json(503,{error:"Media processing job could not be queued."});
   const {error:updateError}=await db.from("media_upload_sessions").update({status:"QUARANTINED",received_size_bytes:session.expected_size_bytes,chunk_manifest:manifest,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",session.id).eq("status","UPLOADING");
   if(updateError)return json(503,{error:"Upload completed but the session state could not be committed."});
   if(session.content_id){const {data:content}=await db.from("content").select("metadata").eq("id",session.content_id).single();const metadata={...(content?.metadata??{}),media_ingestion:{status:"QUARANTINED",job_id:finalJob?.id,master_object_path:session.object_path,sha256:session.expected_sha256??digest}};const {error:linkError}=await db.from("content").update({metadata}).eq("id",session.content_id).eq("creator_id",user.id);if(linkError)return json(503,{error:"Media job was queued but content attachment requires reconciliation.",jobId:finalJob?.id});}
   return json(202,{success:true,status:"QUARANTINED",job:finalJob,parts:manifest.length,objectPath:session.object_path});
  }catch(e){return json(503,{error:e instanceof Error?e.message:"Multipart completion failed."});}
 }
 if(p.action==="abort_multipart"||p.action==="cancel"){
  if(["READY","CANCELLED"].includes(session.status))return json(409,{error:"This upload can no longer be cancelled."});
  try{if(session.storage_upload_id){const storage=await getStorage(db);const aborted=await signedRequest(storage,session.object_path,"DELETE",{"uploadId":session.storage_upload_id});if(!aborted.ok&&aborted.status!==404)return json(502,{error:"Storage provider could not abort multipart upload.",providerStatus:aborted.status});}
   const {error}=await db.from("media_upload_sessions").update({status:"CANCELLED",cancelled_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",session.id);
   return error?json(503,{error:"Upload cancellation failed."}):json(200,{success:true,status:"CANCELLED"});
  }catch(e){return json(503,{error:e instanceof Error?e.message:"Upload cancellation failed."});}
 }
 return json(400,{error:"Unsupported action."});
});