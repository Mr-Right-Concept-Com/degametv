import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminLayout({ children, title, description, actions }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="pl-64">
        <AdminHeader title={title} description={description} actions={actions} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
