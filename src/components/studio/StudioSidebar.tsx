import { Link, useLocation } from 'react-router-dom';
import { Film, LayoutDashboard, DollarSign, ExternalLink, Clapperboard, BarChart3, Megaphone, Users, PlusCircle, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBranding } from '@/components/branding/BrandingProvider';

const navItems = [
  { label: 'Dashboard', href: '/studio', icon: LayoutDashboard },
  { label: 'Create', href: '/studio/create', icon: PlusCircle },
  { label: 'My Catalogue', href: '/studio/movies', icon: Film },
  { label: 'Events & Screenings', href: '/studio/screenings', icon: CalendarDays },
  { label: 'Team & Promotion', href: '/studio/team', icon: Users },
  { label: 'Fan Blast', href: '/studio/fan-blast', icon: Megaphone },
  { label: 'Analytics', href: '/studio/analytics', icon: BarChart3 },
  { label: 'Wallet & Earnings', href: '/studio/earnings', icon: DollarSign },
];

interface StudioSidebarProps { onNavigate?: () => void; }

export function StudioSidebar({ onNavigate }: StudioSidebarProps) {
  const { pathname } = useLocation();
  const branding = useBranding();
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-40 flex flex-col">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link to="/" aria-label="DeGameTV home"><img src={branding.logoUrl || '/brand/degametv-lockup.svg'} alt={branding.platformName || 'DeGameTV'} className="h-auto w-[172px] max-w-full object-contain" /></Link>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Studio</p>
        {navItems.map(item => {
          const isActive = item.href === '/studio' ? pathname === item.href : pathname === item.href || (item.href === '/studio/create' && ['/studio/submit', '/studio/live'].includes(pathname));
          return <Link key={item.href} to={item.href} onClick={onNavigate} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors', isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary')}><item.icon className="w-4 h-4" />{item.label}</Link>;
        })}
      </nav>
      <div className="p-3 border-t border-border"><Link to="/" onClick={onNavigate} className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><ExternalLink className="w-3.5 h-3.5" />Back to Site</Link></div>
    </aside>
  );
}
