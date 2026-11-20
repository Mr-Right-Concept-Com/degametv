import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PlatformBranding = {
  platformName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: string;
  customDomain: string;
  supportEmail: string;
  logoUrl: string;
  faviconUrl: string;
};

const defaults: PlatformBranding = {
  platformName: 'DeGameTV',
  tagline: 'Your cinema. Your premiere.',
  primaryColor: '#ed1c18',
  secondaryColor: '#171717',
  accentColor: '#ffffff',
  backgroundColor: '#080808',
  fontFamily: 'Inter',
  customDomain: '',
  supportEmail: '',
  logoUrl: '/brand/degametv-lockup.svg',
  faviconUrl: '/brand/degametv-icon.svg',
};

const Context = createContext<PlatformBranding>(defaults);
const colorPattern = /^#[0-9a-f]{6}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hostnamePattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeText(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
    ? value.trim()
    : fallback;
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && colorPattern.test(value) ? value : fallback;
}

function safeAssetUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.length > 2048) return fallback;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function parseBranding(value: unknown): PlatformBranding {
  if (!isRecord(value)) return defaults;
  const customDomain = typeof value.customDomain === 'string' &&
    hostnamePattern.test(value.customDomain.trim().toLowerCase())
    ? value.customDomain.trim().toLowerCase()
    : '';
  const supportEmail = typeof value.supportEmail === 'string' &&
    value.supportEmail.length <= 254 && emailPattern.test(value.supportEmail.trim())
    ? value.supportEmail.trim()
    : '';

  return {
    platformName: safeText(value.platformName, defaults.platformName, 80),
    tagline: safeText(value.tagline, defaults.tagline, 180),
    primaryColor: safeColor(value.primaryColor, defaults.primaryColor),
    secondaryColor: safeColor(value.secondaryColor, defaults.secondaryColor),
    accentColor: safeColor(value.accentColor, defaults.accentColor),
    backgroundColor: safeColor(value.backgroundColor, defaults.backgroundColor),
    fontFamily: safeText(value.fontFamily, defaults.fontFamily, 80).replace(/[;{}]/g, ''),
    customDomain,
    supportEmail,
    logoUrl: safeAssetUrl(value.logoUrl, defaults.logoUrl),
    faviconUrl: safeAssetUrl(value.faviconUrl, defaults.faviconUrl),
  };
}

function hsl(hex: string): string {
  const raw = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(raw)) return '0 0% 0%';
  const n = Number.parseInt(raw, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case r: hue = (g - b) / delta + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / delta + 2; break;
      default: hue = (r - g) / delta + 4;
    }
    hue /= 6;
  }

  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<PlatformBranding>(defaults);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    const load = async () => {
      const currentRequest = ++requestId;
      try {
        const { data: registry, error: registryError } = await supabase
          .from('platform_branding_registry')
          .select('brand_config')
          .eq('brand_key', 'platform.default')
          .eq('is_public', true)
          .maybeSingle();

        if (registryError) throw registryError;
        if (!active || currentRequest !== requestId) return;
        if (registry?.brand_config) {
          setBrand(parseBranding(registry.brand_config));
          return;
        }

        const { data, error } = await supabase
          .from('platform_settings')
          .select('setting_value')
          .eq('setting_key', 'branding')
          .maybeSingle();

        if (error) throw error;
        if (active && currentRequest === requestId && data?.setting_value) {
          setBrand(parseBranding(data.setting_value));
        }
      } catch (error: unknown) {
        if (active && currentRequest === requestId) {
          console.error('Unable to load public platform branding:', error);
          setBrand(defaults);
        }
      }
    };

    void load();
    const channel = supabase
      .channel('platform-branding-runtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'platform_branding_registry',
        filter: 'brand_key=eq.platform.default',
      }, () => { void load(); })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'platform_settings',
        filter: 'setting_key=eq.branding',
      }, () => { void load(); })
      .subscribe();

    return () => {
      active = false;
      requestId += 1;
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const background = hsl(brand.backgroundColor);
    const secondary = hsl(brand.secondaryColor);
    const primary = hsl(brand.primaryColor);
    const accent = hsl(brand.accentColor);

    root.classList.add('dark');
    root.style.colorScheme = 'dark';
    root.style.setProperty('--background', background);
    root.style.setProperty('--foreground', '0 0% 96%');
    root.style.setProperty('--card', secondary);
    root.style.setProperty('--card-foreground', '0 0% 96%');
    root.style.setProperty('--popover', secondary);
    root.style.setProperty('--popover-foreground', '0 0% 96%');
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--secondary', secondary);
    root.style.setProperty('--secondary-foreground', '0 0% 96%');
    root.style.setProperty('--muted', secondary);
    root.style.setProperty('--muted-foreground', '0 0% 68%');
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-foreground', '0 0% 8%');
    root.style.setProperty('--border', '0 0% 24%');
    root.style.setProperty('--input', '0 0% 24%');
    root.style.setProperty('--ring', primary);
    root.style.setProperty('--sidebar-background', background);
    root.style.setProperty('--sidebar-foreground', '0 0% 96%');
    root.style.setProperty('--sidebar-primary', primary);
    root.style.setProperty('--sidebar-accent', secondary);
    root.style.setProperty('--sidebar-border', '0 0% 24%');
    root.style.setProperty('--degame-red', brand.primaryColor);
    root.style.setProperty('--degame-black', brand.backgroundColor);
    root.style.setProperty('--degame-secondary', brand.secondaryColor);
    root.style.setProperty('--font-brand', `${brand.fontFamily}, system-ui, sans-serif`);
    document.body.style.fontFamily = 'var(--font-brand)';
    document.title = brand.platformName;

    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) favicon.href = brand.faviconUrl;
  }, [brand]);

  const value = useMemo(() => brand, [brand]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useBranding = () => useContext(Context);
