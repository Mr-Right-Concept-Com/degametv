import { MainLayout } from '@/components/layout/MainLayout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { usePageTitle } from '@/hooks/usePageTitle';

const faqs = [
  { q: 'How does virtual cinema work?', a: 'Purchase a ticket for a screening, and you\'ll receive a unique watch link via email. Click the link to watch the movie during the screening window.' },
  { q: 'How long do I have to watch?', a: 'Most screenings include a 90-day viewing window from the date of purchase. Check your ticket details for specific expiration dates.' },
  { q: 'Can I watch on any device?', a: 'Yes! Our player works on desktop, tablet, and mobile browsers. We recommend a stable internet connection for the best experience.' },
  { q: 'What payment methods do you accept?', a: 'We accept credit/debit cards (via Stripe), Paystack, Flutterwave, and bank transfers for Nigerian customers.' },
  { q: 'Can I share my watch link?', a: 'Watch links are tied to the email used during purchase and are for personal use only. Sharing is not permitted.' },
  { q: 'What happens if I have technical issues?', a: 'Contact us at support@degametv.net with your ticket code, and we\'ll help resolve any issues promptly.' },
  { q: 'How do promo codes work?', a: 'Enter your promo code during checkout to receive a discount. Promo codes have expiration dates and usage limits.' },
  { q: 'Can I get a refund?', a: 'Please see our Refund Policy page for details on eligible refund scenarios and how to request one.' },
];

export default function FAQ() {
  usePageTitle('FAQ');
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-8">Everything you need to know about DeGameTV virtual cinema.</p>
        <h2 className="sr-only">Questions</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-4">
              <AccordionTrigger className="text-sm font-medium text-left">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </MainLayout>
  );
}
