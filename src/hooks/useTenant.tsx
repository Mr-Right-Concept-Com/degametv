import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { TenantConfig, TenantModule, ModuleId, MODULE_DEFINITIONS } from '@/types/modules';

interface TenantContextType {
  tenant: TenantConfig | null;
  loading: boolean;
  isModuleEnabled: (moduleId: ModuleId) => boolean;
  enableModule: (moduleId: ModuleId) => Promise<void>;
  disableModule: (moduleId: ModuleId) => Promise<void>;
  updateBranding: (branding: Partial<TenantConfig['branding']>) => Promise<void>;
  userRole: 'super_admin' | 'platform_admin' | 'licensee_admin' | 'creator' | 'moderator' | 'viewer' | null;
  isSuperAdmin: boolean;
  isPlatformAdmin: boolean;
  isAdmin: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Default tenant for demo purposes
const DEFAULT_TENANT: TenantConfig = {
  id: 'default',
  name: 'AGE Media',
  slug: 'age-media',
  branding: {
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    accentColor: '#10B981',
  },
  modules: MODULE_DEFINITIONS.filter(m => m.isCore || m.status === 'stable').map(m => ({
    moduleId: m.id,
    enabled: m.isCore,
    enabledAt: m.isCore ? new Date().toISOString() : undefined,
  })),
  status: 'active',
  plan: 'professional',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  selfService: true,
  autopilot: true,
};

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<TenantConfig | null>(DEFAULT_TENANT);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<TenantContextType['userRole']>(null);

  useEffect(() => {
    const fetchTenantAndRole = async () => {
      if (!user) {
        setTenant(DEFAULT_TENANT);
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role, tenant_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleData) {
          setUserRole(roleData.role as TenantContextType['userRole']);
          
          // If user has a tenant_id, fetch that tenant
          if (roleData.tenant_id) {
            const { data: tenantData } = await supabase
              .from('tenants')
              .select('*')
              .eq('id', roleData.tenant_id)
              .maybeSingle();

            if (tenantData) {
              setTenant({
                id: tenantData.id,
                name: tenantData.name,
                slug: tenantData.slug,
                domain: tenantData.custom_domain || undefined,
                branding: {
                  logo: tenantData.logo_url || undefined,
                  favicon: tenantData.favicon_url || undefined,
                  primaryColor: tenantData.primary_color || '#3B82F6',
                  secondaryColor: tenantData.secondary_color || '#8B5CF6',
                  accentColor: '#10B981',
                },
                modules: DEFAULT_TENANT.modules,
                status: tenantData.is_active ? 'active' : 'suspended',
                plan: 'professional',
                createdAt: tenantData.created_at,
                updatedAt: tenantData.updated_at,
                selfService: true,
                autopilot: true,
              });
            }
          }
        } else {
          setUserRole('viewer');
        }
      } catch (error) {
        console.error('Error fetching tenant/role:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantAndRole();
  }, [user]);

  const isModuleEnabled = (moduleId: ModuleId): boolean => {
    if (!tenant) return false;
    const module = tenant.modules.find(m => m.moduleId === moduleId);
    return module?.enabled ?? false;
  };

  const enableModule = async (moduleId: ModuleId): Promise<void> => {
    if (!tenant) return;
    
    setTenant(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map(m => 
          m.moduleId === moduleId 
            ? { ...m, enabled: true, enabledAt: new Date().toISOString() }
            : m
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const disableModule = async (moduleId: ModuleId): Promise<void> => {
    if (!tenant) return;
    
    setTenant(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map(m => 
          m.moduleId === moduleId 
            ? { ...m, enabled: false, disabledAt: new Date().toISOString() }
            : m
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const updateBranding = async (branding: Partial<TenantConfig['branding']>): Promise<void> => {
    if (!tenant) return;
    
    setTenant(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        branding: { ...prev.branding, ...branding },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const isSuperAdmin = userRole === 'super_admin';
  const isPlatformAdmin = userRole === 'platform_admin' || isSuperAdmin;
  const isAdmin = isPlatformAdmin || userRole === 'licensee_admin';

  return (
    <TenantContext.Provider value={{
      tenant,
      loading,
      isModuleEnabled,
      enableModule,
      disableModule,
      updateBranding,
      userRole,
      isSuperAdmin,
      isPlatformAdmin,
      isAdmin,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
