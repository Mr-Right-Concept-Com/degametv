import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Users, Film, Tag, TrendingUp, CreditCard, Building2,
  Palette, Mail, Upload, ExternalLink, LogOut, Ticket, ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/components/branding/BrandingProvider';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Godmode', href: '/admin/godmode', icon: ShieldAlert },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Screenings', href: '/admin/screenings', icon: Film },
      { label: 'Tickets', href: '/admin/tickets', icon: Ticket },
      { label: 'Promo Codes', href: '/admin/promo-codes', icon: Tag },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Filmmaker Applications', href: '/admin/filmmaker-applications', icon: Upload },
      { label: 'Studio Applications', href: '/admin/studio-applications', icon: Building2 },
      { label: 'Film Submissions', href: '/admin/filmmaker', icon: Film },
    ],
  },
  {
    title: 'Revenue',
    items: [
      { label: 'Sales Dashboard', href: '/admin/sales', icon: TrendingUp },
      { label: 'Payouts & Tiers', href: '/admin/payouts', icon: CreditCard },
      { label: 'Payment Gateways', href: '/admin/settings/payment-gateways', icon: CreditCard },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Branding', href: '/admin/settings/branding', icon: Palette },
      { label: 'Email Settings', href: '/admin/settings/email', icon: Mail },
    ],
  },
  {
    title: 'Links',
    items: [
      { label: 'Filmmaker Portal', href: '/filmmaker', icon: Film, external: true },
      { label: 'View Site', href: '/', icon: ExternalLink, external: true },
    ],
  },
];

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const branding = useBranding();

  const isActive = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <span className="text-sm font-bold text-white">D</span>
        </div>
        <div className="flex flex-col">
          <span className="font-display font-semibold text-sidebar-foreground">DeGameTV</span>
          <span className="text-xs text-muted-foreground">Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.title}
            </p>
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
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
            aria-label="Sign out"
            onClick={() => signOut()}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;

  if (item.external) {
    return (
      <Link
        to={item.href}
        onClick={onNavigate}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{item.label}</span>
        <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }

  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-sidebar-accent text-sidebar-foreground"
          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}
