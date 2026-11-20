import type { ReactNode } from 'react';

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

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
