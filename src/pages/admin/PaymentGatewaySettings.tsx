import { AdminLayout } from '@/components/admin/AdminLayout';
import { ProviderRegistryPanel } from '@/components/admin/ProviderRegistryPanel';

export default function PaymentGatewaySettings() {
  return <AdminLayout title="Payment Providers" description="Manage all payment adapters, routing priority, Vault credentials and test/live modes from the unified provider registry.">
    <ProviderRegistryPanel initialCapability="payments" />
  </AdminLayout>;
}
