import { MainLayout } from '@/components/layout/MainLayout';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Terms() {
  usePageTitle('Terms of Service');
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p>Last updated: March 1, 2026</p>
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By accessing or using DeGameTV, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.</p>
          <h2 className="text-lg font-semibold text-foreground">2. Service Description</h2>
          <p>DeGameTV provides a virtual cinema platform for purchasing tickets and watching exclusive film screenings online.</p>
          <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You agree not to share your watch codes or access links with others.</p>
          <h2 className="text-lg font-semibold text-foreground">4. Content Usage</h2>
          <p>All content is licensed for personal, non-commercial viewing only. Recording, redistributing, or publicly displaying content is strictly prohibited.</p>
          <h2 className="text-lg font-semibold text-foreground">5. Payments</h2>
          <p>All prices are displayed in the relevant currency for your region. Payment is processed securely through our supported payment gateways.</p>
          <h2 className="text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
          <p>DeGameTV is not liable for any indirect, incidental, or consequential damages arising from the use of our platform.</p>
          <h2 className="text-lg font-semibold text-foreground">7. Contact</h2>
          <p>Questions about these terms? Email us at <a href="mailto:legal@degametv.net" className="text-primary underline underline-offset-2 hover:no-underline">legal@degametv.net</a>.</p>
        </div>
      </div>
    </MainLayout>
  );
}
