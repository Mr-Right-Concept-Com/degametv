import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type, x-domain-control-secret","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const Slug=z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/).refine(v=>!["api","admin","studio","watch","app","cdn","auth","www","mail","support","status","checkout","billing"].includes(v));
const Body=z.discriminatedUnion("action",[
 z.object({action:z.literal("reserve_slug"),contentId:z.string().uuid(),slug:Slug,branding:z.record(z.unknown()).optional(),seo:z.record(z.unknown()).optional()}).strict(),
 z.object({action:z.literal("register_custom_domain"),contentId:z.string().uuid(),hostname:z.string().trim().toLowerCase().min(4).max(253)}).strict(),
 z.object({action:z.literal("verify_dns"),domainId:z.string().uuid()}).strict(),
 z.object({action:z.literal("resolve"),hostname:z.string().min(1).max(253)}).strict(),
 z.object({action:z.literal("ssl_sync"),domainId:z.string().uuid(),state:z.enum(["PROVISIONING_SSL","ACTIVE","FAILED","SUSPENDED"]),certificateExpiresAt:z.string().datetime().optional(),error:z.string().max(500).optional()}).strict(),
]);
const hash=async(v:string)=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)))].map(x=>x.toString(16).padStart(2,"0")).join("");
const dns=async(name:string,type:"TXT"|"CNAME"|"A")=>{
 const r=await fetch("https://cloudflare-dns.com/dns-query?name="+encodeURIComponent(name)+"&type="+type,{headers:{accept:"application/dns-json"},signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error("dns_provider_unavailable");
 const j=await r.json();return (j.Answer??[]).map((a:{data:string})=>String(a.data).replace(/^"|"$/g,"").replace(/\.$/,"").toLowerCase());
};
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!service||!anon)return json(503,{error:"Domain control is not configured."});
 const input=Body.safeParse(await req.json().catch(()=>null));if(!input.success)return json(400,{error:"Invalid domain request.",issues:input.error.flatten()});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),p=input.data;
 if(p.action==="ssl_sync"){
  const secret=Deno.env.get("DOMAIN_CONTROL_WEBHOOK_SECRET");
  if(!secret||req.headers.get("x-domain-control-secret")!==secret)return json(401,{error:"Domain provider authentication failed."});
  const {error}=await db.from("release_domains").update({verification_status:p.state,status:p.state==="ACTIVE"?"active":p.state==="SUSPENDED"?"suspended":"pending_dns",ssl_status:p.state.toLowerCase(),ssl_certificate_expires_at:p.certificateExpiresAt??null,verification_error:p.error??null,updated_at:new Date().toISOString()}).eq("id",p.domainId);
  return error?json(503,{error:"SSL state could not be persisted."}):json(200,{success:true,status:p.state});
 }
 const auth=req.headers.get("Authorization");
 if(!auth?.startsWith("Bearer "))return json(401,{error:"Authentication required."});
 const caller=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await caller.auth.getUser();if(authError||!user)return json(401,{error:"Invalid session."});
 if(p.action==="resolve"){
  const {data,error}=await db.rpc("resolve_release_domain",{p_hostname:p.hostname.toLowerCase().replace(/:\d+$/,"")});
  if(error)return json(503,{error:"Hostname resolution failed."});
  return json(200,{success:true,production:Array.isArray(data)?data[0]??null:data??null});
 }
 if(p.action==="reserve_slug"||p.action==="register_custom_domain"){
  const {data:content,error}=await db.from("content").select("id,creator_id,tenant_id,slug,title,status").eq("id",p.contentId).eq("creator_id",user.id).maybeSingle();
  if(error||!content)return json(404,{error:"Production not found or not owned by this creator."});
  if(p.action==="reserve_slug"){
   const hostname=p.slug+".degametv.com";
   const {data:collision}=await db.from("release_domains").select("id").eq("hostname",hostname).neq("content_id",p.contentId).maybeSingle();
   if(collision)return json(409,{error:"This production slug is already reserved."});
   const {data:domain,error:saveError}=await db.from("release_domains").upsert({tenant_id:content.tenant_id,content_id:content.id,subdomain:p.slug,hostname,domain_kind:"platform_subdomain",status:"active",verification_status:"ACTIVE",ssl_status:"managed",branding:p.branding??{},seo_metadata:p.seo??{},updated_at:new Date().toISOString()},{onConflict:"content_id"}).select("id,hostname,status,verification_status").single();
   return saveError?json(409,{error:"Slug could not be reserved."}):json(200,{success:true,domain});
  }
  const host=p.hostname.toLowerCase().replace(/\.$/,"");
  if(host.includes("/")||host.includes(":")||host==="degametv.com"||host.endsWith(".degametv.com")||!host.includes(".")||!(/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)))return json(400,{error:"A valid external custom domain is required."});
  const token=crypto.randomUUID()+"."+crypto.randomUUID(),tokenHash=await hash(token);
  const {data:domain,error:saveError}=await db.from("release_domains").upsert({tenant_id:content.tenant_id,content_id:content.id,subdomain:content.slug,hostname:host,domain_kind:"custom_domain",status:"pending_dns",verification_status:"PENDING_DNS",verification_token_hash:tokenHash,dns_target:Deno.env.get("DEGAMETV_CUSTOM_DOMAIN_TARGET")??"domains.degametv.com",ssl_status:"not_requested",updated_at:new Date().toISOString()},{onConflict:"content_id"}).select("id,hostname,verification_status,dns_target").single();
  if(saveError)return json(409,{error:"Custom domain could not be registered."});
  return json(201,{success:true,domain,verificationRecord:{type:"TXT",name:"_degametv-verification."+host,value:token},routingRecord:{type:"CNAME",name:host,value:domain.dns_target}});
 }
 const {data:domain,error:domainError}=await db.from("release_domains").select("id,content_id,hostname,verification_token_hash,dns_target,domain_kind").eq("id",p.domainId).maybeSingle();
 if(domainError||!domain)return json(404,{error:"Domain registration not found."});
 const {data:owned}=await db.from("content").select("id").eq("id",domain.content_id).eq("creator_id",user.id).maybeSingle();
 if(!owned)return json(403,{error:"You cannot verify another creator's domain."});
 if(domain.domain_kind!=="custom_domain"||!domain.verification_token_hash)return json(409,{error:"This domain does not require custom DNS verification."});
 try{
  const [txt,cnames,ips]=await Promise.all([dns("_degametv-verification."+domain.hostname,"TXT"),dns(domain.hostname,"CNAME"),dns(domain.hostname,"A")]);
  const tokenVerified=txt.some(v=>hash(v).then(h=>h===domain.verification_token_hash));
  const target=(domain.dns_target??"").toLowerCase().replace(/\.$/,"");
  const routeVerified=cnames.includes(target)||(Deno.env.get("DEGAMETV_CUSTOM_DOMAIN_IPV4")?ips.includes(Deno.env.get("DEGAMETV_CUSTOM_DOMAIN_IPV4")!):false);
  if(!tokenVerified||!routeVerified){
   await db.from("release_domains").update({verification_status:"VERIFYING",last_verification_at:new Date().toISOString(),verification_error:!tokenVerified?"TXT ownership record not found.":"CNAME/A target does not match platform target.",updated_at:new Date().toISOString()}).eq("id",domain.id);
   return json(409,{success:false,verified:false,txtVerified:tokenVerified,routeVerified});
  }
  await db.from("release_domains").update({verification_status:"PROVISIONING_SSL",last_verification_at:new Date().toISOString(),verified_at:new Date().toISOString(),verification_error:null,updated_at:new Date().toISOString()}).eq("id",domain.id);
  return json(202,{success:true,verified:true,status:"PROVISIONING_SSL",message:"DNS ownership and routing are verified. SSL provisioning must be completed by the configured hosting-domain adapter."});
 }catch(e){return json(503,{error:"DNS verification service is temporarily unavailable."});}
});