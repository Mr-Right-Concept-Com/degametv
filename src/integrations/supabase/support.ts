import { z } from 'zod';
import { supabase } from './client';

const ErrorSchema = z.object({ message: z.string() }).passthrough();
const TicketSchema = z.object({
  id: z.string().uuid(), ticket_number: z.number(), user_id: z.string().uuid(),
  subject: z.string(), category: z.string(), priority: z.string(), status: z.string(),
  description: z.string(), assigned_agent_id: z.string().uuid().nullable(),
  department: z.string().optional().default('general'), channel: z.string().optional().default('ticket'),
  first_response_due_at: z.string().nullable().optional(), resolution_due_at: z.string().nullable().optional(),
  created_at: z.string(), last_message_at: z.string().optional(),
  satisfaction_rating: z.number().nullable().optional(),
});
const MessageSchema = z.object({
  id: z.string().uuid(), ticket_id: z.string().uuid(), sender_id: z.string().uuid(),
  body: z.string(), is_internal: z.boolean(), created_at: z.string(),
  attachment_paths: z.array(z.string()).default([]),
});
const AgentSchema = z.object({ user_id: z.string().uuid(), is_active: z.boolean() });
const ArticleSchema = z.object({
  id: z.string().uuid(), slug: z.string(), title: z.string(), summary: z.string().nullable(),
  body_markdown: z.string(),
});
const ChatSchema = TicketSchema;

export type SupportTicket = z.infer<typeof TicketSchema>;
export type SupportMessage = z.infer<typeof MessageSchema>;
export type SupportArticle = z.infer<typeof ArticleSchema>;
export type SupportStatus = 'open' | 'awaiting_support' | 'awaiting_user' | 'in_progress' | 'escalated' | 'resolved' | 'closed';
const client = supabase;

function throwIfError(error: unknown): void {
  if (error == null) return;
  const parsed = ErrorSchema.safeParse(error);
  throw new Error(parsed.success ? parsed.data.message : 'Support service request failed.');
}
function parseRows<T extends z.ZodTypeAny>(schema: T, value: unknown): z.output<T>[] {
  return z.array(schema).parse(value ?? []) as z.output<T>[];
}
function parseOne<T extends z.ZodTypeAny>(schema: T, value: unknown): z.output<T> {
  return schema.parse(value) as z.output<T>;
}
export async function getSupportAgent(userId: string) {
  const result = await client.from('support_agents').select('user_id,is_active').eq('user_id', userId).maybeSingle();
  throwIfError(result.error);
  return result.data == null ? null : parseOne(AgentSchema, result.data);
}
export async function listSupportTickets(options: { ownerId?: string; assignedTo?: string; channel?: string; statuses?: string[]; status?: string; limit?: number } = {}) {
  let query = client.from('support_tickets').select('id,ticket_number,user_id,subject,category,priority,status,description,assigned_agent_id,department,channel,first_response_due_at,resolution_due_at,created_at,last_message_at,satisfaction_rating').order('last_message_at', { ascending: false }).limit(options.limit ?? 100);
  if (options.ownerId) query = query.eq('user_id', options.ownerId);
  if (options.assignedTo) query = query.eq('assigned_agent_id', options.assignedTo);
  if (options.channel) query = query.eq('channel', options.channel);
  if (options.statuses) query = query.in('status', options.statuses);
  if (options.status) query = query.eq('status', options.status);
  const result = await query;
  throwIfError(result.error);
  return parseRows(TicketSchema, result.data);
}
export async function listSupportMessages(ticketId: string, includeInternal = false) {
  let query = client.from('support_messages').select('id,ticket_id,sender_id,body,is_internal,created_at,attachment_paths').eq('ticket_id', ticketId).order('created_at', { ascending: true });
  if (!includeInternal) query = query.eq('is_internal', false);
  const result = await query;
  throwIfError(result.error);
  return parseRows(MessageSchema, result.data);
}
export async function listSupportArticles() {
  const result = await client.from('knowledgebase_articles').select('id,slug,title,summary,body_markdown').eq('is_published', true).not('published_at', 'is', null).order('published_at', { ascending: false }).limit(100);
  throwIfError(result.error);
  return parseRows(ArticleSchema, result.data);
}
export async function createSupportTicket(input: { userId: string; subject: string; category: string; description: string }) {
  const result = await client.from('support_tickets').insert({ user_id: input.userId, subject: input.subject, category: input.category, description: input.description }).select('id,ticket_number,user_id,subject,category,priority,status,description,assigned_agent_id,department,channel,first_response_due_at,resolution_due_at,created_at,last_message_at,satisfaction_rating').single();
  throwIfError(result.error);
  return parseOne(TicketSchema, result.data);
}
export async function createSupportChat() {
  const result = await client.rpc('create_support_chat');
  throwIfError(result.error);
  return parseOne(ChatSchema, result.data);
}
export async function reopenSupportTicket(ticketId: string) {
  const result = await client.rpc('reopen_support_ticket', { p_ticket_id: ticketId });
  throwIfError(result.error);
  z.object({ id: z.string().uuid(), ticket_number: z.number(), status: z.literal('open') }).parse(result.data);
}
export async function rateSupportTicket(ticketId: string, rating: number) {
  const result = await client.rpc('rate_support_ticket', { p_ticket_id: ticketId, p_rating: rating });
  throwIfError(result.error);
  z.object({ ticket_id: z.string().uuid(), rating: z.number().int().min(1).max(5) }).parse(result.data);
}
export async function claimSupportTicket(ticketId: string, agentId: string) {
  const result = await client.from('support_tickets').update({ assigned_agent_id: agentId, status: 'in_progress' }).eq('id', ticketId).is('assigned_agent_id', null);
  throwIfError(result.error);
}
export async function updateSupportTicket(ticketId: string, agentId: string, status: SupportStatus) {
  const result = await client.from('support_tickets').update({
    status, assigned_agent_id: agentId,
    ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
    ...(status === 'closed' ? { closed_at: new Date().toISOString() } : {}),
    ...(status === 'escalated' ? { escalated_at: new Date().toISOString() } : {}),
  }).eq('id', ticketId);
  throwIfError(result.error);
}
export async function insertSupportMessage(input: { ticketId: string; senderId: string; body: string; internal: boolean; attachmentPaths: string[] }) {
  const result = await client.from('support_messages').insert({
    ticket_id: input.ticketId, sender_id: input.senderId, body: input.body,
    is_internal: input.internal, attachment_paths: input.attachmentPaths,
  });
  throwIfError(result.error);
}

