import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Users, Building2, Package, Settings, 
  Film, Radio, Clapperboard, Tv, Smartphone, Ticket, 
  CreditCard, Store, Palette, BarChart3, Glasses, Code2,
  ChevronDown, LogOut, Headphones, Database, GraduationCap, TrendingUp,
  Upload, Mail, ExternalLink
} from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';
import { MODULE_DEFINITIONS, ModuleId } from '@/types/modules';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Film, Radio, Clapperboard, Tv, Smartphone, Ticket, 
  CreditCard, Store, Palette, BarChart3, Glasses, Code2,
  Headphones, Database, GraduationCap, Settings, Package
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  moduleId?: ModuleId;
}

export function AdminSidebar() {
  const location = useLocation();
  const { isSuperAdmin, isPlatformAdmin, tenant, isModuleEnabled } = useTenant();
  const { signOut, user } = useAuth();
  const [modulesOpen, setModulesOpen] = useState(true);

  // Platform Admin Navigation (Super Admin only)
  const platformNav: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Tenants', href: '/admin/tenants', icon: Building2 },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Modules', href: '/admin/modules', icon: Package },
  ];

  // 12 Module Navigation - Dynamic based on enabled modules
  const moduleNav: NavItem[] = MODULE_DEFINITIONS.map(module => ({
    label: module.name,
    href: `/admin/modules/${module.id}`,
    icon: iconMap[module.icon] || Package,
    badge: module.status === 'beta' ? 'Beta' : module.status === 'coming-soon' ? 'Soon' : undefined,
    moduleId: module.id,
  }));

  // Filter to only show enabled modules (or all for super admins)
  const visibleModules = isSuperAdmin 
    ? moduleNav 
    : moduleNav.filter(item => item.moduleId && isModuleEnabled(item.moduleId));

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <span className="text-sm font-bold text-white">A</span>
        </div>
        <div className="flex flex-col">
          <span className="font-display font-semibold text-sidebar-foreground">
            {tenant?.name || 'AGE Media'}
          </span>
          <span className="text-xs text-muted-foreground">
            {isSuperAdmin ? 'Super Admin' : isPlatformAdmin ? 'Platform Admin' : 'Tenant Admin'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Platform Section (Super Admin Only) */}
        {isSuperAdmin && (
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Platform
            </p>
            {platformNav.map((item) => (
              <NavLink key={item.href} item={item} isActive={location.pathname === item.href} />
            ))}
          </div>
        )}

        {/* Modules Section - 12 Core Modules */}
        <Collapsible open={modulesOpen} onOpenChange={setModulesOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
            Modules ({visibleModules.length})
            <ChevronDown className={cn("h-4 w-4 transition-transform", modulesOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {visibleModules.map((item) => (
              <NavLink 
                key={item.href} 
                item={item} 
                isActive={location.pathname.startsWith(item.href)} 
              />
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Sales & Analytics */}
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sales
          </p>
          <NavLink
            item={{ label: 'Sales Dashboard', href: '/admin/sales', icon: TrendingUp }}
            isActive={location.pathname === '/admin/sales'}
          />
          <NavLink
            item={{ label: 'Filmmaker Admin', href: '/admin/filmmaker', icon: Upload }}
            isActive={location.pathname.startsWith('/admin/filmmaker')}
          />
          <NavLink
            item={{ label: 'Filmmaker Portal ↗', href: '/filmmaker', icon: Film }}
            isActive={false}
          />
        </div>

        {/* Settings */}
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Settings
          </p>
          <NavLink 
            item={{ label: 'White-Label', href: '/admin/modules/white-label', icon: Palette }}
            isActive={location.pathname === '/admin/modules/white-label'}
          />
          <NavLink
            item={{ label: 'Email Settings', href: '/admin/settings/email', icon: Mail }}
            isActive={location.pathname === '/admin/settings/email'}
          />
        </div>
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email || 'User'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  
  return (
    <Link
      to={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
        isActive 
          ? "bg-sidebar-accent text-sidebar-foreground" 
          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
          item.badge === 'Beta' && "bg-age-blue/20 text-age-blue",
          item.badge === 'Soon' && "bg-muted text-muted-foreground"
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}
