// Module System Types - 12 Core Modules (Strict Architecture)
export type ModuleId = 
  | 'ott-vod'           // 1. OTT / VOD
  | 'live-streaming'    // 2. Live Streaming
  | 'virtual-cinema'    // 3. Virtual Cinema / Live-to-Replay
  | 'linear-tv'         // 4. Linear TV / FAST
  | 'short-form'        // 5. Short-Form Video
  | 'ticketing'         // 6. Ticketing & Access (Shared)
  | 'monetization'      // 7. Monetization & Billing Engine
  | 'marketplace'       // 8. Marketplace & Content Licensing
  | 'white-label'       // 9. White-Label & Enterprise
  | 'analytics'         // 10. AI, Analytics & Intelligence
  | 'xr-immersive'      // 11. XR / Immersive
  | 'developer-api';    // 12. Developer Platform & API

export interface Module {
  id: ModuleId;
  name: string;
  description: string;
  icon: string;
  category: 'content' | 'streaming' | 'commerce' | 'platform' | 'future';
  isCore: boolean;
  pricing: {
    type: 'included' | 'addon' | 'usage-based' | 'enterprise';
    basePrice?: number;
    usagePrice?: number;
    currency: string;
  };
  features: string[];
  dependencies?: ModuleId[];
  status: 'stable' | 'beta' | 'coming-soon';
  trialDays?: number;
  // Module surfaces
  hasPlatformAdmin: boolean;
  hasEndUser: boolean;
  hasPublicPages: boolean;
}

export interface TenantModule {
  moduleId: ModuleId;
  enabled: boolean;
  enabledAt?: string;
  disabledAt?: string;
  config?: Record<string, unknown>;
  usage?: {
    current: number;
    limit: number;
    period: 'daily' | 'monthly' | 'yearly';
  };
  trialEndsAt?: string;
  billingStatus?: 'trial' | 'active' | 'past_due' | 'cancelled';
}

export interface TenantBranding {
  logo?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily?: string;
  customCSS?: string;
}

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  branding: TenantBranding;
  modules: TenantModule[];
  status: 'active' | 'suspended' | 'trial' | 'pending';
  plan: 'starter' | 'professional' | 'enterprise' | 'custom';
  billingEmail?: string;
  createdAt: string;
  updatedAt: string;
  trialEndsAt?: string;
  selfService: boolean;
  autopilot: boolean;
}

// Platform-wide settings
export interface PlatformSettings {
  platformName: string;
  platformLogo?: string;
  defaultModules: ModuleId[];
  availableModules: Module[];
  revenueSplit: {
    platform: number;
    tenant: number;
    creator: number;
  };
  supportedPaymentProviders: string[];
  supportedCDNProviders: string[];
  defaultTrialDays: number;
  autopilotEnabled: boolean;
}