const AdminAgentSchema = AgentSchema.extend({
  display_name: z.string().nullable(),
  department: z.string(),
  created_at: z.string(),
});
const KnowledgebaseCategorySchema = z.object({
  id: z.string().uuid(), slug: z.string(), title: z.string(),
  description: z.string().nullable(), sort_order: z.number(), is_published: z.boolean(),
});
const AdminArticleSchema = ArticleSchema.extend({
  category_id: z.string().uuid().nullable(), audience: z.enum(['all', 'viewer', 'creator', 'studio', 'technical']),
  is_published: z.boolean(), published_at: z.string().nullable(),
});
const SlaPolicySchema = z.object({
  priority: z.string(), first_response_minutes: z.number().int(),
  resolution_minutes: z.number().int(), is_active: z.boolean(),
});
export type SupportAdminAgent = z.infer<typeof AdminAgentSchema>;
export type KnowledgebaseCategory = z.infer<typeof KnowledgebaseCategorySchema>;
export type KnowledgebaseAdminArticle = z.infer<typeof AdminArticleSchema>;
export type SupportSlaPolicy = z.infer<typeof SlaPolicySchema>;

export async function listSupportAdminAgents() {
  const result = await client.from('support_agents').select('user_id,is_active,display_name,department,created_at').order('created_at', { ascending: false });
  throwIfError(result.error);
  return parseRows(AdminAgentSchema, result.data);
}
export async function upsertSupportAdminAgent(input: { user_id: string; display_name: string | null; department: string; is_active: boolean }) {
  const result = await client.from('support_agents').upsert(input, { onConflict: 'user_id' });
  throwIfError(result.error);
}
export async function setSupportAdminAgentActive(userId: string, isActive: boolean) {
  const result = await client.from('support_agents').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('user_id', userId);
  throwIfError(result.error);
}
export async function listKnowledgebaseCategories() {
  const result = await client.from('knowledgebase_categories').select('id,slug,title,description,sort_order,is_published').order('sort_order', { ascending: true });
  throwIfError(result.error);
  return parseRows(KnowledgebaseCategorySchema, result.data);
}
export async function createKnowledgebaseCategory(input: { slug: string; title: string; description: string | null; sort_order: number }) {
  const result = await client.from('knowledgebase_categories').insert({ ...input, is_published: true });
  throwIfError(result.error);
}
export async function listKnowledgebaseAdminArticles() {
  const result = await client.from('knowledgebase_articles').select('id,slug,title,summary,body_markdown,category_id,audience,is_published,published_at').order('updated_at', { ascending: false });
  throwIfError(result.error);
  return parseRows(AdminArticleSchema, result.data);
}
export async function saveKnowledgebaseAdminArticle(input: {
  id?: string; slug: string; title: string; summary: string | null; body_markdown: string;
  category_id: string | null; audience: 'all' | 'viewer' | 'creator' | 'studio' | 'technical';
  is_published: boolean; published_at: string | null; updated_by: string; created_by?: string;
}) {
  const { id, ...payload } = input;
  const query = id
    ? client.from('knowledgebase_articles').update(payload).eq('id', id)
    : client.from('knowledgebase_articles').insert(payload);
  const result = await query;
  throwIfError(result.error);
}
export async function setKnowledgebaseArticlePublished(input: { id: string; published: boolean; published_at: string | null; updated_by: string | undefined }) {
  const result = await client.from('knowledgebase_articles').update({
    is_published: input.published, published_at: input.published_at, updated_by: input.updated_by,
  }).eq('id', input.id);
  throwIfError(result.error);
}
export async function listSupportSlaPolicies() {
  const result = await client.from('support_sla_policies').select('priority,first_response_minutes,resolution_minutes,is_active').order('priority', { ascending: true });
  throwIfError(result.error);
  return parseRows(SlaPolicySchema, result.data);
}
export async function updateSupportSlaPolicy(input: { priority: string; first_response_minutes: number; resolution_minutes: number; is_active: boolean }) {
  const result = await client.from('support_sla_policies').update({
    first_response_minutes: input.first_response_minutes, resolution_minutes: input.resolution_minutes,
    is_active: input.is_active, updated_at: new Date().toISOString(),
  }).eq('priority', input.priority);
  throwIfError(result.error);
}

