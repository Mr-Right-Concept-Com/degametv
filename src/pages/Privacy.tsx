import { MainLayout } from '@/components/layout/MainLayout';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Privacy() {
  usePageTitle('Privacy Policy');
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p>Last updated: March 1, 2026</p>
          <h2 className="text-lg font-semibold text-foreground">Information We Collect</h2>
          <p>We collect your email address when you purchase a ticket or subscribe to notifications. We may also collect usage data such as device type and viewing activity.</p>
          <h2 className="text-lg font-semibold text-foreground">How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To deliver your purchased content and watch links.</li>
            <li>To send screening reminders and notifications you opted into.</li>
            <li>To improve our platform and user experience.</li>
          </ul>
          <h2 className="text-lg font-semibold text-foreground">Data Sharing</h2>
          <p>We do not sell your personal data. We share data only with payment processors and email delivery providers necessary to fulfill your orders.</p>
          <h2 className="text-lg font-semibold text-foreground">Your Rights</h2>
          <p>You may request access to, correction of, or deletion of your personal data by contacting <a href="mailto:privacy@degametv.net" className="text-primary hover:underline">privacy@degametv.net</a>.</p>
          <h2 className="text-lg font-semibold text-foreground">Cookies</h2>
          <p>We use essential cookies to maintain your session. No third-party tracking cookies are used.</p>
        </div>
      </div>
    </MainLayout>
  );
}
