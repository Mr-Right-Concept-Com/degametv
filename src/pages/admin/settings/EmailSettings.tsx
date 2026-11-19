import { AdminLayout } from '@/components/admin/AdminLayout';
import { ProviderRegistryPanel } from '@/components/admin/ProviderRegistryPanel';

export default function EmailSettings() {
  return <AdminLayout title="Email Providers" description="Manage email delivery adapters, Vault credentials, health checks and live routing centrally.">
    <ProviderRegistryPanel initialCapability="email" />
  </AdminLayout>;
}
