import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Mail, Zap, Check, ArrowLeft, Loader2, Clock, Calendar, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { usePageTitle } from '@/hooks/usePageTitle';

const emailSchema = z.string().trim().email('Please enter a valid email');

interface Screening {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_url: string;
  banner_url: string;
  screening_date: string;
  duration: number;
  location_pricing: { nigeria: number; international: number };
  status: string;
}

export default function BuyTicket() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<'location' | 'email' | 'payment' | 'confirmation'>('location');
  const [location, setLocation] = useState<'nigeria' | 'international'>('nigeria');
  const [email, setEmail] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [loadingScreening, setLoadingScreening] = useState(true);
  const [confirmation, setConfirmation] = useState<any>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState<{ type: string; value: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [addons, setAddons] = useState([
    { name: 'Popcorn & Drink Bundle', price: 500, selected: false },
    { name: 'Premium Candy Pack', price: 300, selected: false },
  ]);

  useEffect(() => {
    const fetchScreening = async () => {
      if (!slug) return;
      const { data, error } = await supabase
        .from('screenings')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      
      if (data) {
        const pricing = typeof data.location_pricing === 'string' 
          ? JSON.parse(data.location_pricing) 
          : data.location_pricing;
        setScreening({ ...data, location_pricing: pricing } as Screening);
      }
      setLoadingScreening(false);
    };
    fetchScreening();
  }, [slug]);

  if (loadingScreening) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!screening) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Screening Not Found</h2>
            <p className="text-muted-foreground mb-4 text-sm">This screening may have ended or doesn't exist.</p>
            <Button asChild className="rounded-full"><Link to="/cinema">Browse Screenings</Link></Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const pricing = screening.location_pricing;
  const basePrice = pricing[location];
  const currency = location === 'nigeria' ? 'NGN' : 'USD';
  const symbol = location === 'nigeria' ? '₦' : '$';
  const addonsTotal = addons.filter(a => a.selected).reduce((sum, a) => sum + a.price, 0);
  const subtotal = basePrice + (location === 'nigeria' ? addonsTotal : 0);
  const discount = promoDiscount
    ? promoDiscount.type === 'percentage'
      ? Math.round(subtotal * promoDiscount.value / 100)
      : promoDiscount.value
    : 0;
  const total = Math.max(0, subtotal - discount);

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    setPromoError('');
    setPromoDiscount(null);
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { code: promoCode, screeningId: screening.id },
      });
      if (error || !data?.valid) {
        setPromoError(data?.error || 'Invalid promo code');
      } else {
        setPromoDiscount({ type: data.discount_type, value: data.discount_value });
        toast.success(`Promo applied! ${data.discount_type === 'percentage' ? data.discount_value + '%' : symbol + data.discount_value} off`);
      }
    } catch {
      setPromoError('Failed to validate');
    }
    setValidatingPromo(false);
  };

  const paymentMethods = [
    { id: 'stripe', name: 'Credit/Debit Card', icon: '💳', available: true },
    { id: 'paystack', name: 'Paystack', icon: '🔗', available: true },
    { id: 'flutterwave', name: 'Flutterwave', icon: '⚡', available: true },
    { id: 'bank', name: 'Bank Transfer', icon: '🏦', available: true },
  ];

  const steps = ['location', 'email', 'payment', 'confirmation'] as const;
  const currentIdx = steps.indexOf(step);

  const handlePayment = async () => {
    if (!selectedPayment) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          method: selectedPayment,
          email,
          amount: total,
          currency,
          screeningId: screening.id,
          location,
          addons: addons.filter(a => a.selected).map(a => ({ name: a.name, price: a.price })),
        },
      });

      if (error || !data?.success) {
        toast.error('Payment failed. Please try again.');
        return;
      }

      setConfirmation(data);
      setStep('confirmation');

      // Send email with watch link
      const watchUrl = `${window.location.origin}/watch/${data.watchCode}?email=${encodeURIComponent(email)}`;
      await supabase.functions.invoke('send-watch-email', {
        body: {
          email,
          movieTitle: screening.title,
          watchUrl,
          ticketCode: data.ticketCode,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          location,
          price: total,
          currency,
        },
      });

      toast.success('Ticket confirmed! Check your email for the watch link.');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen py-6 sm:py-8 px-4">
        <div className="max-w-lg mx-auto">
          {/* Back */}
          <Button variant="ghost" size="sm" className="mb-4 rounded-full text-xs" asChild>
            <Link to="/cinema"><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back</Link>
          </Button>

          {/* Movie Header */}
          <div className="mb-6 text-center">
            {screening.poster_url && (
              <div className="w-28 h-40 sm:w-32 sm:h-44 mx-auto rounded-xl overflow-hidden mb-3 shadow-lg">
                <img src={screening.poster_url} alt={screening.title} className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold mb-1">{screening.title}</h1>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              {screening.screening_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(screening.screening_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {screening.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {screening.duration}min
                </span>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between mb-6 px-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < currentIdx ? 'bg-success text-success-foreground scale-90'
                    : i === currentIdx ? 'bg-primary text-primary-foreground scale-110 shadow-lg'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {i < currentIdx ? '✓' : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors ${i < currentIdx ? 'bg-success' : 'bg-secondary'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step: Location */}
          {step === 'location' && (
            <Card className="animate-fade-in border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4 text-primary" />
                  Where are you watching from?
                </CardTitle>
                <CardDescription className="text-xs">Your location determines ticket price</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(['nigeria', 'international'] as const).map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocation(loc)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${
                      location === loc ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-sm capitalize">{loc === 'nigeria' ? '🇳🇬 Nigeria' : '🌍 International'}</p>
                      <p className="text-xs text-muted-foreground">
                        {loc === 'nigeria' ? 'Pay in Naira' : 'Pay in USD'}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {loc === 'nigeria' ? `₦${pricing.nigeria.toLocaleString()}` : `$${pricing.international}`}
                    </span>
                  </button>
                ))}
                <Button className="w-full rounded-full mt-4 h-11" onClick={() => setStep('email')}>
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step: Email */}
          {step === 'email' && (
            <Card className="animate-fade-in border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="w-4 h-4 text-primary" />
                  Where should we send your watch link?
                </CardTitle>
                <CardDescription className="text-xs">Instant "Watch Now" link after payment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-xs mb-1.5 block">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl"
                    autoFocus
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">We only use it to send your watch link.</p>
                </div>
                <div className="flex gap-2.5">
                  <Button variant="outline" className="flex-1 rounded-full h-10" onClick={() => setStep('location')}>Back</Button>
                  <Button className="flex-1 rounded-full h-10" onClick={() => setStep('payment')} disabled={!email.includes('@')}>
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Payment */}
          {step === 'payment' && (
            <Card className="animate-fade-in border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4 text-primary" />
                  Choose Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add-ons (Nigeria only) */}
                {location === 'nigeria' && (
                  <div className="bg-secondary/50 p-3 rounded-xl">
                    <p className="text-xs font-medium mb-2">Add Some Extras?</p>
                    {addons.map((addon, i) => (
                      <label key={i} className="flex items-center gap-2.5 p-2 cursor-pointer rounded-lg hover:bg-secondary/80 transition active:scale-[0.98]">
                        <input
                          type="checkbox"
                          checked={addon.selected}
                          onChange={() => {
                            const a = [...addons];
                            a[i].selected = !a[i].selected;
                            setAddons(a);
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <span className="flex-1 text-sm">{addon.name}</span>
                        <span className="text-xs font-medium text-primary">+₦{addon.price}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Promo Code */}
                <div className="bg-secondary/30 p-3 rounded-xl">
                  <p className="text-xs font-medium mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Promo Code</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                      className="h-9 rounded-lg text-sm uppercase"
                      maxLength={20}
                    />
                    <Button size="sm" variant="outline" className="rounded-lg h-9 text-xs" onClick={handleValidatePromo} disabled={validatingPromo || !promoCode.trim()}>
                      {validatingPromo ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                  {promoError && <p className="text-[10px] text-destructive mt-1">{promoError}</p>}
                  {promoDiscount && <p className="text-[10px] text-success mt-1">✓ Discount applied!</p>}
                </div>

                {/* Price */}
                <div className="bg-secondary/30 p-3 rounded-xl space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ticket</span>
                    <span>{symbol}{basePrice.toLocaleString()}</span>
                  </div>
                  {addonsTotal > 0 && location === 'nigeria' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Add-ons</span>
                      <span>+₦{addonsTotal.toLocaleString()}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Promo Discount</span>
                      <span>-{symbol}{discount.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-primary">{symbol}{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Methods */}
                <div className="space-y-2">
                  {paymentMethods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedPayment(m.id)}
                      className={`w-full p-3.5 border-2 rounded-xl transition-all flex items-center gap-3 active:scale-[0.98] ${
                        selectedPayment === m.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <span className="text-xl">{m.icon}</span>
                      <span className="flex-1 text-left text-sm font-medium">{m.name}</span>
                      {selectedPayment === m.id && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2.5 pt-2">
                  <Button variant="outline" className="flex-1 rounded-full h-10" onClick={() => setStep('email')}>Back</Button>
                  <Button
                    className="flex-1 rounded-full h-10"
                    onClick={handlePayment}
                    disabled={!selectedPayment || processing}
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Pay {symbol}{total.toLocaleString()}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Confirmation */}
          {step === 'confirmation' && confirmation && (
            <Card className="animate-fade-in border-success/30">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4 animate-scale-in">
                  <Check className="w-7 h-7 text-success" />
                </div>
                <h2 className="text-xl font-bold mb-1">You're In! 🎉</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Check your email ({email}) for your "Watch Now" link.
                </p>

                <div className="bg-secondary/50 p-4 rounded-xl mb-5 text-left space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Movie</span><span className="font-medium">{screening.title}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="capitalize">{location}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold text-primary">{symbol}{total.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Ticket</span><span className="font-mono text-xs">{confirmation.ticketCode}</span></div>
                </div>

                <div className="space-y-2.5">
                  <Button className="w-full rounded-full h-11" asChild>
                    <Link to={`/watch/${confirmation.watchCode}?email=${encodeURIComponent(email)}`}>
                      ▶ Watch Now
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full rounded-full h-10" asChild>
                    <Link to="/tickets">My Tickets</Link>
                  </Button>
                  <Button variant="ghost" className="w-full rounded-full h-10" asChild>
                    <Link to="/">Back to Home</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
