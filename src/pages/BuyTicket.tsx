import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Mail, Zap, DollarSign, Check } from 'lucide-react';

export default function BuyTicket() {
  const [step, setStep] = useState<'location' | 'email' | 'payment' | 'confirmation'>('location');
  const [location, setLocation] = useState<'nigeria' | 'international'>('nigeria');
  const [email, setEmail] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [addons, setAddons] = useState<{ name: string; price: number; selected: boolean }[]>([
    { name: 'Popcorn & Drink', price: 500, selected: false },
    { name: 'Premium Candy Pack', price: 300, selected: false },
  ]);

  const pricing = {
    nigeria: 5000,
    international: 15,
  };

  const basePrice = pricing[location];
  const addonsTotal = addons.filter(a => a.selected).reduce((sum, a) => sum + a.price, 0);
  const total = basePrice + addonsTotal;

  const paymentMethods = [
    { id: 'stripe', name: 'Credit/Debit Card', icon: '💳', available: true },
    { id: 'paystack', name: 'Paystack', icon: '🔗', available: true },
    { id: 'flutterwave', name: 'Flutterwave', icon: '⚡', available: true },
    { id: 'bank', name: 'Bank Transfer', icon: '🏦', available: true },
    { id: 'momo', name: 'Mobile Money', icon: '📱', available: true },
    { id: 'crypto', name: 'Crypto', icon: '₿', available: false },
  ];

  const handlePayment = () => {
    // Mock payment - would call edge function
    setStep('confirmation');
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Movie Header */}
          <div className="mb-8 text-center">
            <div className="aspect-video bg-secondary/30 rounded-lg mb-4 flex items-center justify-center">
              <img 
                src="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&h=450&fit=crop" 
                alt="Movie" 
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <h1 className="text-3xl font-bold mb-2">The Wedding Day</h1>
            <p className="text-muted-foreground">A Nollywood masterpiece | Release: Feb 14, 2025</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-between mb-8">
            {['location', 'email', 'payment', 'confirmation'].map((s, i) => (
              <div key={s} className="flex flex-col items-center flex-1">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step === s 
                      ? 'bg-primary text-primary-foreground scale-110' 
                      : ['location', 'email', 'payment'].includes(s) && ['location', 'email', 'payment', 'confirmation'].indexOf(s) < ['location', 'email', 'payment', 'confirmation'].indexOf(step)
                      ? 'bg-green-500 text-white'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {['location', 'email', 'payment', 'confirmation'].indexOf(s) < ['location', 'email', 'payment', 'confirmation'].indexOf(step) ? '✓' : i + 1}
                </div>
                <p className="text-xs mt-2 text-muted-foreground capitalize text-center">{s}</p>
              </div>
            ))}
          </div>

          {/* Step: Location Selection */}
          {step === 'location' && (
            <Card className="bg-card/50 border-border/50 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Where are you watching from?
                </CardTitle>
                <CardDescription>Your location determines the ticket price</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {Object.entries(pricing).map(([loc, price]) => (
                    <label key={loc} className="flex items-center p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary/20 transition">
                      <RadioGroup value={location} onValueChange={(val) => setLocation(val as 'nigeria' | 'international')}>
                        <RadioGroupItem value={loc} id={loc} />
                      </RadioGroup>
                      <Label htmlFor={loc} className="flex-1 ml-3 cursor-pointer">
                        <div className="font-medium capitalize">{loc}</div>
                        <div className="text-sm text-muted-foreground">
                          {loc === 'nigeria' ? '₦' : '$'}{price.toLocaleString()}
                        </div>
                      </Label>
                      <Badge variant={location === loc ? 'default' : 'secondary'}>
                        {location === loc ? 'Selected' : 'Available'}
                      </Badge>
                    </label>
                  ))}
                </div>
                <Button className="w-full mt-6" onClick={() => setStep('email')}>
                  Continue to Email
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step: Email Capture */}
          {step === 'email' && (
            <Card className="bg-card/50 border-border/50 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Where should we send your watch link?
                </CardTitle>
                <CardDescription>You'll get an instant "Watch Now" link after payment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email" className="mb-2 block">Email Address</Label>
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Your email won't be shared. We only use it to send your watch link.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep('location')}>
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={() => setStep('payment')}
                    disabled={!email.includes('@')}
                  >
                    Continue to Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Payment Method Selection */}
          {step === 'payment' && (
            <Card className="bg-card/50 border-border/50 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Choose Payment Method
                </CardTitle>
                <CardDescription>Fast, secure, and instant activation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add-ons */}
                <div className="bg-secondary/20 p-4 rounded-lg">
                  <h3 className="font-medium mb-3">Add Some Extras?</h3>
                  <div className="space-y-2">
                    {addons.map((addon, i) => (
                      <label key={i} className="flex items-center p-2 cursor-pointer hover:bg-secondary/20 rounded transition">
                        <input 
                          type="checkbox" 
                          checked={addon.selected}
                          onChange={() => {
                            const newAddons = [...addons];
                            newAddons[i].selected = !newAddons[i].selected;
                            setAddons(newAddons);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="ml-3 flex-1">{addon.name}</span>
                        <span className="text-sm font-medium">+₦{addon.price}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="bg-secondary/10 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ticket ({location})</span>
                    <span className="font-medium">₦{basePrice.toLocaleString()}</span>
                  </div>
                  {addonsTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Add-ons</span>
                      <span className="font-medium">+₦{addonsTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">₦{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPayment(method.id)}
                      disabled={!method.available}
                      className={`w-full p-4 border-2 rounded-lg transition flex items-center gap-3 ${
                        selectedPayment === method.id
                          ? 'border-primary bg-primary/10'
                          : method.available
                          ? 'border-border hover:border-primary/50'
                          : 'border-border opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-2xl">{method.icon}</span>
                      <span className="flex-1 text-left font-medium">{method.name}</span>
                      {!method.available && <Badge variant="secondary">Coming Soon</Badge>}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setStep('email')}>
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handlePayment}
                    disabled={!selectedPayment}
                  >
                    Pay ₦{total.toLocaleString()}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Confirmation */}
          {step === 'confirmation' && (
            <Card className="bg-card/50 border-border/50 mb-6 border-green-500/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Payment Successful! 🎉</h2>
                <p className="text-muted-foreground mb-6">
                  Check your email ({email}) for your "Watch Now" link. You can start watching immediately!
                </p>
                
                <div className="bg-secondary/20 p-4 rounded-lg mb-6 text-left">
                  <p className="text-sm font-medium mb-3">Order Details:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Movie:</span> <span>The Wedding Day</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Location:</span> <span className="capitalize">{location}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total:</span> <span className="font-bold">₦{total.toLocaleString()}</span></div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button className="w-full" size="lg">
                    Go to My Tickets
                  </Button>
                  <Button variant="outline" className="w-full">
                    Back to Home
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
