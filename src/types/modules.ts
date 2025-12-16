// Module System Types
export type ModuleId = 
  | 'ott-vod'
  | 'live-streaming'
  | 'virtual-cinema'
  | 'linear-tv'
  | 'short-form'
  | 'ticketing'
  | 'monetization'
  | 'marketplace'
  | 'white-label'
  | 'analytics'
  | 'xr-immersive'
  | 'developer-api';

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
}

// Module definitions
export const MODULE_DEFINITIONS: Module[] = [
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
      'Content recommendations'
    ],
    status: 'stable'
  },
  {
    id: 'live-streaming',
    name: 'Live Streaming',
    description: 'Professional live events, sports, concerts, and conferences',
    icon: 'Radio',
    category: 'streaming',
    isCore: true,
    pricing: { type: 'included', currency: 'USD' },
    features: [
      'RTMP / SRT ingest',
      'OBS & Streamlabs support',
      'Live chat integration',
      'Real-time viewer analytics',
      'Auto-recording',
      'Secure access controls'
    ],
    status: 'stable'
  },
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
      'Festival scheduling',
      'Screening analytics'
    ],
    dependencies: ['live-streaming'],
    status: 'stable'
  },
  {
    id: 'linear-tv',
    name: 'Linear TV / FAST',
    description: '24/7 scheduled channels with EPG and ad insertion',
    icon: 'Tv',
    category: 'content',
    isCore: false,
    pricing: { type: 'addon', basePrice: 149, currency: 'USD' },
    features: [
      'Scheduled playlists',
      '24/7 channels',
      'FAST channels',
      'Electronic Program Guide',
      'SCTE-35 ad insertion',
      'Multi-channel management'
    ],
    status: 'stable'
  },
  {
    id: 'short-form',
    name: 'Short-Form Video',
    description: 'TikTok/Reels-style vertical video platform',
    icon: 'Smartphone',
    category: 'content',
    isCore: false,
    pricing: { type: 'addon', basePrice: 79, currency: 'USD' },
    features: [
      'Vertical video support',
      'Creator tools',
      'Algorithmic feed',
      'Likes, comments, shares',
      'Duet & stitch features',
      'Sound library'
    ],
    status: 'beta'
  },
  {
    id: 'ticketing',
    name: 'Ticketing & Access',
    description: 'Universal ticketing for all content types',
    icon: 'Ticket',
    category: 'commerce',
    isCore: true,
    pricing: { type: 'included', currency: 'USD' },
    features: [
      'Event tickets',
      'VOD access passes',
      'Expiry rules',
      'QR/Token validation',
      'Email delivery',
      'Bulk ticketing'
    ],
    status: 'stable'
  },
  {
    id: 'monetization',
    name: 'Monetization Engine',
    description: 'Complete billing and revenue management',
    icon: 'CreditCard',
    category: 'commerce',
    isCore: true,
    pricing: { type: 'included', currency: 'USD' },
    features: [
      'Subscriptions',
      'One-time payments',
      'Usage-based billing',
      'Revenue splits',
      'Multi-currency',
      'Coupons & promos'
    ],
    status: 'stable'
  },
  {
    id: 'marketplace',
    name: 'Content Marketplace',
    description: 'Buy, sell, and license content',
    icon: 'Store',
    category: 'commerce',
    isCore: false,
    pricing: { type: 'addon', basePrice: 199, currency: 'USD' },
    features: [
      'Content listing',
      'Rights management',
      'Licensing terms',
      'Distributor dashboards',
      'B2B transactions',
      'Contract management'
    ],
    status: 'beta'
  },
  {
    id: 'white-label',
    name: 'White-Label & Enterprise',
    description: 'Full branding control and custom deployments',
    icon: 'Palette',
    category: 'platform',
    isCore: false,
    pricing: { type: 'enterprise', currency: 'USD' },
    features: [
      'Custom branding',
      'Custom domains',
      'Mobile app branding',
      'Email templates',
      'Feature toggles',
      'Custom CSS/themes'
    ],
    status: 'stable'
  },
  {
    id: 'analytics',
    name: 'AI & Analytics',
    description: 'Intelligence layer with recommendations and insights',
    icon: 'BarChart3',
    category: 'platform',
    isCore: true,
    pricing: { type: 'usage-based', usagePrice: 0.001, currency: 'USD' },
    features: [
      'Content recommendations',
      'Engagement analytics',
      'Revenue forecasting',
      'Viewer insights',
      'Piracy detection',
      'Custom reports'
    ],
    status: 'stable'
  },
  {
    id: 'xr-immersive',
    name: 'XR / Immersive',
    description: 'AR, VR, and interactive media experiences',
    icon: 'Glasses',
    category: 'future',
    isCore: false,
    pricing: { type: 'enterprise', currency: 'USD' },
    features: [
      'VR cinemas',
      'Interactive storytelling',
      'Immersive live events',
      '360° video support',
      'Spatial audio',
      'XR device support'
    ],
    status: 'coming-soon'
  },
  {
    id: 'developer-api',
    name: 'Developer Platform',
    description: 'APIs, SDKs, and third-party integrations',
    icon: 'Code2',
    category: 'platform',
    isCore: false,
    pricing: { type: 'usage-based', usagePrice: 0.0001, currency: 'USD' },
    features: [
      'REST & GraphQL APIs',
      'SDKs (JS, iOS, Android)',
      'Webhooks',
      'OAuth integration',
      'Rate limiting',
      'API analytics'
    ],
    status: 'stable'
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
