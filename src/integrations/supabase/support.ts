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
type QueryResult = { data: unknown; error: unknown };
interface QueryBuilder extends PromiseLike<QueryResult> {
  select(columns: string): QueryBuilder;
  insert(values: Record<string, unknown>): QueryBuilder;
  upsert(values: Record<string, unknown>, options?: { onConflict?: string }): QueryBuilder;
  update(values: Record<string, unknown>): QueryBuilder;
  eq(column: string, value: string | boolean): QueryBuilder;
  is(column: string, value: null): QueryBuilder;
  in(column: string, values: string[]): QueryBuilder;
  not(column: string, operator: string, value: null): QueryBuilder;
  order(column: string, options: { ascending: boolean }): QueryBuilder;
  limit(count: number): QueryBuilder;
  maybeSingle(): Promise<QueryResult>;
  single(): Promise<QueryResult>;
}
interface SupportClient {
  from(table: 'support_agents' | 'support_tickets' | 'support_messages' | 'knowledgebase_articles' | 'knowledgebase_categories' | 'support_sla_policies'): QueryBuilder;
  rpc(name: 'create_support_chat' | 'reopen_support_ticket' | 'rate_support_ticket', args?: Record<string, unknown>): Promise<QueryResult>;
}
const client = supabase as unknown as SupportClient;

function throwIfError(error: unknown): void {
  if (error == null) return;
  const parsed = ErrorSchema.safeParse(error);
  throw new Error(parsed.success ? parsed.data.message : 'Support service request failed.');
}
function parseRows<T>(schema: z.ZodType<T>, value: unknown): T[] {
  return z.array(schema).parse(value ?? []);
}
function parseOne<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(value);
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
