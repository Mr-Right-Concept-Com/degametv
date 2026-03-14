import { MainLayout } from '@/components/layout/MainLayout';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function RefundPolicy() {
  usePageTitle('Refund Policy');
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Refund Policy</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p>Last updated: March 1, 2026</p>
          <h2 className="text-lg font-semibold text-foreground">Ticket Purchases</h2>
          <p>All ticket purchases for virtual cinema screenings are final. Due to the digital nature of our content, we generally do not offer refunds once a ticket has been purchased and a watch code has been issued.</p>
          <h2 className="text-lg font-semibold text-foreground">Exceptions</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Technical issues preventing access to purchased content that our support team cannot resolve within 24 hours.</li>
            <li>Event cancellation by the organizer — full refund will be issued automatically.</li>
            <li>Duplicate purchases — contact support within 48 hours of purchase.</li>
          </ul>
          <h2 className="text-lg font-semibold text-foreground">How to Request a Refund</h2>
          <p>Email us at <a href="mailto:support@degametv.net" className="text-primary hover:underline">support@degametv.net</a> with your ticket code and reason for the refund request. We aim to respond within 2 business days.</p>
          <h2 className="text-lg font-semibold text-foreground">Processing Time</h2>
          <p>Approved refunds are processed within 5-10 business days and returned via the original payment method.</p>
        </div>
      </div>
    </MainLayout>
  );
}
