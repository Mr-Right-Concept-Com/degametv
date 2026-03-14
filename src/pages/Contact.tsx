import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, MapPin, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { usePageTitle } from '@/hooks/usePageTitle';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  message: z.string().trim().min(1, 'Message is required').max(1000),
});

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  usePageTitle('Contact Us');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => { fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    toast.success('Message sent! We\'ll get back to you soon.');
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground mb-8">Have a question or need support? We'd love to hear from you.</p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Email</p>
                <a href="mailto:support@degametv.net" className="text-sm text-muted-foreground hover:text-primary">support@degametv.net</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Location</p>
                <p className="text-sm text-muted-foreground">Lagos, Nigeria</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Response Time</p>
                <p className="text-sm text-muted-foreground">We typically respond within 24 hours.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-xs">Name</Label>
              <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="rounded-xl" maxLength={100} />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required className="rounded-xl" maxLength={255} />
            </div>
            <div>
              <Label htmlFor="message" className="text-xs">Message</Label>
              <textarea
                id="message"
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
                maxLength={1000}
                className="w-full min-h-[120px] rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" className="rounded-full w-full">Send Message</Button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
