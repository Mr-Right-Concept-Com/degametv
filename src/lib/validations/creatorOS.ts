import { z } from "zod";

export const CREATOR_ENTITY_TYPES = ["INDIVIDUAL_CREATOR","STUDIO","PRODUCTION_COMPANY","BUSINESS"] as const;
export const CREATOR_VERIFICATION_STATES = ["DRAFT","SUBMITTED","UNDER_REVIEW","ADDITIONAL_INFO_REQUIRED","APPROVED","REJECTED","SUSPENDED","APPEAL_PENDING"] as const;
export const CONTENT_FORMATS = ["FILM","SERIES","SEASON","EPISODE","SHORT","TRAILER","MUSIC_VIDEO","PODCAST","GAMING","SPORTS","EDUCATIONAL","VOD","LIVE_PRODUCTION","RECORDED_EVENT","REPLAY"] as const;
export const STUDIO_ROLES = ["OWNER","ADMIN","PRODUCER","BROADCASTER","FINANCE_VIEWER","MODERATOR"] as const;

const common = {
  title: z.string().trim().min(2).max(180),
  synopsis: z.string().trim().max(5000).optional().default(""),
  logline: z.string().trim().max(500).optional().default(""),
  posterUrl: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(40).default([]),
  genres: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  originalLanguage: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/).optional(),
  productionCountry: z.string().regex(/^[A-Z]{2}$/).optional(),
};
const formatSchema = <T extends z.ZodRawShape>(format: typeof CONTENT_FORMATS[number], shape: T) =>
  z.object({ format: z.literal(format), ...common, ...shape }).strict();

export const creatorContentSchema = z.discriminatedUnion("format", [
  formatSchema("FILM",{ runtimeMinutes:z.number().int().positive().max(1000), releaseYear:z.number().int().min(1888).max(2200).optional() }),
  formatSchema("SERIES",{ seasons:z.number().int().positive().max(100).optional(), releaseYear:z.number().int().min(1888).max(2200).optional() }),
  formatSchema("SEASON",{ seriesContentId:z.string().uuid(), seasonNumber:z.number().int().positive().max(100) }),
  formatSchema("EPISODE",{ seriesContentId:z.string().uuid(), seasonNumber:z.number().int().positive(), episodeNumber:z.number().int().positive(), runtimeMinutes:z.number().int().positive().max(1000) }),
  formatSchema("SHORT",{ runtimeMinutes:z.number().int().positive().max(60) }),
  formatSchema("TRAILER",{ parentContentId:z.string().uuid().optional(), runtimeMinutes:z.number().int().positive().max(30) }),
  formatSchema("MUSIC_VIDEO",{ runtimeMinutes:z.number().int().positive().max(180), artist:z.string().trim().min(1).max(180) }),
  formatSchema("PODCAST",{ episodeNumber:z.number().int().positive().optional(), seasonNumber:z.number().int().positive().optional(), runtimeMinutes:z.number().int().positive().max(1440) }),
  formatSchema("GAMING",{ gameTitle:z.string().trim().min(1).max(180), runtimeMinutes:z.number().int().positive().max(1440) }),
  formatSchema("SPORTS",{ sport:z.string().trim().min(1).max(100), competition:z.string().trim().max(180).optional(), runtimeMinutes:z.number().int().positive().max(1440) }),
  formatSchema("EDUCATIONAL",{ subject:z.string().trim().min(1).max(180), learningLevel:z.string().trim().max(100).optional(), runtimeMinutes:z.number().int().positive().max(1440) }),
  formatSchema("VOD",{ runtimeMinutes:z.number().int().positive().max(1440) }),
  formatSchema("LIVE_PRODUCTION",{ eventFormat:z.enum(["PREMIERE","LIVE_SHOW","CONCERT","CONFERENCE","SCREENING","OTHER"]), scheduledAt:z.string().datetime().optional() }),
  formatSchema("RECORDED_EVENT",{ eventFormat:z.string().trim().min(1).max(100), recordedAt:z.string().datetime().optional() }),
  formatSchema("REPLAY",{ sourceContentId:z.string().uuid(), runtimeMinutes:z.number().int().positive().max(1440) }),
]);

export const baseCurrencyPricingSchema = z.object({
  amount: z.number().finite().min(0).max(1_000_000_000),
  currency: z.string().regex(/^[A-Z]{3}$/),
  replayAmount: z.number().finite().min(0).max(1_000_000_000).optional(),
}).strict();

export const rightsDeclarationSchema = z.object({
  ownershipType: z.enum(["SOLE_OWNER","CO_OWNED","LICENSED","PUBLIC_DOMAIN","COMMISSIONED"]),
  rightsHolder: z.string().trim().min(2).max(240),
  territories: z.array(z.string().regex(/^[A-Z]{2}$/)).max(248),
  exclusivity: z.enum(["EXCLUSIVE","NON_EXCLUSIVE"]),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  evidenceReferences: z.array(z.string().uuid()).max(50).default([]),
  attested: z.literal(true),
}).strict().refine(v => !v.startDate || !v.endDate || v.endDate >= v.startDate,{message:"Rights end date must not precede start date."});

export const creatorApplicationSchema = z.object({
  entityType:z.enum(CREATOR_ENTITY_TYPES),
  displayName:z.string().trim().min(2).max(180),
  legalName:z.string().trim().min(2).max(240),
  countryCode:z.string().regex(/^[A-Z]{2}$/),
  baseCurrency:z.string().regex(/^[A-Z]{3}$/),
  bio:z.string().trim().max(4000).optional(),
  rightsDeclaration:z.object({ownershipType:z.string().min(1),rightsHolder:z.string().min(2),attested:z.literal(true)}).passthrough(),
  taxIdentifier:z.string().trim().min(4).max(64).optional(),
  bankAccountNumber:z.string().trim().min(4).max(34).optional(),
  bankName:z.string().trim().min(2).max(180).optional(),
  bankCountry:z.string().regex(/^[A-Z]{2}$/).optional(),
  bankAccountName:z.string().trim().min(2).max(180).optional(),
}).strict().superRefine((v,ctx)=>{
  if(v.entityType!=="INDIVIDUAL_CREATOR" && !v.legalName) ctx.addIssue({code:"custom",path:["legalName"],message:"Legal entity name is required."});
});

export const domainSlugSchema = z.string().trim().toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)
  .refine(v=>!["api","admin","studio","watch","app","cdn","auth","www","mail","support","status","checkout","billing"].includes(v),"This hostname is reserved.");

export type CreatorContentInput = z.infer<typeof creatorContentSchema>;
export type CreatorApplicationInput = z.infer<typeof creatorApplicationSchema>;
