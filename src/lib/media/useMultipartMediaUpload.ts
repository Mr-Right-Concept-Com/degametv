import {useCallback,useEffect,useRef,useState} from "react";
import {invokeFn} from "@/lib/invokeFn";
type Part={partNumber:number;etag:string;checksumSha256:string;size?:number};
type Recovery={sessionId:string;status:string;expectedSizeBytes:number;partSizeBytes:number;parts:Part[]};
type Init={sessionId:string;partSizeBytes:number;totalParts:number;status:string};
type Signed={uploadUrl:string;headers:Record<string,string>};
type UploadState="IDLE"|"PREPARING"|"UPLOADING"|"PAUSED"|"COMPLETING"|"QUARANTINED"|"SCANNING"|"TRANSCODING"|"READY"|"ERROR"|"CANCELLED";
const STORAGE_KEY=(userId:string)=>"degametv:multipart:"+userId;
async function checksum(filePart:Blob){const digest=await crypto.subtle.digest("SHA-256",await filePart.arrayBuffer());const bytes=new Uint8Array(digest);let binary="";for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary);}
export function useMultipartMediaUpload(userId:string|undefined){
 const [status,setStatus]=useState<UploadState>("IDLE"),[progress,setProgress]=useState(0),[sessionId,setSessionId]=useState<string|null>(null),[error,setError]=useState<string|null>(null),[fileName,setFileName]=useState<string|null>(null),[recovery,setRecovery]=useState<Recovery|null>(null);
 const paused=useRef(false),activeFile=useRef<File|null>(null);
 useEffect(()=>{if(!userId)return;const id=localStorage.getItem(STORAGE_KEY(userId));if(!id)return;setSessionId(id);void invokeFn<Recovery>("media-ingest-control",{action:"recover",sessionId:id}).then(r=>{if(r.ok&&r.data){setRecovery(r.data);setStatus(r.data.status==="READY"?"READY":r.data.status==="SCANNING"?"SCANNING":r.data.status==="PROMOTING"||r.data.status==="TRANSCODING"?"TRANSCODING":r.data.status==="QUARANTINED"?"QUARANTINED":r.data.status==="FAILED"||r.data.status==="DEAD_LETTER"?"ERROR":r.data.status==="CANCELLED"?"CANCELLED":"PAUSED");setProgress(r.data.expectedSizeBytes?Math.min(100,Math.round((r.data.parts.reduce((n,p)=>n+(p.size??0),0)/r.data.expectedSizeBytes)*100)):0);}});},[userId]);
 useEffect(()=>{
  if(!sessionId||!["QUARANTINED","SCANNING","TRANSCODING"].includes(status))return;
  const timer=window.setInterval(()=>{void invokeFn<Recovery>("media-ingest-control",{action:"recover",sessionId}).then(r=>{if(!r.ok||!r.data)return;setRecovery(r.data);if(r.data.status==="READY"){setStatus("READY");setProgress(100);}else if(r.data.status==="SCANNING")setStatus("SCANNING");else if(r.data.status==="PROMOTING"||r.data.status==="TRANSCODING")setStatus("TRANSCODING");else if(r.data.status==="FAILED"||r.data.status==="DEAD_LETTER"){setStatus("ERROR");setError("The media processing pipeline rejected or exhausted retries for this master.");}else if(r.data.status==="QUARANTINED")setStatus("QUARANTINED");});},5000);
  return()=>window.clearInterval(timer);
 },[sessionId,status]);
 const upload=useCallback(async(file:File,contentId?:string)=>{
  if(!userId)throw new Error("Sign in before uploading a master file.");
  if(file.size<=0||file.size>20*1024*1024*1024)throw new Error("Master files must be between 1 byte and 20 GiB.");
  activeFile.current=file;paused.current=false;setFileName(file.name);setError(null);setStatus("PREPARING");
  try{
   let id=sessionId,rec=recovery;
   if(id&&rec&&rec.expectedSizeBytes!==file.size){id=null;rec=null;}
   if(id){const r=await invokeFn<Recovery>("media-ingest-control",{action:"recover",sessionId:id});if(!r.ok||!r.data)throw new Error(r.error??"Could not recover the previous upload.");rec=r.data;}
   if(rec&&["QUARANTINED","SCANNING","PROMOTING","TRANSCODING","READY"].includes(rec.status)){setStatus(rec.status==="READY"?"READY":rec.status==="SCANNING"?"SCANNING":rec.status==="PROMOTING"||rec.status==="TRANSCODING"?"TRANSCODING":"QUARANTINED");setProgress(100);return {sessionId:id??rec.sessionId};}
   if(!id||!rec){const init=await invokeFn<Init>("media-ingest-control",{action:"init_multipart",contentId,filename:file.name,mimeType:file.type||"application/octet-stream",sizeBytes:file.size,chunkSizeBytes:64*1024*1024});if(!init.ok||!init.data)throw new Error(init.error??"Could not initialize multipart upload.");id=init.data.sessionId;rec={sessionId:id,status:init.data.status,expectedSizeBytes:file.size,partSizeBytes:init.data.partSizeBytes,parts:[]};setSessionId(id);localStorage.setItem(STORAGE_KEY(userId),id);}
   setRecovery(rec);const done=new Map(rec.parts.map(p=>[p.partNumber,p]));let sent=rec.parts.reduce((n,p)=>n+Math.min(rec!.partSizeBytes,file.size-(p.partNumber-1)*rec!.partSizeBytes),0);setProgress(Math.min(100,Math.round(sent/file.size*100)));setStatus("UPLOADING");
   const count=Math.ceil(file.size/rec.partSizeBytes);
   for(let partNumber=1;partNumber<=count;partNumber++){
    if(paused.current){setStatus("PAUSED");return;}
    if(done.has(partNumber))continue;
    const start=(partNumber-1)*rec.partSizeBytes,end=Math.min(file.size,start+rec.partSizeBytes),blob=file.slice(start,end),sum=await checksum(blob);
    const signed=await invokeFn<Signed>("media-ingest-control",{action:"sign_part",sessionId:id,partNumber,checksumSha256:sum});if(!signed.ok||!signed.data)throw new Error(signed.error??"Could not sign upload part "+partNumber+".");
    const response=await fetch(signed.data.uploadUrl,{method:"PUT",headers:signed.data.headers,body:blob});if(!response.ok)throw new Error("Storage rejected upload part "+partNumber+" ("+response.status+").");
    const etag=response.headers.get("ETag")?.replaceAll('"',"");if(!etag)throw new Error("Storage CORS must expose the ETag response header before uploads can complete.");
    const part={partNumber,etag,checksumSha256:sum,size:blob.size};done.set(partNumber,part);sent+=blob.size;setRecovery(v=>v?({...v,parts:[...done.values()]}):v);setProgress(Math.min(100,Math.round(sent/file.size*100)));
   }
   if(paused.current){setStatus("PAUSED");return;}
   setStatus("COMPLETING");const completed=await invokeFn<{job:{id:string};status:string}>("media-ingest-control",{action:"complete_multipart",sessionId:id,parts:[...done.values()].sort((a,b)=>a.partNumber-b.partNumber).map(({partNumber,etag,checksumSha256})=>({partNumber,etag,checksumSha256}))});
   if(!completed.ok)throw new Error(completed.error??"Multipart completion failed.");
   setStatus("QUARANTINED");setProgress(100);setRecovery(v=>v?({...v,status:"QUARANTINED"}):v);return {sessionId:id,jobId:completed.data?.job?.id};
  }catch(e){setError(e instanceof Error?e.message:"Multipart upload failed.");setStatus("ERROR");throw e;}
 },[userId,sessionId,recovery]);
 const pause=useCallback(()=>{paused.current=true;},[]);
 const resume=useCallback(async(file?:File)=>{const selected=file??activeFile.current;if(!selected)throw new Error("Select the same source file to resume this upload.");return upload(selected);},[upload]);
 const cancel=useCallback(async()=>{if(!sessionId)return;paused.current=true;const r=await invokeFn("media-ingest-control",{action:"abort_multipart",sessionId});if(!r.ok)throw new Error(r.error??"Upload cancellation failed.");if(userId)localStorage.removeItem(STORAGE_KEY(userId));setSessionId(null);setRecovery(null);setProgress(0);setStatus("CANCELLED");},[sessionId,userId]);
 const attachToContent=useCallback(async(contentId:string,targetSessionId?:string)=>{const id=targetSessionId??sessionId;if(!id) return;const r=await invokeFn("media-ingest-control",{action:"attach_content",sessionId:id,contentId});if(!r.ok)throw new Error(r.error??"Completed media could not be attached to this production.");},[sessionId]);
 return {status,progress,sessionId,error,fileName,recovery,upload,pause,resume,cancel,attachToContent};
}