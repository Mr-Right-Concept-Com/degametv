import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type DomainSettings = {
  controlDomain: string;
  releaseDomain: string;
};

type ResolverClient = {
  rpc: (
    name: string,
    args: { p_hostname: string },
  ) => Promise<{ data: unknown; error: unknown }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidHostname(value: string): boolean {
  return value.length <= 253 &&
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value);
}

function readDomainSettings(value: unknown): DomainSettings {
  if (!isRecord(value)) return { controlDomain: '', releaseDomain: '' };

  const controlDomain = typeof value.controlDomain === 'string'
    ? value.controlDomain.trim().toLowerCase()
    : '';
  const releaseDomain = typeof value.releaseDomain === 'string'
    ? value.releaseDomain.trim().toLowerCase()
    : '';

  return {
    controlDomain: isValidHostname(controlDomain) ? controlDomain : '',
    releaseDomain: isValidHostname(releaseDomain) ? releaseDomain : '',
  };
}

function hasResolvedContent(value: unknown): boolean {
  return Array.isArray(value) && value.some((entry: unknown) =>
    isRecord(entry) && typeof entry.content_id === 'string' && entry.content_id.length > 0,
  );
}

export function ReleaseDomainRouter() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== '/') return;

    let active = true;

    const resolve = async () => {
      try {
        const { data: setting, error: settingsError } = await supabase
          .from('platform_settings')
          .select('setting_value')
          .eq('setting_key', 'domain_settings')
          .maybeSingle();

        if (settingsError) throw settingsError;
        if (!active) return;

        const values = readDomainSettings(setting?.setting_value);
        const host = window.location.hostname.toLowerCase();

        if (
          host === 'localhost' ||
          host.endsWith('.localhost') ||
          host === '127.0.0.1' ||
          host === '::1' ||
          [values.controlDomain, values.releaseDomain]
            .filter(Boolean)
            .some((root) => host === root || host === `www.${root}`)
        ) return;

        // This resolver boundary has not been verified against a generated contract.
        // Keep its response unknown and validate the payload before navigation.
        const resolver = supabase as unknown as ResolverClient;
        const { data, error } = await resolver.rpc(
          'resolve_release_domain',
          { p_hostname: host },
        );

        if (error) {
          const message = isRecord(error) && typeof error.message === 'string'
            ? error.message
            : 'Release-domain lookup failed';
          throw new Error(message);
        }

        if (active && hasResolvedContent(data)) {
          navigate('/production', {
            replace: true,
            state: { releaseDomain: true, hostname: host },
          });
        }
      } catch (error: unknown) {
        if (active) console.error('Unable to resolve release domain:', error);
      }
    };

    void resolve();
    return () => {
      active = false;
    };
  }, [location.pathname, navigate]);

  return null;
}
