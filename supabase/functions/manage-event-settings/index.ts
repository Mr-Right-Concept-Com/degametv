import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
const Body=z.object({
 screeningId:z.string().uuid(),
 screeningDate:z.string().datetime({offset:true}).nullable().optional(),
 eventTimezone:z.string().trim().min(1).max(64).optional(),
 salesOpenAt:z.string().datetime({offset:true}).nullable().optional(),
 salesCloseAt:z.string().datetime({offset:true}).nullable().optional(),
 earlyBirdPrice:z.number().finite().positive().max(100000000).nullable().optional(),
 earlyBirdCurrency:z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
 earlyBirdEndsAt:z.string().datetime({offset:true}).nullable().optional(),
 earlyBirdCapacity:z.number().int().positive().max(10000000).nullable().optional(),
 eventVisibility:z.enum(["public","unlisted","private"]).optional(),
 inviteOnly:z.boolean().optional(),
 presaleEnabled:z.boolean().optional(),
 settlementHoldHours:z.number().int().min(24).max(72).optional()
}).strict();
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const auth=req.headers.get("Authorization")||"";
 if(!url||!service||!auth.startsWith("Bearer "))return json(401,{error:"Sign in to manage event settings."});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await admin.auth.getUser(auth.slice(7));
 if(userError||!user)return json(401,{error:"Your sign-in session is invalid."});
 const parsed=Body.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json(400,{error:parsed.error.flatten().fieldErrors});
 const p=parsed.data;
 const {data:event,error:eventError}=await admin.from("screenings").select("id,tenant_id,content_id,screening_date,sales_open_at,sales_close_at,early_bird_price,early_bird_ends_at,early_bird_capacity").eq("id",p.screeningId).maybeSingle();
 if(eventError||!event)return json(404,{error:"Event not found."});
 const {data:content}=await admin.from("content").select("creator_id").eq("id",event.content_id).maybeSingle();
 const {data:adminRole,error:roleError}=await admin.from("user_roles").select("user_id").eq("user_id",user.id).eq("role","super_admin").maybeSingle();
 const isAdmin=!roleError&&Boolean(adminRole);
 if(!isAdmin&&content?.creator_id!==user.id)return json(403,{error:"Only the event owner or an authorized administrator can change these settings."});
 const open=p.salesOpenAt===undefined?event.sales_open_at:p.salesOpenAt;
 const close=p.salesCloseAt===undefined?event.sales_close_at:p.salesCloseAt;
 const birdPrice=p.earlyBirdPrice===undefined?event.early_bird_price:p.earlyBirdPrice;
 const birdEnd=p.earlyBirdEndsAt===undefined?event.early_bird_ends_at:p.earlyBirdEndsAt;
 const birdCapacity=p.earlyBirdCapacity===undefined?event.early_bird_capacity:p.earlyBirdCapacity;
 if(open&&close&&Date.parse(open)>=Date.parse(close))return json(422,{error:"Ticket sales must close after they open."});
 if(birdPrice!==null&&birdPrice!==undefined){
  if(!birdEnd)return json(422,{error:"Set an early-bird end time when enabling early-bird pricing."});
  if(!birdCapacity||birdCapacity<1)return json(422,{error:"Set an early-bird ticket capacity."});
  if(open&&Date.parse(birdEnd)<=Date.parse(open))return json(422,{error:"Early-bird pricing must end after ticket sales open."});
  if(close&&Date.parse(birdEnd)>Date.parse(close))return json(422,{error:"Early-bird pricing cannot end after ticket sales close."});
 }
 if(p.eventTimezone!==undefined){
  try{new Intl.DateTimeFormat("en",{timeZone:p.eventTimezone}).format(new Date());}
  catch{return json(422,{error:"Enter a valid IANA timezone such as Africa/Lagos."});}
 }
 const patch:Record<string,unknown>={};
 if(p.screeningDate!==undefined)patch.screening_date=p.screeningDate;
 if(p.eventTimezone!==undefined)patch.event_timezone=p.eventTimezone;
 if(p.salesOpenAt!==undefined)patch.sales_open_at=p.salesOpenAt;
 if(p.salesCloseAt!==undefined)patch.sales_close_at=p.salesCloseAt;
 if(p.earlyBirdPrice!==undefined)patch.early_bird_price=p.earlyBirdPrice;
 if(p.earlyBirdCurrency!==undefined)patch.early_bird_currency=p.earlyBirdCurrency;
 if(p.earlyBirdEndsAt!==undefined)patch.early_bird_ends_at=p.earlyBirdEndsAt;
 if(p.earlyBirdCapacity!==undefined)patch.early_bird_capacity=p.earlyBirdCapacity;
 if(p.eventVisibility!==undefined)patch.event_visibility=p.inviteOnly===true?"private":p.eventVisibility;
 if(p.inviteOnly!==undefined)patch.invite_only=p.inviteOnly;
 if(p.presaleEnabled!==undefined)patch.presale_enabled=p.presaleEnabled;
 if(p.settlementHoldHours!==undefined)patch.settlement_hold_hours=p.settlementHoldHours;
 if(Object.keys(patch).length===0)return json(400,{error:"No event settings were supplied."});
 const {data:updated,error:updateError}=await admin.from("screenings").update(patch).eq("id",event.id).select("id,screening_date,event_timezone,sales_open_at,sales_close_at,early_bird_price,early_bird_currency,early_bird_ends_at,early_bird_capacity,event_visibility,invite_only,presale_enabled,settlement_hold_hours").single();
 if(updateError)return json(503,{error:"Event settings could not be saved."});
 await admin.from("audit_logs").insert({user_id:user.id,action:"event_commerce_settings_updated",entity_type:"screening",entity_id:event.id,new_data:patch});
 return json(200,{success:true,event:updated});
});