// 12 Module Definitions - Strict Architecture
export const MODULE_DEFINITIONS: Module[] = [
  // === 1. OTT / VOD MODULE ===
  {
    id: 'ott-vod',
    name: 'OTT / VOD',
    description: 'Netflix-like on-demand streaming with SVOD, TVOD, and AVOD monetization',
    icon: 'Film',
    category: 'content',
    isCore: true,
    pricing: { type: 'included', currency: 'USD' },
    features: [
      'Movies & Series library',
      'SVOD / TVOD / AVOD monetization',
      'Watch history & continue watching',
      'Multi-profile support',
      'Offline downloads (apps)',
      'AI recommendations & search',
      'DRM & geo-blocking',
      'Parental controls'
    ],
    status: 'stable',
    trialDays: 14,
    hasPlatformAdmin: true,
    hasEndUser: true,
    hasPublicPages: true
  },
  
  // === 2. LIVE STREAMING MODULE ===
  {
    id: 'live-streaming',
    name: 'Live Streaming',
    description: 'Professional live events with multi-camera, chat, and analytics',
    icon: 'Radio',
    category: 'streaming',
    isCore: true,
    pricing: { type: 'included', currency: 'USD' },
    features: [
      'RTMP / SRT / WebRTC ingest',
      'Stream key management',
      'Live chat & polls',
      'Ticket pricing & access rules',
      'Real-time viewer analytics',
      'Chat moderation',
      'Auto-recording → replay'
    ],
    status: 'stable',
    trialDays: 14,
    hasPlatformAdmin: true,
    hasEndUser: true,
    hasPublicPages: true
  },
  
  // === 3. VIRTUAL CINEMA / LIVE-TO-REPLAY MODULE ===
  {
    id: 'virtual-cinema',
    name: 'Virtual Cinema',
    description: 'Secure digital cinema & festival screenings with live-to-replay',
    icon: 'Clapperboard',
    category: 'streaming',
    isCore: false,
    pricing: { type: 'addon', basePrice: 99, currency: 'USD' },
    features: [
      'Ticketed live premieres',
      'Live → Replay conversion',
      'Custom replay windows',
      'DRM-protected playback',
      'Festival & lineup scheduling',
      'Screening analytics',
      'Revenue splits'
    ],
    dependencies: ['live-streaming'],
    status: 'stable',
    trialDays: 7,
    hasPlatformAdmin: true,
    hasEndUser: true,
    hasPublicPages: true
  },
  
  // === 4. LINEAR TV / FAST CHANNEL MODULE ===
  {
    id: 'linear-tv',
    name: 'Linear TV / FAST',
    description: '24/7 scheduled channels with EPG, cloud DVR, and dynamic ads',
    icon: 'Tv',
    category: 'content',
    isCore: false,
    pricing: { type: 'addon', basePrice: 149, currency: 'USD' },
    features: [
      'Channel creation',
      'Playlist scheduling',
      'Electronic Program Guide (EPG)',
      'Dynamic ad insertion',
      'Cloud DVR',
      'Ad-supported viewing'
    ],
    status: 'stable',
    trialDays: 7,
    hasPlatformAdmin: true,
    hasEndUser: true,
    hasPublicPages: true
  },
  
  // === 5. SHORT-FORM VIDEO MODULE ===
  {
    id: 'short-form',
    name: 'Short-Form Video',
    description: 'TikTok/Reels-style vertical video with AI feed ranking',
    icon: 'Smartphone',
    category: 'content',
    isCore: false,
    pricing: { type: 'addon', basePrice: 79, currency: 'USD' },
    features: [
      'Vertical video support',
      'AI feed ranking',
      'Creator approvals & moderation',
      'Likes, comments, shares',
      'Follow creators',
      'Virtual gifts / coins',
      'Trends & challenges'
    ],
    status: 'beta',
    trialDays: 7,
    hasPlatformAdmin: true,
    hasEndUser: true,
    hasPublicPages: true
  },
  
  // === 6. TICKETING & ACCESS MODULE (Shared) ===
  {
    id: 'ticketing',
    name: 'Ticketing & Access',
    description: 'Universal ticketing for live, replay, VOD, and eLearning',
    icon: 'Ticket',
    category: 'commerce',
    isCore: true,
    pricing: { type: 'included', currency: 'USD' },
    features: [
      'Ticket types management',
      'Expiry rules',
      'Access control',
      'QR/Token validation',
      'Checkout flow',
      'Ticket wallet',
      'Email delivery'
    ],
    status: 'stable',
    hasPlatformAdmin: true,
    hasEndUser: true,
    hasPublicPages: false
  },
  
  // === 7. MONETIZATION & BILLING ENGINE ===
  {
    id: 'monetization',
    name: 'Monetization Engine',
    description: 'Complete billing with auto-trial and dynamic module billing',
    icon: 'CreditCard',
    category: 'commerce',
    isCore: true,
    pricing: { type: 'included', currency: 'USD' },
    features: [
      'Pricing models',
      'Revenue splits (Platform/Tenant/Creator)',
      'Subscriptions & one-time payments',
      'Coupons & promos',
      'Invoices & payouts',
      'Multi-currency',
      'Checkout & payment history'
    ],
    status: 'stable',
    hasPlatformAdmin: true,
    hasEndUser: true,
    hasPublicPages: false
  },
  
  // === 8. MARKETPLACE & CONTENT LICENSING MODULE ===
  {
    id: 'marketplace',
    name: 'Content Marketplace',
    description: 'Buy, sell, and license content with royalty tracking',
    icon: 'Store',
    category: 'commerce',
    isCore: false,
    pricing: { type: 'addon', basePrice: 199, currency: 'USD' },
    features: [
      'Content listings',
      'Licensing terms & contracts',
      'Rights management',
      'Deal tracking',
      'Browse & purchase',
      'Creator dashboards',
      'B2B transactions'
    ],
    status: 'beta',
    trialDays: 14,
    hasPlatformAdmin: true,
    hasEndUser: true,
    hasPublicPages: true
  },
  
  // === 9. WHITE-LABEL & ENTERPRISE MODULE ===
  {
    id: 'white-label',
    name: 'White-Label & Enterprise',
    description: 'Full branding control with custom domains and deployments',
    icon: 'Palette',
    category: 'platform',
    isCore: false,
    pricing: { type: 'enterprise', currency: 'USD' },
    features: [
      'Branding controls (logo, colors, fonts)',
      'Custom domains',
      'App configuration',
      'Feature toggles',
      'Email templates',
      'Fully branded experience'
    ],
    status: 'stable',
    hasPlatformAdmin: true,
    hasEndUser: true, // Fully branded end-user experience
    hasPublicPages: false
  },
  
  // === 10. AI, ANALYTICS & INTELLIGENCE MODULE ===
  {
    id: 'analytics',
    name: 'AI & Analytics',
    description: 'Cross-module analytics with predictive AI and recommendations',
    icon: 'BarChart3',
    category: 'platform',
    isCore: true,
    pricing: { type: 'usage-based', usagePrice: 0.001, currency: 'USD' },
    features: [
      'Dashboards & insights',
      'Predictions & forecasting',
      'Content recommendations',
      'Engagement analytics',
      'Revenue forecasting',
      'Viewer insights',
      'Personalized discovery'
    ],
    status: 'stable',
    hasPlatformAdmin: true,
    hasEndUser: true, // Personalized recommendations
    hasPublicPages: false
  },
  
  // === 11. XR / IMMERSIVE MODULE ===
  {
    id: 'xr-immersive',
    name: 'XR / Immersive',
    description: 'AR, VR, 360° video, and gamified experiences',
    icon: 'Glasses',
    category: 'future',
    isCore: false,
    pricing: { type: 'enterprise', currency: 'USD' },
    features: [
      'Experience setup',
      'Hardware rules',
      'Pricing configuration',
      'VR/AR playback',
      '360° video support',
      'Interactive experiences'
    ],
    status: 'coming-soon',
    hasPlatformAdmin: true,
    hasEndUser: true,
    hasPublicPages: false
  },
  
  // === 12. DEVELOPER PLATFORM & API MODULE ===
  {
    id: 'developer-api',
    name: 'Developer Platform',
    description: 'REST & GraphQL APIs with SDKs and plugin marketplace',
    icon: 'Code2',
    category: 'platform',
    isCore: false,
    pricing: { type: 'usage-based', usagePrice: 0.0001, currency: 'USD' },
    features: [
      'API keys management',
      'REST & GraphQL APIs',
      'Webhooks',
      'SDK access (Web, iOS, Android)',
      'Usage metrics',
      'Third-party integrations'
    ],
    status: 'stable',
    trialDays: 30,
    hasPlatformAdmin: true,
    hasEndUser: false, // Developers are not viewers
    hasPublicPages: false
  }
];

export const getModuleById = (id: ModuleId): Module | undefined => 
  MODULE_DEFINITIONS.find(m => m.id === id);

export const getModulesByCategory = (category: Module['category']): Module[] =>
  MODULE_DEFINITIONS.filter(m => m.category === category);

export const getCoreModules = (): Module[] =>
  MODULE_DEFINITIONS.filter(m => m.isCore);

export const getAddonModules = (): Module[] =>
  MODULE_DEFINITIONS.filter(m => !m.isCore);

export const getModulesByStatus = (status: Module['status']): Module[] =>
  MODULE_DEFINITIONS.filter(m => m.status === status);

export const getModulesWithPlatformAdmin = (): Module[] =>
  MODULE_DEFINITIONS.filter(m => m.hasPlatformAdmin);

export const getModulesWithEndUser = (): Module[] =>
  MODULE_DEFINITIONS.filter(m => m.hasEndUser);
