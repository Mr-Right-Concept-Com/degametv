import { ReactNode } from 'react';
import { StudioSidebar } from './StudioSidebar';
import { useAuth } from '@/hooks/useAuth';

interface StudioLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function StudioLayout({ children, title, description, actions }: StudioLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <StudioSidebar />
      <div className="pl-64">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6">
          <div>
            {title && <h1 className="text-lg font-bold text-foreground">{title}</h1>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
