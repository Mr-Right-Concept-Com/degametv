export type AppRole = 'super_admin' | 'platform_admin' | 'licensee_admin' | 'creator' | 'moderator' | 'viewer';
export type TenantType = 'platform' | 'licensee' | 'creator';
export type ContentType = 'movie' | 'series' | 'episode' | 'trailer' | 'short' | 'live' | 'vod' | 'channel';
export type MonetizationType = 'free' | 'svod' | 'tvod' | 'avod' | 'ppv' | 'ticket';
export type ContentStatus = 'draft' | 'processing' | 'published' | 'scheduled' | 'archived' | 'deleted';
export type StreamStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'paused' | 'trial';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type TicketType = 'live' | 'replay' | 'combo' | 'screening';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  displayName?: string;
  avatarUrl?: string;
  role?: AppRole;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  ownerId?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  settings?: Record<string, unknown>;
  features?: Record<string, boolean>;
  cdnConfig?: Record<string, unknown>;
  paymentConfig?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Content {
  id: string;
  tenantId: string;
  creatorId?: string;
  title: string;
  slug: string;
  description?: string;
  type: ContentType;
  status: ContentStatus;
  thumbnailUrl?: string;
  posterUrl?: string;
  bannerUrl?: string;
  videoUrl?: string;
  trailerUrl?: string;
  duration?: number;
  releaseDate?: string;
  genres?: string[];
  tags?: string[];
  castCrew?: Array<{ name: string; role: string; imageUrl?: string }>;
  metadata?: Record<string, unknown>;
  monetization: MonetizationType;
  price?: number;
  currency?: string;
  availabilityStart?: string;
  availabilityEnd?: string;
  viewCount?: number;
  likeCount?: number;
  rating?: number;
  isFeatured?: boolean;
  isDrmProtected?: boolean;
  parentId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LiveStream {
  id: string;
  tenantId: string;
  creatorId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  streamKey: string;
  rtmpUrl?: string;
  playbackUrl?: string;
  status: StreamStatus;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  viewerCount?: number;
  peakViewers?: number;
  monetization: MonetizationType;
  ticketPrice?: number;
  currency?: string;
  isTicketed?: boolean;
  recordingEnabled?: boolean;
  recordingUrl?: string;
  chatEnabled?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  streamUrl?: string;
  epgUrl?: string;
  isLive?: boolean;
  category?: string;
  monetization: MonetizationType;
  isActive: boolean;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: 'week' | 'month' | 'year';
  features?: string[];
  isActive: boolean;
  sortOrder?: number;
  stripePriceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  tenantId?: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt?: string;
  cancelledAt?: string;
  stripeSubscriptionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  userId: string;
  tenantId: string;
  contentId?: string;
  streamId?: string;
  ticketType: TicketType;
  ticketCode: string;
  price: number;
  currency: string;
  validFrom: string;
  validUntil: string;
  isUsed: boolean;
  usedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AnalyticsData {
  totalViews: number;
  totalRevenue: number;
  activeSubscribers: number;
  liveViewers: number;
  contentCount: number;
  growthPercentage: number;
}
