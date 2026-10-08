import { Link, useLocation } from 'react-router-dom';
import { Film, LayoutDashboard, Upload, Calendar, DollarSign, ExternalLink, Clapperboard, BarChart3, Radio, Megaphone, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/studio', icon: LayoutDashboard },
  { label: 'My Movies', href: '/studio/movies', icon: Film },
  { label: 'Submit Film', href: '/studio/submit', icon: Upload },
  { label: 'My Screenings', href: '/studio/screenings', icon: Calendar },
  { label: 'Go Live', href: '/studio/live', icon: Radio },
  { label: 'Team & Promotion', href: '/studio/team', icon: Users },
  { label: 'Fan Blast', href: '/studio/fan-blast', icon: Megaphone },
  { label: 'Analytics', href: '/studio/analytics', icon: BarChart3 },
  { label: 'Wallet & Earnings', href: '/studio/earnings', icon: DollarSign },
];

interface StudioSidebarProps {
  onNavigate?: () => void;
}

export function StudioSidebar({ onNavigate }: StudioSidebarProps) {
  const { pathname } = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-40 flex flex-col">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <Clapperboard className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <span className="font-bold text-sm text-foreground">Studio Portal</span>
          <p className="text-[10px] text-muted-foreground">DeGameTV</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Studio</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Back to Site
        </Link>
      </div>
    </aside>
  );
}
