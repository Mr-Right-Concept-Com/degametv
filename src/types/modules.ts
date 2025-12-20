// Module System Types - 17 JUVUKO Modules (Complete Architecture)
export type ModuleId = 
  | 'ott-vod'           // 1. OTT / VOD
  | 'live-streaming'    // 2. Live Streaming
  | 'virtual-cinema'    // 3. Virtual Cinema / Live-to-Replay
  | 'linear-tv'         // 4. Linear TV / FAST
  | 'short-form'        // 5. Short-Form Video
  | 'ticketing'         // 6. Ticketing & Access
  | 'monetization'      // 7. Monetization & Billing Engine
  | 'marketplace'       // 8. Marketplace & Content Licensing
  | 'white-label'       // 9. White-Label & Enterprise
  | 'analytics'         // 10. AI, Analytics & Intelligence
  | 'xr-immersive'      // 11. XR / Immersive
  | 'developer-api'     // 12. Developer Platform & API
  | 'audio-podcast'     // 13. Audio / Podcast
  | 'cms-media'         // 14. CMS / Media Management
  | 'elearning'         // 15. eLearning / Education
  | 'app-addon'         // 16. App Add-on / Hybrid Deployment
  | 'module-management';// 17. Flexible Module Management (Meta)

export interface Module {
  id: ModuleId;
  name: string;
  description: string;
  icon: string;
  category: 'content' | 'streaming' | 'commerce' | 'platform' | 'future' | 'core';
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
  status: 'active' | 'suspended' | 'trial' | 'pending' | 'provisioning';
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

// 17 Module Definitions - JUVUKO Architecture
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
  
  // === 6. TICKETING & ACCESS MODULE ===
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
    hasEndUser: true,
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
    hasEndUser: true,
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
    hasEndUser: false,
    hasPublicPages: false
  },
  
  // === 13. AUDIO / PODCAST MODULE ===
  {
    id: 'audio-podcast',
    name: 'Audio / Podcast',
    description: 'Music, podcasts, audiobooks with offline downloads',
    icon: 'Headphones',
    category: 'content',
    isCore: false,
    pricing: { type: 'addon', basePrice: 69, currency: 'USD' },
    features: [
      'Podcast hosting',
      'Music streaming',
      'Audiobook support',
      'Offline downloads',
      'Multi-language',
      'AI recommendations',
      'Creator dashboards',
      'Royalty management'
    ],
    status: 'stable',
    trialDays: 14,
    hasPlatformAdmin: true,
    hasEndUser: true,
    hasPublicPages: true
  },
  
  // === 14. CMS / MEDIA MANAGEMENT MODULE (Core) ===
  {
    id: 'cms-media',
    name: 'CMS / Media Management',
    description: 'Universal media library feeding all modules',
    icon: 'Database',
    category: 'core',
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
    status: 'stable',
    hasPlatformAdmin: true,
    hasEndUser: false,
    hasPublicPages: false
  },
  
  // === 15. ELEARNING / EDUCATION MODULE ===
  {
    id: 'elearning',
    name: 'eLearning / Education',
    description: 'Live & on-demand courses with quizzes and certificates',
    icon: 'GraduationCap',
    category: 'content',
    isCore: false,
    pricing: { type: 'addon', basePrice: 129, currency: 'USD' },
    features: [
      'Live & On-Demand courses',
      'Quizzes & assignments',
      'Gamification & badges',
      'Progress tracking',
      'Certificates',
      'AI-driven recommendations',
      'Discussion forums',
      'Collaboration tools'
    ],
    status: 'stable',
    trialDays: 14,
    hasPlatformAdmin: true,
    hasEndUser: true,
    hasPublicPages: true
  },
  
  // === 16. APP ADD-ON / HYBRID DEPLOYMENT MODULE ===
  {
    id: 'app-addon',
    name: 'App Add-on',
    description: 'iOS, Android, Desktop apps with tenant branding',
    icon: 'Smartphone',
    category: 'platform',
    isCore: false,
    pricing: { type: 'addon', basePrice: 299, currency: 'USD' },
    features: [
      'iOS app deployment',
      'Android app deployment',
      'Desktop (Tauri/Electron)',
      'PWA support',
      'Self-service guides',
      'Managed store uploads',
      'Automatic updates',
      'Tenant branding preserved'
    ],
    status: 'stable',
    hasPlatformAdmin: true,
    hasEndUser: true,
    hasPublicPages: false
  },
  
  // === 17. FLEXIBLE MODULE MANAGEMENT (Meta-Module) ===
  {
    id: 'module-management',
    name: 'Module Management',
    description: 'Add/remove modules anytime with auto-billing updates',
    icon: 'Settings',
    category: 'core',
    isCore: true,
    pricing: { type: 'included', currency: 'USD' },
    features: [
      'Add modules anytime',
      'Remove modules anytime',
      'Auto UI updates',
      'Auto billing updates',
      'Prorated billing',
      'Multi-currency support',
      'Trial per module',
      'Spin-off ready'
    ],
    status: 'stable',
    hasPlatformAdmin: true,
    hasEndUser: false,
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

export const getContentModules = (): Module[] =>
  MODULE_DEFINITIONS.filter(m => m.category === 'content' || m.category === 'streaming');

export const getCommerceModules = (): Module[] =>
  MODULE_DEFINITIONS.filter(m => m.category === 'commerce');

export const getPlatformModules = (): Module[] =>
  MODULE_DEFINITIONS.filter(m => m.category === 'platform' || m.category === 'core');
