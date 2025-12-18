// Module System Types - 17 Core Modules
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
  | 'developer-api'
  | 'audio-podcast'
  | 'cms-media'
  | 'elearning'
  | 'app-addon'
  | 'module-manager';

export interface Module {
  id: ModuleId;
  name: string;
  description: string;
  icon: string;
  category: 'content' | 'streaming' | 'commerce' | 'platform' | 'future' | 'infrastructure';
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

// Module definitions - 17 Core Modules
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
      'AI recommendations & search',
      'Multi-language audio & subtitles',
      'Adaptive streaming',
      'Parental controls'
    ],
    status: 'stable',
    trialDays: 14
  },
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
      'Multi-camera switching',
      'Live chat & polls',
      'Real-time viewer analytics',
      'Geo-fencing & secure access',
      'Auto-recording → replay',
      'AI moderation & auto-captioning',
      'Virtual gifts'
    ],
    status: 'stable',
    trialDays: 14
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
    status: 'stable',
    trialDays: 7
  },
  {
    id: 'linear-tv',
    name: 'Linear TV / FAST',
    description: '24/7 scheduled channels with EPG, cloud DVR, and dynamic ads',
    icon: 'Tv',
    category: 'content',
    isCore: false,
    pricing: { type: 'addon', basePrice: 149, currency: 'USD' },
    features: [
      'Scheduled playlists',
      '24/7 channels',
      'FAST channels',
      'Electronic Program Guide',
      'Dynamic ad insertion',
      'Cloud DVR',
      'Hybrid live + VOD'
    ],
    status: 'stable',
    trialDays: 7
  },
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
      'Creator tools',
      'Likes, comments, shares',
      'Remix / stitch / duet',
      'Trends & challenges',
      'Virtual gifts / coins'
    ],
    status: 'beta',
    trialDays: 7
  },
  {
    id: 'audio-podcast',
    name: 'Audio / Podcast',
    description: 'Music, podcasts, and audiobooks with creator dashboards',
    icon: 'Headphones',
    category: 'content',
    isCore: false,
    pricing: { type: 'addon', basePrice: 69, currency: 'USD' },
    features: [
      'Music streaming',
      'Podcast hosting',
      'Audiobooks',
      'Offline downloads',
      'Multi-language support',
      'AI recommendations',
      'Creator dashboards',
      'Royalty management'
    ],
    status: 'stable',
    trialDays: 7
  },
  {
    id: 'ticketing',
    name: 'Ticketing & Access',
    description: 'Universal ticketing for live, replay, VOD, and eLearning',
    icon: 'Ticket',
    category: 'commerce',
    isCore: true,
    pricing: { type: 'included', currency: 'USD' },
    features: [
      'Live event tickets',
      'Replay access passes',
      'VOD access tickets',
      'eLearning course tickets',
      'Expiry rules',
      'QR/Token validation',
      'Email delivery',
      'Platform commission'
    ],
    status: 'stable'
  },
  {
    id: 'monetization',
    name: 'Monetization Engine',
    description: 'Complete billing with auto-trial and dynamic module billing',
    icon: 'CreditCard',
    category: 'commerce',
    isCore: true,
    pricing: { type: 'included', currency: 'USD' },
    features: [
      'Subscriptions',
      'One-time payments',
      'Usage-based billing',
      'Revenue splits (Platform/Tenant/Creator)',
      'Multi-currency',
      'Coupons & promos',
      'Auto-trial → auto-payment',
      'Dynamic module billing'
    ],
    status: 'stable'
  },
  {
    id: 'marketplace',
    name: 'Content Marketplace',
    description: 'Buy, sell, and license content with royalty tracking',
    icon: 'Store',
    category: 'commerce',
    isCore: false,
    pricing: { type: 'addon', basePrice: 199, currency: 'USD' },
    features: [
      'Content listing',
      'Rights management',
      'Licensing contracts',
      'Distributor dashboards',
      'Syndication',
      'Royalty tracking',
      'B2B transactions'
    ],
    status: 'beta',
    trialDays: 14
  },
  {
    id: 'cms-media',
    name: 'CMS / Media Management',
    description: 'Universal library with transcoding, AI tagging, and workflow automation',
    icon: 'FolderOpen',
    category: 'infrastructure',
    isCore: true,
    pricing: { type: 'included', currency: 'USD' },
    features: [
      'Universal content library',
      'Transcoding & adaptive streaming',
      'AI tagging & metadata',
      'Rights & DRM management',
      'Workflow automation',
      'Multi-language & subtitles',
      'Engagement analytics',
      'API access for all modules'
    ],
    status: 'stable'
  },
  {
    id: 'elearning',
    name: 'eLearning / Education',
    description: 'Live & on-demand courses with quizzes, certificates, and gamification',
    icon: 'GraduationCap',
    category: 'content',
    isCore: false,
    pricing: { type: 'addon', basePrice: 129, currency: 'USD' },
    features: [
      'Live & on-demand courses',
      'Quizzes & assignments',
      'Gamification & badges',
      'Progress tracking',
      'Certificates',
      'AI-driven recommendations',
      'Discussion forums',
      'Collaboration tools'
    ],
    status: 'stable',
    trialDays: 14
  },
  {
    id: 'white-label',
    name: 'White-Label & Enterprise',
    description: 'Full branding control with custom domains and deployments',
    icon: 'Palette',
    category: 'platform',
    isCore: false,
    pricing: { type: 'enterprise', currency: 'USD' },
    features: [
      'Custom branding (logo, colors, fonts)',
      'Custom domains',
      'Mobile app branding',
      'Email templates',
      'Feature toggles per tenant',
      'Enterprise contracts',
      'Setup services'
    ],
    status: 'stable'
  },
  {
    id: 'analytics',
    name: 'AI & Analytics',
    description: 'Cross-module analytics with predictive AI and recommendations',
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
      'Cross-module analytics',
      'Predictive AI',
      'Custom reports'
    ],
    status: 'stable'
  },
  {
    id: 'xr-immersive',
    name: 'XR / Immersive',
    description: 'AR, VR, 360° video, and gamified experiences',
    icon: 'Glasses',
    category: 'future',
    isCore: false,
    pricing: { type: 'enterprise', currency: 'USD' },
    features: [
      'VR cinemas',
      'AR/VR interactive storytelling',
      '360° video support',
      'Gamified experiences',
      'Future hardware (AR glasses, metaverse)',
      'Spatial audio'
    ],
    status: 'coming-soon'
  },
  {
    id: 'developer-api',
    name: 'Developer Platform',
    description: 'REST & GraphQL APIs with SDKs and plugin marketplace',
    icon: 'Code2',
    category: 'platform',
    isCore: false,
    pricing: { type: 'usage-based', usagePrice: 0.0001, currency: 'USD' },
    features: [
      'REST & GraphQL APIs',
      'SDKs: Web, iOS, Android, TV, XR',
      'Webhooks',
      'Third-party integrations',
      'Plugin marketplace',
      'OAuth integration',
      'Rate limiting'
    ],
    status: 'stable',
    trialDays: 30
  },
  {
    id: 'app-addon',
    name: 'App Add-On / Hybrid',
    description: 'iOS, Android, Desktop, and PWA deployment with managed services',
    icon: 'TabletSmartphone',
    category: 'infrastructure',
    isCore: false,
    pricing: { type: 'addon', basePrice: 299, currency: 'USD' },
    features: [
      'iOS app generation',
      'Android app generation',
      'Desktop (Tauri/Electron)',
      'PWA-ready',
      'Self-service: ready-to-use files + guides',
      'Managed: store upload & updates',
      'Tenant branding preserved'
    ],
    status: 'beta'
  },
  {
    id: 'module-manager',
    name: 'Flexible Module Management',
    description: 'Add or remove modules anytime with auto-integration and billing',
    icon: 'Settings2',
    category: 'infrastructure',
    isCore: true,
    pricing: { type: 'included', currency: 'USD' },
    features: [
      'Add/remove modules anytime',
      'Auto-integration (admin, user, frontend)',
      'Prorated billing',
      'Free trial for new modules',
      'Autopilot compatible',
      'Unified system sync'
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

export const getModulesByStatus = (status: Module['status']): Module[] =>
  MODULE_DEFINITIONS.filter(m => m.status === status);
