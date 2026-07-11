import { ReactNode } from 'react';
import { Bell, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminHeaderProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function AdminHeader({ title, description, actions, children }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-14 md:h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          {children}
          {title && (
            <div>
              <h1 className="text-base md:text-lg font-semibold">{title}</h1>
              {description && (
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{description}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <Button variant="ghost" size="icon" aria-label="Help" className="hidden sm:inline-flex">
            <HelpCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Notifications (3 unread)" className="relative">
            <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <span aria-hidden="true" className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              3
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
