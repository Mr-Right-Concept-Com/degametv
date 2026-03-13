import { ReactNode, useState } from 'react';
import { StudioSidebar } from './StudioSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

interface StudioLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function StudioLayout({ children, title, description, actions }: StudioLayoutProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <StudioSidebar />
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <StudioSidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="md:pl-64">
        <header className="h-14 md:h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              {title && <h1 className="text-base md:text-lg font-bold text-foreground">{title}</h1>}
              {description && <p className="text-xs text-muted-foreground hidden sm:block">{description}</p>}
            </div>
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
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
