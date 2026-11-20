import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const schema=z.object({
 screeningId:z.string().uuid(),
 basePrice:z.number().finite().min(0).max(1_000_000_000).optional(),
 baseCurrency:z.string().regex(/^[A-Za-z]{3}$/).optional(),
 replayBasePrice:z.number().finite().min(0).max(1_000_000_000).nullable().optional(),
 admissionModel:z.enum(["FREE","TICKETED"]).optional(),
 livePriceNgn:z.number().finite().min(0).max(100_000_000).nullable().optional(),
 livePriceUsd:z.number().finite().min(0).max(1_000_000).nullable().optional(),
 replayPriceNgn:z.number().finite().min(0).max(100_000_000).nullable().optional(),
 replayPriceUsd:z.number().finite().min(0).max(1_000_000).nullable().optional(),
 replayAccessHours:z.number().int().min(1).max(8760),
 replayAccessModel:z.enum(["INCLUDED_WITH_TICKET","SEPARATE_PRICE","FREE_REPLAY"]).optional(),
 autoConvertToVod:z.boolean().optional(),
}).strict().superRefine((v,ctx)=>{
 const base=v.basePrice!==undefined;
 const legacy=v.livePriceNgn!==undefined||v.livePriceUsd!==undefined;
 if(!base&&!legacy)ctx.addIssue({code:z.ZodIssueCode.custom,path:["basePrice"],message:"Set a base-currency admission price."});
 if(base&&!v.baseCurrency)ctx.addIssue({code:z.ZodIssueCode.custom,path:["baseCurrency"],message:"Base currency is required with a base price."});
 if(v.admissionModel==="FREE"&&base&&v.basePrice!==0)ctx.addIssue({code:z.ZodIssueCode.custom,path:["basePrice"],message:"Free admission must have a zero base price."});
 if(v.admissionModel==="TICKETED"&&base&&v.basePrice===0)ctx.addIssue({code:z.ZodIssueCode.custom,path:["basePrice"],message:"Ticketed admission requires a positive base price."});
 if(v.replayAccessModel==="SEPARATE_PRICE"&&base&&(v.replayBasePrice===undefined||v.replayBasePrice===null||v.replayBasePrice<=0))
  ctx.addIssue({code:z.ZodIssueCode.custom,path:["replayBasePrice"],message:"A positive replay price is required."});
});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const authorization=req.headers.get("Authorization");
 if(!url||!anon||!service)return json({error:"Pricing service is unavailable."},503);
 if(!authorization?.startsWith("Bearer "))return json({error:"Sign in to manage event pricing."},401);
 const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await caller.auth.getUser();
 if(authError||!user)return json({error:"Your session is invalid. Sign in again."},401);
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json({error:"Check the admission and replay prices.",details:parsed.error.flatten()},400);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:screening,error:lookupError}=await db.from("screenings").select("id,tenant_id,content_id,base_price,base_currency,live_price_ngn,live_price_usd,access_model").eq("id",parsed.data.screeningId).maybeSingle();
 if(lookupError||!screening)return json({error:"Event not found."},404);
 const {data:content,error:contentError}=await db.from("content").select("creator_id,tenant_id").eq("id",screening.content_id).maybeSingle();
 if(contentError||!content||content.creator_id!==user.id||content.tenant_id!==screening.tenant_id)return json({error:"You do not own this event in its tenant."},403);
 const [{data:creatorRole,error:roleError},{data:studio,error:studioError}]=await Promise.all([
  db.from("user_roles").select("user_id").eq("user_id",user.id).eq("role","creator").maybeSingle(),
  db.from("studio_accounts").select("id").eq("user_id",user.id).eq("status","approved").maybeSingle(),
 ]);
 if(roleError||studioError)return json({error:"Creator permissions could not be verified."},503);
 if(!creatorRole||!studio)return json({error:"Approved creator access is required."},403);
 const update:Record<string,unknown>={replay_access_hours:parsed.data.replayAccessHours,updated_at:new Date().toISOString()};
 if(parsed.data.basePrice!==undefined){
  const baseCurrency=parsed.data.baseCurrency!.toUpperCase();
  const {data:baseSetting,error:baseError}=await db.from("platform_settings").select("setting_value").eq("setting_key","base_currency").maybeSingle();
  const currentBase=typeof baseSetting?.setting_value==="string"?baseSetting.setting_value.toUpperCase():"";
  if(baseError||currentBase!==baseCurrency)return json({error:"Use the currently configured platform base currency. Refresh Creator Studio and retry."},409);
  update.base_price=parsed.data.basePrice;
  update.base_currency=baseCurrency;
  update.live_price_ngn=null;
  update.live_price_usd=null;
  update.replay_base_price=parsed.data.replayBasePrice??null;
  update.replay_price_ngn=null;
  update.replay_price_usd=null;
 }else{
  update.base_price=null;
  update.base_currency=null;
  update.replay_base_price=null;
  update.live_price_ngn=parsed.data.livePriceNgn??null;
  update.live_price_usd=parsed.data.livePriceUsd??null;
  update.replay_price_ngn=parsed.data.replayPriceNgn??null;
  update.replay_price_usd=parsed.data.replayPriceUsd??null;
 }
 if(parsed.data.replayAccessModel)update.replay_access_model=parsed.data.replayAccessModel;
 if(parsed.data.autoConvertToVod!==undefined)update.auto_convert_to_vod=parsed.data.autoConvertToVod;
 const {data,error}=await db.from("screenings").update(update).eq("id",parsed.data.screeningId).eq("tenant_id",screening.tenant_id)
  .select("id,base_price,base_currency,replay_base_price,live_price_ngn,live_price_usd,replay_price_ngn,replay_price_usd,access_model,replay_access_hours,replay_access_model").single();
 if(error||!data)return json({error:"Pricing could not be saved. No changes were confirmed."},503);
 await db.from("audit_logs").insert({user_id:user.id,action:"creator.screening.pricing_updated",entity_type:"screening",entity_id:screening.id,old_data:{base_price:screening.base_price,base_currency:screening.base_currency,live_price_ngn:screening.live_price_ngn,live_price_usd:screening.live_price_usd},new_data:{base_price:data.base_price,base_currency:data.base_currency,replay_base_price:data.replay_base_price,access_model:data.access_model,replay_access_model:data.replay_access_model}});
 return json({success:true,pricing:data});
});