const OperatingHoursSchema = z.object({
  id: z.number().int().min(1).max(1), timezone: z.string().min(1),
  weekly_schedule: z.record(z.string(), z.object({ open: z.string(), close: z.string() }).nullable()),
  holidays: z.array(z.string()), updated_at: z.string(), updated_by: z.string().uuid().nullable(),
});
const EscalationSchema = z.object({
  id: z.string().uuid(), ticket_id: z.string().uuid(), breach_type: z.enum(['first_response','resolution']),
  due_at: z.string(), escalated_at: z.string(), previous_status: z.string(),
});
export type SupportOperatingHours = z.infer<typeof OperatingHoursSchema>;
export type SupportSlaEscalationEvent = z.infer<typeof EscalationSchema>;
export type SupportSlaMetrics = { openTickets:number; breachedFirstResponse:number; breachedResolution:number; escalatedTickets:number; resolvedLast30Days:number };
export async function getSupportOperatingHours(): Promise<SupportOperatingHours> {
  const result = await client.from('support_operating_hours').select('id,timezone,weekly_schedule,holidays,updated_at,updated_by').eq('id',1).single();
  throwIfError(result.error); return parseOne(OperatingHoursSchema,result.data);
}
export async function saveSupportOperatingHours(input: {timezone:string; weekly_schedule:SupportOperatingHours['weekly_schedule']; holidays:string[]; updated_by:string}) {
  if (!input.timezone.trim() || !Number.isFinite(Date.parse(input.holidays[0] ?? '2000-01-01'))) throw new Error('Operating hours configuration is invalid.');
  const result = await client.from('support_operating_hours').upsert({id:1,...input,updated_at:new Date().toISOString()},{onConflict:'id'});
  throwIfError(result.error);
}
export async function listSupportSlaEscalationEvents(ticketId?:string,limit=100): Promise<SupportSlaEscalationEvent[]> {
  let query=client.from('support_sla_escalation_events').select('id,ticket_id,breach_type,due_at,escalated_at,previous_status').order('escalated_at',{ascending:false}).limit(Math.min(Math.max(limit,1),500));
  if(ticketId) query=query.eq('ticket_id',ticketId);
  const result=await query; throwIfError(result.error); return parseRows(EscalationSchema,result.data);
}
export async function getSupportSlaMetrics(): Promise<SupportSlaMetrics> {
  const now=new Date().toISOString(),since=new Date(Date.now()-30*86400000).toISOString();
  const [open,first,resolution,escalated,resolved]=await Promise.all([
    client.from('support_tickets').select('id',{count:'exact',head:true}).not('status','in','("resolved","closed")'),
    client.from('support_tickets').select('id',{count:'exact',head:true}).not('status','in','("resolved","closed")').lt('first_response_due_at',now).is('first_responded_at',null),
    client.from('support_tickets').select('id',{count:'exact',head:true}).not('status','in','("resolved","closed")').lt('resolution_due_at',now),
    client.from('support_sla_escalation_events').select('id',{count:'exact',head:true}),
    client.from('support_tickets').select('id',{count:'exact',head:true}).gte('resolved_at',since),
  ]);
  for(const item of [open,first,resolution,escalated,resolved]) throwIfError(item.error);
  return {openTickets:open.count??0,breachedFirstResponse:first.count??0,breachedResolution:resolution.count??0,escalatedTickets:escalated.count??0,resolvedLast30Days:resolved.count??0};
}
export function getSupportOperatingStatus(hours:SupportOperatingHours,now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:hours.timezone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const weekday=parts.find(x=>x.type==='weekday')?.value??'Mon',h=Number(parts.find(x=>x.type==='hour')?.value??'0'),m=Number(parts.find(x=>x.type==='minute')?.value??'0');
  const days:Record<string,string>={Sun:'0',Mon:'1',Tue:'2',Wed:'3',Thu:'4',Fri:'5',Sat:'6'},day=days[weekday]??'1';
  const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:hours.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now),slot=hours.weekly_schedule[day];
  const minutes=(v:string)=>{const [a,b]=v.split(':').map(Number);return a*60+b;},current=h*60+m;
  return {open:Boolean(slot&&!hours.holidays.includes(localDate)&&current>=minutes(slot.open)&&current<minutes(slot.close)),timezone:hours.timezone,localDate,opensAt:slot?.open??null,closesAt:slot?.close??null};
}
