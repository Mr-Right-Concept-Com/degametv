import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Mail, Zap, Check, ArrowLeft, Loader2, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRuntimeConfig } from '@/contexts/RuntimeConfigContext';

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
  event_type?: string;
  access_model?: 'FREE' | 'TICKETED';
  live_price_ngn?: number | null;
  live_price_usd?: number | null;
  lifecycle?: string;
  replay_price_ngn?: number | null;
  replay_price_usd?: number | null;
  replay_access_model?: 'INCLUDED_WITH_TICKET' | 'SEPARATE_PRICE' | 'FREE_REPLAY';
  refund_policy?: string | null;
}

export default function BuyTicket() {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState<'location' | 'email' | 'payment' | 'confirmation'>('location');
  const [location, setLocation] = useState<'nigeria' | 'international'>('international');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [localCurrency, setLocalCurrency] = useState<string | null>(null);
  const [localConverted, setLocalConverted] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<Array<{id:string;name:string;mode:string;available:boolean;supportedCurrencies:string[]}>>([]);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [screening, setScreening] = useState<Screening | null>(null);
  const [loadingScreening, setLoadingScreening] = useState(true);
  const { user } = useAuth();
  const runtime = useRuntimeConfig();
  const [freeClaimBusy, setFreeClaimBusy] = useState(false);
  const [freeStreamId, setFreeStreamId] = useState<string | null>(null);
  const [livePaid, setLivePaid] = useState(false);
  usePageTitle(screening?.title ? `Buy Ticket — ${screening.title}` : 'Buy Ticket');
  const [confirmation, setConfirmation] = useState<{ticketCode:string;watchCode:string;expiresAt?:string;emailSent?:boolean;location?:'nigeria'|'international';price?:number;currency?:string}|null>(null);

  useEffect(() => {
    const fetchScreening = async () => {
      if (!slug) return;
      const { data, error } = await supabase
        .from('screenings')
        .select('id,content_id,title,slug,description,poster_url,banner_url,trailer_url,release_date,screening_date,duration,location_pricing,status,access_model,event_type,lifecycle,live_price_ngn,live_price_usd,live_recording_status,live_started_at,live_ended_at,live_replay_ready_at,replay_price_ngn,replay_price_usd,replay_access_hours,replay_access_model,refund_policy,cast_crew,gallery_images,age_rating,star_rating,review_count,allowed_countries,blocked_countries,cancelled_at,created_at,updated_at')
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

  useEffect(() => {
    let active = true;
    void supabase.functions.invoke('list-payment-methods', { method: 'GET' }).then(({ data, error }) => {
      if (active) setPaymentMethods(!error && Array.isArray(data?.methods) ? data.methods : []);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const config = runtime.config;
    if (!config) return;
    const detectedCountry = config.geo.countryCode;
    setCountryCode(sessionStorage.getItem('degame_checkout_country') || detectedCountry);
    setLocalCurrency(sessionStorage.getItem('degame_checkout_currency') || config.currency);
    if (!sessionStorage.getItem('degame_checkout_location') && detectedCountry) {
      setLocation(detectedCountry === 'NG' ? 'nigeria' : 'international');
    }
  }, [runtime.config]);

  useEffect(() => {
    if (!screening || !localCurrency) return;
    const isNigeria = location === 'nigeria';
    const isReplayPrice = screening.lifecycle === 'replay';
    const replay = isReplayPrice ? (isNigeria ? screening.replay_price_ngn : screening.replay_price_usd) : null;
    const amount = replay != null ? Number(replay) : Number(screening.location_pricing?.[location] ?? 0);
    const fromCurrency = isNigeria ? 'NGN' : 'USD';
    if (!Number.isFinite(amount) || amount <= 0 || localCurrency === fromCurrency) {
      setLocalConverted(null);
      return;
    }
    let active = true;
    void supabase.functions.invoke('convert-currency', {
      body: { amount, fromCurrency, toCurrency: localCurrency, country: countryCode ?? undefined },
    }).then(({ data, error }) => {
      if (active) setLocalConverted(!error && Number.isFinite(data?.converted) ? Number(data.converted) : null);
    });
    return () => { active = false; };
  }, [screening, location, localCurrency, countryCode]);

  useEffect(() => {
    if (!screening) return;
    const reference = new URLSearchParams(window.location.search).get('reference');
    const savedEmail = sessionStorage.getItem('degame_checkout_email') || '';
    const savedLocation = sessionStorage.getItem('degame_checkout_location') === 'international' ? 'international' : 'nigeria';
    const savedCountry = sessionStorage.getItem('degame_checkout_country');
    const savedCurrency = sessionStorage.getItem('degame_checkout_currency');
    if (savedCountry) setCountryCode(savedCountry);
    if (savedCurrency) setLocalCurrency(savedCurrency);
    if (!reference) return;
    setLocation(savedLocation);
    setStep('payment');
    let active = true;
    setEmail(savedEmail);
    setProcessing(true);
    const poll = async () => {
      for (let i = 0; i < 6 && active; i += 1) {
        const result = await supabase.functions.invoke('payment-status', { body: { reference } });
        if (!active) return;
        if (!result.error && result.data?.status === 'paid' && reference.startsWith('DTVL_')) {
          setLivePaid(true);
          setStep('confirmation');
          sessionStorage.removeItem('degame_checkout_email');
          sessionStorage.removeItem('degame_checkout_location');
          sessionStorage.removeItem('degame_checkout_country');
          sessionStorage.removeItem('degame_checkout_currency');
          sessionStorage.removeItem('degame_checkout_country');
          sessionStorage.removeItem('degame_checkout_currency');
          window.history.replaceState({}, '', window.location.pathname);
          toast.success('Payment confirmed. Your event ticket is ready in My Tickets or via the secure email claim link.');
          setProcessing(false);
          return;
        }
        if (!result.error && result.data?.status === 'paid' && result.data.watchCode && result.data.ticketCode) {
          setEmail(result.data.email || savedEmail);
          if (result.data.location === 'nigeria' || result.data.location === 'international') setLocation(result.data.location);
          setConfirmation(result.data);
          setStep('confirmation');
          sessionStorage.removeItem('degame_checkout_email');
          sessionStorage.removeItem('degame_checkout_location');
          window.history.replaceState({}, '', window.location.pathname);
          if (result.data.emailSent) toast.success('Payment confirmed. Your ticket is ready and the email has been sent.');
          else toast.message('Payment confirmed. Your ticket is ready below; email delivery is not configured yet.');
          setProcessing(false);
          return;
        }
        if (!result.error && result.data?.status === 'failed') {
          setPaymentError('Payment was not completed. You can retry checkout.');
          sessionStorage.removeItem('degame_checkout_email');
          setProcessing(false);
          return;
        }
        await new Promise(resolve => window.setTimeout(resolve, 2000));
      }
      if (active) { setPaymentError('Payment is still awaiting provider confirmation. Retry shortly; no ticket is issued until verification completes.'); setProcessing(false); }
    };
    void poll();
    return () => { active = false; };
  }, [screening]);

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
  const isReplay = screening.lifecycle === 'replay';
  const replayPrice = location === 'nigeria' ? screening.replay_price_ngn : screening.replay_price_usd;
  const basePrice = isReplay && replayPrice ? Number(replayPrice) : pricing[location];
  const currency = location === 'nigeria' ? 'NGN' : 'USD';
  const symbol = location === 'nigeria' ? '₦' : '$';
  const total = basePrice;
  const eligiblePaymentMethods = paymentMethods.filter(method => method.available && method.supportedCurrencies.includes(localCurrency ?? currency));
  const localPriceLabel = localConverted !== null && localCurrency ? new Intl.NumberFormat(undefined,{style:'currency',currency:localCurrency,maximumFractionDigits:2}).format(localConverted) : null;

  const steps = ['location', 'email', 'payment', 'confirmation'] as const;
  const currentIdx = steps.indexOf(step);

  const handleFreeClaim = async () => {
    if (!screening) return;
    if (!user) {
      toast.error('Sign in to claim your free event pass.');
      return;
    }
    setFreeClaimBusy(true);
    try {
      const { data, error } = await supabase.rpc(isReplay ? 'claim_free_replay_ticket' : 'claim_free_live_ticket', { p_screening_id: screening.id });
      const claim = data as { claimed?: boolean; stream_id?: string; already_claimed?: boolean } | null;
      if (error || !claim?.claimed || typeof claim.stream_id !== 'string') {
        toast.error(error?.message || 'Free admission could not be claimed.');
        return;
      }
      setFreeStreamId(claim.stream_id);
      toast.success(claim.already_claimed ? 'Your free pass is already active.' : 'Your free event pass is ready.');
    } finally {
      setFreeClaimBusy(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPayment) return;
    setPaymentError('');
    const emailCheck = emailSchema.safeParse(email);
    if (!emailCheck.success) {
      toast.error(emailCheck.error.errors[0].message);
      setStep('email');
      return;
    }
    setProcessing(true);
    try {
      if (screening.event_type === 'live') {
        const { data, error } = await supabase.functions.invoke('process-live-payment', {
          body: { screeningId: screening.id, ticketType: isReplay ? 'replay' : 'live', method: selectedPayment, currency: localCurrency ?? currency, countryCode: countryCode ?? undefined, email: emailCheck.data, cohortId: runtime.config?.cohortId },
        });
        if (error || !data?.success || typeof data.checkoutUrl !== 'string' || typeof data.reference !== 'string') {
          const message = data?.error || error?.message || 'Live event checkout could not be started. No charge was made.';
          setPaymentError(message); toast.error(message); return;
        }
        sessionStorage.setItem('degame_checkout_email', emailCheck.data);
        sessionStorage.setItem('degame_checkout_location', location);
        if (countryCode) sessionStorage.setItem('degame_checkout_country', countryCode);
        if (localCurrency) sessionStorage.setItem('degame_checkout_currency', localCurrency);
        window.location.assign(data.checkoutUrl);
        return;
      }
      const { data, error } = await supabase.functions.invoke('process-payment', { body: { method: selectedPayment, email: emailCheck.data, screeningId: screening.id, location, countryCode: countryCode ?? undefined, currency: localCurrency ?? currency, cohortId: runtime.config?.cohortId } });
      if (error || !data?.success || typeof data?.authorizationUrl !== 'string') {
        const message = data?.error || error?.message || 'Checkout could not be started. No charge was made.';
        setPaymentError(message); toast.error(message); return;
      }
      sessionStorage.setItem('degame_checkout_email', emailCheck.data);
      sessionStorage.setItem('degame_checkout_location', location);
      if (countryCode) sessionStorage.setItem('degame_checkout_country', countryCode);
      if (localCurrency) sessionStorage.setItem('degame_checkout_currency', localCurrency);
      window.location.assign(data.authorizationUrl);
    } catch { setPaymentError('Could not reach payment service. No charge was made.'); }
    finally { setProcessing(false); }
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

          {freeStreamId ? (
            <Card className="border-success/30">
              <CardContent className="p-6 text-center space-y-4">
                <Check className="mx-auto h-10 w-10 text-success" />
                <h2 className="text-xl font-bold">Your free pass is ready</h2>
                <p className="text-sm text-muted-foreground">Admission is attached to your account. No payment was collected.</p>
                <Button asChild className="w-full rounded-full"><Link to={`/live/watch/${freeStreamId}?mode=live`}>Open live event</Link></Button>
                <Button asChild variant="outline" className="w-full rounded-full"><Link to="/tickets">My Tickets</Link></Button>
              </CardContent>
            </Card>
          ) : null}

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
          {step === 'location' && !freeStreamId && isReplay && screening.replay_access_model === 'INCLUDED_WITH_TICKET' ? (
            <Card className="animate-fade-in border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Replay included with your live ticket</CardTitle>
                <CardDescription>If you purchased or claimed live admission, your replay entitlement is already attached to that ticket.</CardDescription>
              </CardHeader>
              <CardContent><Button asChild className="w-full rounded-full"><Link to="/tickets">Open My Tickets</Link></Button></CardContent>
            </Card>
          ) : step === 'location' && !freeStreamId && ((screening.event_type === 'live' && isReplay && screening.replay_access_model === 'FREE_REPLAY') || (screening.event_type === 'live' && !isReplay && screening.access_model === 'FREE')) ? (
            <Card className="animate-fade-in border-success/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Check className="h-4 w-4 text-success"/> Free admission</CardTitle>
                <CardDescription>{isReplay ? 'This replay is free. Claim one replay pass on your account.' : 'This event is free. Claim one live pass on your account.'} No payment details are required.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!user && <p className="text-sm text-muted-foreground">Sign in first to attach your pass to your account.</p>}
                <Button className="w-full rounded-full" disabled={!user || freeClaimBusy} onClick={handleFreeClaim}>
                  {freeClaimBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                  {freeClaimBusy ? 'Claiming pass…' : 'Claim free pass'}
                </Button>
              </CardContent>
            </Card>
          ) : step === 'location' && !freeStreamId && (
            <Card className="animate-fade-in border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4 text-primary" />
                  Where are you watching from?
                </CardTitle>
                <CardDescription className="text-xs">Your location determines ticket price</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="checkout-country">Your country or territory</Label>
                  <select id="checkout-country" className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={countryCode ?? ''} onChange={event => {
                    const selected = runtime.config?.countries.find(country => country.country_code === event.target.value);
                    if (!selected) return;
                    setCountryCode(selected.country_code);
                    setLocalCurrency(selected.currency_code);
                    setLocation(selected.country_code === 'NG' ? 'nigeria' : 'international');
                    setSelectedPayment(null);
                  }}>
                    <option value="">Choose your country</option>
                    {(runtime.config?.countries ?? []).map(country => <option key={country.country_code} value={country.country_code}>{String(country.metadata?.country_name || country.country_code)} · {country.currency_code}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground">Detected country and currency are preselected where available. You can change them before checkout.</p>
                </div>
                <div className="rounded-xl bg-secondary/40 border border-border/50 p-4 space-y-1">
                  <p className="text-xs text-muted-foreground">Regional ticket price</p>
                  <p className="text-xl font-bold">{currency} {basePrice.toLocaleString()}</p>
                  {localPriceLabel && <p className="text-sm text-muted-foreground">Estimated local price: {localPriceLabel}</p>}
                  {!localPriceLabel && localCurrency && localCurrency !== currency && <p className="text-xs text-muted-foreground">Live FX estimate is unavailable. Checkout will not charge in a converted currency without a verified FX rate.</p>}
                </div>
                {screening.refund_policy && (
                  <div className="rounded-xl bg-secondary/40 border border-border/50 p-3 text-[11px] text-muted-foreground">
                    <p className="font-medium text-foreground mb-1 text-xs">Refund Policy</p>
                    {screening.refund_policy}
                  </div>
                )}
                <Button className="w-full rounded-full mt-4 h-11" onClick={() => setStep('email')} disabled={!countryCode}>
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
                {paymentError && (
                  <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {paymentError}
                  </div>
                )}
                <div className="bg-secondary/30 p-3 rounded-xl space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Ticket</span><span>{symbol}{basePrice.toLocaleString()}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">{symbol}{total.toLocaleString()}</span></div>
                   {localConverted !== null && localCurrency && <p className="text-right text-xs text-muted-foreground">Approx. {new Intl.NumberFormat(undefined, { style: "currency", currency: localCurrency }).format(localConverted)} · display estimate only; charged in {currency}</p>}
                   {countryCode && <p className="text-right text-[11px] text-muted-foreground">Detected region: {countryCode}. You can change the ticket pricing region above.</p>}
                  <p className="text-xs text-muted-foreground">Final amount is calculated and validated by the payment server.</p>
                </div>

                {/* Methods */}
                <div className="space-y-2">
                  {eligiblePaymentMethods.length === 0 && <div role="status" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-muted-foreground">No payment method is enabled for this screening.</div>}
                  {eligiblePaymentMethods.map((m) => (
                    <button
                      key={m.id}
                      disabled={!m.available}
                      onClick={() => m.available && setSelectedPayment(m.id)}
                      className={`w-full p-3.5 border-2 rounded-xl transition-all flex items-center gap-3 ${
                        selectedPayment === m.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-xl">🔗</span>
                      <span className="flex-1 text-left text-sm font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">{m.mode === 'live' ? 'Live' : 'Test'}</span>
                      {selectedPayment === m.id && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2.5 pt-2">
                  <Button variant="outline" className="flex-1 rounded-full h-10" onClick={() => setStep('email')}>Back</Button>
                  <Button
                    className="flex-1 rounded-full h-10"
                    onClick={handlePayment}
                    disabled={!selectedPayment || processing || !paymentMethods.some(method => method.id === selectedPayment && method.available)}
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Pay {symbol}{total.toLocaleString()}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live payment confirmation */}
          {step === 'confirmation' && livePaid && (
            <Card className="animate-fade-in border-success/30">
              <CardContent className="p-6 sm:p-8 text-center space-y-4">
                <Check className="mx-auto h-10 w-10 text-success" />
                <h2 className="text-xl font-bold">You're in!</h2>
                <p className="text-sm text-muted-foreground">Payment is verified. Your live event ticket is attached to your account, or a secure claim link has been sent to your email if you checked out as a guest.</p>
                <Button asChild className="w-full rounded-full"><Link to="/tickets">Open My Tickets</Link></Button>
                <Button asChild variant="outline" className="w-full rounded-full"><Link to="/cinema">Browse screenings</Link></Button>
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
                  {confirmation.emailSent ? `A watch link was sent to ${email}.` : `Email delivery is not configured. Use the secure watch link below for ${email}.`}
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
