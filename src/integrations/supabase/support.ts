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
  from(table: 'support_agents' | 'support_tickets' | 'support_messages' | 'knowledgebase_articles'): QueryBuilder;
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